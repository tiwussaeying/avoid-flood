/**
 * 路线积水风险评估与避险途经点提取
 *
 * 纯几何 + 领域计算，无第三方依赖：
 *  - Haversine 点点距离
 *  - 点到折线段最短距离（等距圆柱近似投影）
 *  - 路线 -> 命中积水点 -> 车型通行性 -> 风险评级
 *  - IMPASSABLE 时提取绕行途经点
 */

import {
  evaluatePassability,
  PassabilityStatus,
  VehicleType,
} from "../domain/vehicle.js";
import {
  calculateFloodStatus,
  FloodEvent,
} from "../domain/floodEvent.js";

/** 经纬度坐标 [lat, lng] */
export type LatLng = [number, number];

const EARTH_RADIUS_M = 6_371_000;
const DEG2RAD = Math.PI / 180;

/** 命中积水的明细 */
export interface FloodHit {
  flood: FloodEvent;
  /** 路线到该积水点中心的最短距离（米） */
  distanceMeters: number;
  /** 该车型对此次积水的通行判定 */
  status: PassabilityStatus;
}

/** 路线整体风险等级 */
export type OverallRisk = "SAFE" | "WARNING" | "IMPASSABLE";

export interface RouteRiskResult {
  overallRisk: OverallRisk;
  hits: FloodHit[];
  /** 仅当 IMPASSABLE 时非空，供外部导航强制规避 */
  avoidanceWaypoints: LatLng[];
  /**
   * 起/终点本身处于积水区内。
   * 此时「全部路线阻断」是正确结果（目的地就在水里），
   * UI 应区别于「可绕行的途中积水」。
   */
  originFlooded: boolean;
  destinationFlooded: boolean;
}

/** Haversine 点点距离（米） */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * 点到折线段的最短距离（米）。
 *
 * 做法：以目标点为中心做局部等距圆柱投影（米制平面），
 * 将经纬度换算为小范围平面坐标后，用标准「点到线段」解析解求距离。
 * 对城市级（数十公里内）距离精度足够。
 */
