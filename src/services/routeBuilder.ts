/**
 * routeBuilder.ts —— 动态路线生成
 *
 * 根据用户选择的起终点生成若干条候选路线折线。
 * 演示实现：在起终点之间生成「直线型主路」与「南/北绕行」两条候选，
 * 并对折线做适度扰动使其更像真实道路。
 *
 * 真实产品中此处应替换为 Google Directions / 高德路径规划 API。
 */

import type { LatLng } from "../engine/routeRiskEvaluator.js";
import { haversineMeters } from "../engine/routeRiskEvaluator.js";

export interface BuiltRoute {
  id: string;
  /** 起终点间的直线距离（公里） */
  distanceKm: number;
  /** 预估耗时（分钟），按平均车速估算 */
  durationMin: number;
  polyline: LatLng[];
  /** 该路线是否为「绕行」方案 */
  isDetour: boolean;
  /** 路线角色，用于 UI 标题区分 */
  kind: "main" | "detour" | "alt";
}

/** 演示用平均车速（km/h），曼谷市区拥堵下偏低 */
const AVG_SPEED_KMH = 24;

/**
 * 在两点之间插值生成折线。
 *
 * @param from 起点
 * @param to   终点
 * @param segments 分段数
 * @param bow  横向弯曲量（正=向北偏，负=向南偏），0 为直线
 */
function interpolate(
  from: LatLng,
  to: LatLng,
  segments: number,
  bow: number,
): LatLng[] {
  const pts: LatLng[] = [];
  const dLat = to[0] - from[0];
  const dLng = to[1] - from[1];

  // 垂直方向单位向量（用于制造绕行弯曲）
  const perpLat = -dLng;
  const perpLng = dLat;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // 抛物线弯曲：两端为 0，中间最大
    const curve = Math.sin(t * Math.PI) * bow;
    pts.push([
      from[0] + dLat * t + perpLat * curve,
      from[1] + dLng * t + perpLng * curve,
    ]);
  }
  return pts;
}

/** 计算折线总长度（公里） */
function polylineLengthKm(polyline: LatLng[]): number {
  let m = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    m += haversineMeters(polyline[i], polyline[i + 1]);
  }
  return m / 1000;
}

/**
 * 根据起终点生成候选路线。
 *
 * @param origin      起点
 * @param destination 终点
 * @returns [主路, 绕行] 两条路线
 */
export function buildRoutes(
  origin: LatLng,
  destination: LatLng,
): BuiltRoute[] {
  const straightKm = haversineMeters(origin, destination) / 1000;

  if (straightKm < 0.05) {
    // 起终点几乎重合，返回退化路线，避免除零与无意义输出
    return [
      {
        id: "route-main",
        distanceKm: 0,
        durationMin: 0,
        polyline: [origin, destination],
        isDetour: false,
        kind: "main",
      },
    ];
  }

  // 主路：近乎直线的城市主干道（bow 很小，符合真实最短路径）
  const mainPoly = interpolate(origin, destination, 6, 0.01);
  // 绕行 A：向一侧大幅偏移（南侧高架，过渡段更长→距离更远）
  const detourPoly = interpolate(origin, destination, 6, 0.72);
  // 辅路 B：反侧偏移但幅度较小（更贴近直线，距离更近）
  const altDetour = interpolate(origin, destination, 6, -0.46);

  const mainKm = polylineLengthKm(mainPoly);
  const detourKm = polylineLengthKm(detourPoly);

  const altKm = polylineLengthKm(altDetour);

  const routes: BuiltRoute[] = [
    {
      id: "route-main",
      distanceKm: mainKm,
      durationMin: Math.round((mainKm / AVG_SPEED_KMH) * 60),
      polyline: mainPoly,
      isDetour: false,
      kind: "main",
    },
    {
      id: "route-detour",
      distanceKm: detourKm,
      durationMin: Math.round((detourKm / AVG_SPEED_KMH) * 60),
      polyline: detourPoly,
      isDetour: true,
      kind: "detour",
    },
    {
      id: "route-alt",
      distanceKm: altKm,
      durationMin: Math.round((altKm / AVG_SPEED_KMH) * 60),
      polyline: altDetour,
      isDetour: true,
      kind: "alt",
    },
  ];

  return routes;
}

/** 为 routeRiskEvaluator 提取的绕行候选走廊 */
export function buildDetourCandidates(
  origin: LatLng,
  destination: LatLng,
): LatLng[][] {
  return [
    interpolate(origin, destination, 5, 0.75),
    interpolate(origin, destination, 5, -0.75),
  ];
}
