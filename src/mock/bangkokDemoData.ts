/**
 * bangkokDemoData.ts —— 曼谷雨季实景演示数据集
 *
 * 复刻典型曼谷暴雨积水场景（Siam -> Bangna 方向），
 * 用于在无真实数据接入前演示「避水路线规划」的完整效果。
 */

import { FloodEvent, createFloodEvent } from "../domain/floodEvent.js";
import { LatLng } from "../engine/routeRiskEvaluator.js";

export type LocalizedText = { th: string; en: string; zh: string };

export interface DemoRoute {
  id: string;
  name: LocalizedText;
  /** 副标题说明 */
  subtitle: LocalizedText;
  polyline: LatLng[];
  /** 预计耗时（分钟） */
  durationMin: number;
  /** 距离（公里） */
  distanceKm: number;
  /** 是否为系统推荐的避水路线 */
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
 * 积水点：
 *  - Asok 交叉口：28cm，JS100 来源，15 分钟前上报（Fresh）
 *  - Sukhumvit 71 巷口：18cm，BMA 来源，40 分钟前上报（Fresh）
 */
export const FLOOD_EVENTS: FloodEvent[] = [
  createFloodEvent({
    id: "asok-interchange",
    latitude: 13.7370,
    longitude: 100.5600,
    waterDepthCm: 28,
    source: "JS100",
    reportedAt: minutesAgo(15),
    radiusMeters: 40,
    clearedVotes: 0,
  }),
  createFloodEvent({
    id: "sukhumvit-71",
    latitude: 13.7290,
    longitude: 100.5690,
    waterDepthCm: 18,
    source: "BMA",
    reportedAt: minutesAgo(40),
    radiusMeters: 60,
    clearedVotes: 0,
  }),
];

/**
 * 路线 A：主干道，直接穿越 Asok 积水区（近但风险高）
 * 路线 B：绕行 Rama IV / 高架，避开 Asok（远但安全）
 */
export const DEMO_ROUTES: DemoRoute[] = [
  {
    id: "route-asok",
    name: { th: "ถนนหลัก (สุขุมวิท)", en: "Main road (Sukhumvit)", zh: "主干道 (Sukhumvit 直行)" },
    subtitle: { th: "เร็วสุด แต่ผ่านพื้นที่น้ำท่วมอโศก", en: "Fastest, but crosses Asok flooding", zh: "最快，但穿越 Asok 积水区" },
    durationMin: 24,
    distanceKm: 11.2,
    polyline: [
      [13.7462, 100.5347], // Siam Paragon
      [13.7435, 100.5450],
      [13.7405, 100.5520],
      [13.7370, 100.5600], // Asok 积水点（穿心而过）
      [13.7320, 100.5660],
      [13.7290, 100.5690], // Sukhumvit 71
      [13.7245, 100.5785], // Thong Lo BTS
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
      [13.7462, 100.5347], // Siam Paragon
      [13.7300, 100.5390], // 南下 Rama IV
      [13.7180, 100.5480],
      [13.7150, 100.5620], // 高架桥段（远离 Asok）
      [13.7200, 100.5720],
      [13.7245, 100.5785], // Thong Lo BTS
    ],
  },
];

/**
 * 安全候选主干道：用于在路线被判定 IMPASSABLE 时提取绕行途经点。
 * 这里给出一条明显远离 Asok / Sukhumvit 71 的南北向走廊。
 */
export const DETOUR_CANDIDATES: LatLng[][] = [
  [
    [13.7520, 100.5430],
    [13.7400, 100.5430],
    [13.7280, 100.5440],
    [13.7180, 100.5480],
  ],
  // 备用：更南侧的 Rama IV 走廊
  [
    [13.7300, 100.5390],
    [13.7180, 100.5480],
    [13.7120, 100.5600],
  ],
];