export function pointToSegmentMeters(
  p: LatLng,
  a: LatLng,
  b: LatLng,
): number {
  // 局部米制投影：以 p 为原点
  const lat0 = p[0] * DEG2RAD;
  const mxPerDegLng = EARTH_RADIUS_M * Math.cos(lat0) * DEG2RAD;
  const mPerDegLat = EARTH_RADIUS_M * DEG2RAD;

  const toXY = (q: LatLng): [number, number] => [
    (q[1] - p[1]) * mxPerDegLng, // x = 东西向（米）
    (q[0] - p[0]) * mPerDegLat, // y = 南北向（米）
  ];

  const [ax, ay] = toXY(a);
  const [bx, by] = toXY(b);
  const [px, py] = [0, 0]; // p 在原点

  const dx = bx - ax;
  const dy = by - ay;
  const segLenSq = dx * dx + dy * dy;

  if (segLenSq === 0) {
    // 退化线段（起点=终点）
    return Math.hypot(px - ax, py - ay);
  }

  // 投影参数 t 并夹取到 [0,1]
  let t = ((px - ax) * dx + (py - ay) * dy) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** 点到整条折线的最短距离（米） */
export function pointToPolylineMeters(p: LatLng, polyline: LatLng[]): number {
  if (polyline.length === 0) return Number.POSITIVE_INFINITY;
  if (polyline.length === 1) return haversineMeters(p, polyline[0]);

  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentMeters(p, polyline[i], polyline[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

/**
 * 从路线折线中按「等间距采样」提取途经点坐标。
 * 用于从安全候选主干道生成绕行坐标点。
 */
export function extractWaypoints(
  polyline: LatLng[],
  intervalMeters: number,
): LatLng[] {
  if (polyline.length < 2 || intervalMeters <= 0) {
    return polyline.length ? [polyline[0]] : [];
  }

  const waypoints: LatLng[] = [polyline[0]];
  let acc = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    let from = polyline[i];
    const to = polyline[i + 1];
    let segRemaining = haversineMeters(from, to);

    // 沿当前线段按 interval 推进，可能在同一线段上产生多个点
    while (acc + segRemaining >= intervalMeters) {
      const need = intervalMeters - acc;
      const ratio = need / segRemaining;
      const nx = from[0] + (to[0] - from[0]) * ratio;
      const ny = from[1] + (to[1] - from[1]) * ratio;
      const wp: LatLng = [nx, ny];
      waypoints.push(wp);
      from = wp;
      segRemaining = haversineMeters(from, to);
      acc = 0;
    }
    acc += segRemaining;
  }

  return waypoints;
}

/**
 * 路线风险评估主函数。
 *
 * @param polyline 路线折线坐标数组 [lat,lng]
 * @param floods   候选积水事件
 * @param vehicle  车型
 * @param currentTime 当前时间（默认 now），用于时效衰减
 * @param detourCandidates 安全候选主干道折线（用于生成绕行途经点），可选
 */
export function evaluateRoute(
  polyline: LatLng[],
  floods: FloodEvent[],
  vehicle: VehicleType,
  currentTime: Date = new Date(),
  detourCandidates: LatLng[][] = [],
): RouteRiskResult {
  const hits: FloodHit[] = [];

  for (const flood of floods) {
    const status = calculateFloodStatus(flood, currentTime);
    if (!status.isActive) continue; // EXPIRED / CLEARED 一律忽略

    const center: LatLng = [flood.latitude, flood.longitude];
    const dist = pointToPolylineMeters(center, polyline);
    if (dist <= flood.radiusMeters) {
      hits.push({
        flood,
        distanceMeters: dist,
        status: evaluatePassability(vehicle, flood.waterDepthCm),
      });
    }
  }

  const blocked = hits.filter((h) => h.status === PassabilityStatus.BLOCKED);
  const caution = hits.filter((h) => h.status === PassabilityStatus.CAUTION);

  let overallRisk: OverallRisk = "SAFE";
  if (blocked.length > 0) {
    overallRisk = "IMPASSABLE";
  } else if (caution.length > 0) {
    overallRisk = "WARNING";
  }

  // 仅在 IMPASSABLE 时生成绕行途经点：从安全候选主干道提取 1~2 个点
  let avoidanceWaypoints: LatLng[] = [];
  if (overallRisk === "IMPASSABLE" && detourCandidates.length > 0) {
    avoidanceWaypoints = buildAvoidanceWaypoints(
      blocked,
      detourCandidates,
      Math.max(300, ...hits.map((h) => h.flood.radiusMeters * 2)),
    );
  }

  // 端点淹没判定：起/终点自身落入某个有效积水点的 buffer
  const originFlooded = isPointFlooded(polyline[0], floods, currentTime);
  const destinationFlooded = isPointFlooded(
    polyline[polyline.length - 1],
    floods,
    currentTime,
  );

  return {
    overallRisk,
    hits,
    avoidanceWaypoints,
    originFlooded,
    destinationFlooded,
  };
}

/** 判定单点是否落入任何有效积水点的影响半径内 */
function isPointFlooded(
  point: LatLng | undefined,
  floods: FloodEvent[],
  currentTime: Date,
): boolean {
  if (!point) return false;
  return floods.some((f) => {
    if (!calculateFloodStatus(f, currentTime).isActive) return false;
    return haversineMeters(point, [f.latitude, f.longitude]) <= f.radiusMeters;
  });
}

/**
 * 从路线上取「最后一个未被淹没的几何点」。
 *
 * 用途：全部路线均被判定 IMPASSABLE 时，仍需给用户一个
 * 可安全停靠的目标（积水路段前的最后一个安全点），
 * 避免 UI 出现「什么都不能做」的死路。
 *
 * @returns 安全停靠点；若起点即被淹，返回 null
 */
export function findLastSafePoint(
  polyline: LatLng[],
  floods: FloodEvent[],
  currentTime: Date,
): LatLng | null {
  if (polyline.length === 0) return null;

  // 从起点往终点扫描，记下最后一个安全点
  let lastSafe: LatLng | null = null;
  for (const pt of polyline) {
    if (isPointFlooded(pt, floods, currentTime)) break;
    lastSafe = pt;
  }
  return lastSafe;
}

/**
 * 生成绕行途经点：遍历安全候选主干道，挑出「距离所有阻断点都足够远」的路段，
 * 在其上按等间距采样，取 1~2 个关键点作为强制规避途经点。
 */
function buildAvoidanceWaypoints(
  blocked: FloodHit[],
  detourCandidates: LatLng[][],
  clearanceMeters: number,
): LatLng[] {
  const result: LatLng[] = [];

  for (const candidate of detourCandidates) {
    if (candidate.length < 2) continue;

    // 该候选路上是否存在「距所有阻断点均 > clearance」的安全段
    const safeAnchors = candidate.filter((pt) =>
      blocked.every(
        (b) =>
          haversineMeters(pt, [b.flood.latitude, b.flood.longitude]) >
          clearanceMeters + b.flood.radiusMeters,
      ),
    );

    if (safeAnchors.length === 0) continue;

    // 取该安全段的等间距采样（间隔=clearance）
    const sampled = extractWaypoints(safeAnchors, clearanceMeters);

    for (const wp of sampled) {
      // 剔除起终点附近的采样点：
      // 它们不是「中间绕行节点」，出现在 UI 上会与起点重复
      const endpoints = [candidate[0], candidate[candidate.length - 1]];
      const tooCloseToEndpoint = endpoints.some(
        (ep) => haversineMeters(wp, ep) < clearanceMeters / 2,
      );
      if (tooCloseToEndpoint) continue;

      result.push(wp);
      if (result.length >= 2) return result;
    }
  }

  return result.slice(0, 2);
}
