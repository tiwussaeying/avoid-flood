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

  return { overallRisk, hits, avoidanceWaypoints };
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

    // 取该安全段的等间距采样（间隔=clearance），至少 1 个点，最多 2 个
    const sampled = extractWaypoints(safeAnchors, clearanceMeters);
    for (const wp of sampled) {
      result.push(wp);
      if (result.length >= 2) return result;
    }
  }

  return result.slice(0, 2);
}
