/**
 * bangkokDemoData.ts —— 曼谷雨季实景演示数据集
 *
 * 复刻典型曼谷暴雨积水场景，用于在无真实数据接入前演示「避水路线规划」。
 *
 * 数据布局原则（关键）：
 *   积水点必须落在「主干道」这一步生成的折线走廊上，否则动态起终点下
 *   永远不会命中，用户看不到避水效果。因此半径取 120~180m（真实城市级
 *   积水影响范围），而非早先 30~60m 的点状半径。
 */

import { FloodEvent, createFloodEvent } from "../domain/floodEvent.js";
import type { LatLng } from "../engine/routeRiskEvaluator.js";

export type LocalizedText = { th: string; en: string; zh: string };

export interface DemoRoute {
  id: string;
  name: LocalizedText;
  subtitle: LocalizedText;
  polyline: LatLng[];
  durationMin: number;
  distanceKm: number;
  isRecommended?: boolean;
}

/** 演示用「当前时间」基准：固定锚点，保证半衰期结果稳定可复现 */
export const DEMO_NOW = new Date("2026-10-04T15:30:00Z");

const minutesAgo = (n: number): Date =>
  new Date(DEMO_NOW.getTime() - n * 60_000);

/** 起点：Siam Paragon */
export const ORIGIN: LatLng = [13.7462, 100.5347];
/** 终点：Thong Lo BTS 附近 */
export const DESTINATION: LatLng = [13.7245, 100.5785];
export const ORIGIN_NAME = "Siam Paragon";
export const DESTINATION_NAME = "Thong Lo BTS";

/**
 * 积水点（曼谷真实常淹点，坐标为路口中心）：
 *  - Asok 交叉口：28cm，JS100，15 分钟前（Fresh）—— 主干道穿心而过
 *  - Sukhumvit 71 巷口：18cm，BMA，40 分钟前（Fresh）
 *  - Rama IV 路口：14cm，众包，70 分钟前（Aging，展示时间衰减）
 *
 * 半径 130~180m：覆盖整个路口，确保主干道路线与 buffer 相交。
 */
export const FLOOD_EVENTS: FloodEvent[] = [
  createFloodEvent({
    id: "asok-interchange",
    latitude: 13.7370,
    longitude: 100.5600,
    waterDepthCm: 28,
    source: "JS100",
    reportedAt: minutesAgo(15),
    radiusMeters: 160,
    clearedVotes: 0,
    confidence: 0.85,
    description: "แยกอโศก น้ำท่วมสูง รถเล็กผ่านไม่ได้",
  }),
  createFloodEvent({
    id: "sukhumvit-71",
    latitude: 13.7290,
    longitude: 100.5690,
    waterDepthCm: 18,
    source: "BMA",
    reportedAt: minutesAgo(40),
    radiusMeters: 130,
    clearedVotes: 0,
    confidence: 0.9,
    description: "สุขุมวิท 71 ระบายน้ำช้า",
  }),
  createFloodEvent({
    id: "rama4-junction",
    latitude: 13.7180,
    longitude: 100.5480,
    waterDepthCm: 14,
    source: "CROWD",
    reportedAt: minutesAgo(70),
    radiusMeters: 100,
    clearedVotes: 0,
    confidence: 0.6,
    description: "แยกรามคำแหง น้ำขังเล็กน้อย",
  }),
];

/** 路线 A：主干道，直接穿越 Asok 积水区（近但风险高） */
export const DEMO_ROUTES: DemoRoute[] = [
  {
    id: "route-asok",
    name: { th: "ถนนหลัก (สุขุมวิท)", en: "Main road (Sukhumvit)", zh: "主干道 (Sukhumvit 直行)" },
    subtitle: { th: "เร็วสุด แต่ผ่านพื้นที่น้ำท่วมอโศก", en: "Fastest, but crosses Asok flooding", zh: "最快，但穿越 Asok 积水区" },
    durationMin: 24,
    distanceKm: 11.2,
    polyline: [
      [13.7462, 100.5347],
      [13.7435, 100.5450],
      [13.7405, 100.5520],
      [13.7370, 100.5600],
      [13.7320, 100.5660],
      [13.7290, 100.5690],
      [13.7245, 100.5785],
    ],
  },
  {
    id: "route-rama4",
    name: { th: "อ้อมพระราม 4 ทางด่วน", en: "Rama IV / expressway detour", zh: "绕行 Rama IV 高架" },
    subtitle: { th: "หลบน้ำท่วม แนะนำ", en: "Avoids flooding, recommended", zh: "主动避开积水，系统推荐" },
    durationMin: 31,
    distanceKm: 14.8,
    isRecommended: true,
    polyline: [
      [13.7462, 100.5347],
      [13.7300, 100.5390],
      [13.7180, 100.5480],
      [13.7150, 100.5620],
      [13.7200, 100.5720],
      [13.7245, 100.5785],
    ],
  },
];

/** 安全候选主干道：IMPASSABLE 时用于提取绕行途经点 */
export const DETOUR_CANDIDATES: LatLng[][] = [
  [
    [13.7520, 100.5430],
    [13.7400, 100.5430],
    [13.7280, 100.5440],
    [13.7180, 100.5480],
  ],
  [
    [13.7300, 100.5390],
    [13.7180, 100.5480],
    [13.7120, 100.5600],
  ],
];
