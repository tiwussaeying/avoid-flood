/**
 * floodSeeder.ts —— 沿路线走廊动态布设「拟真积水点」
 *
 * 背景：演示环境的积水数据是有限条固定坐标；用户输入任意起终点时，
 * 路线走廊可能完全不经过这些坐标，导致永远 SAFE、避水功能看起来失效。
 *
 * 方案：以「曼谷真实常淹路口库」为知识源，取靠近本次路线走廊的真实
 * 淹水黑点动态生成积水事件。这样既保持坐标真实（不是凭空捏造），
 * 又保证任意起终点都能看到有意义的避水对比。
 *
 * 真实产品替换点：此处改为调用 BMA / JS100 / 气象局洪水 API。
 */

import { createFloodEvent, type FloodEvent, type FloodSource } from "../domain/floodEvent.js";
import type { LatLng } from "../engine/routeRiskEvaluator.js";
import { haversineMeters, pointToPolylineMeters } from "../engine/routeRiskEvaluator.js";

/** 曼谷知名常淹黑点（路口级坐标，来自历年雨季通报） */
interface FloodHotspot {
  id: string;
  name: string;
  coords: LatLng;
  /** 该点常见积水深度（cm）——暴雨场景取值 */
  typicalDepthCm: number;
  source: FloodSource;
  description: string;
}

export const BANGKOK_HOTSPOTS: FloodHotspot[] = [
  { id: "hs-asok", name: "แยกอโศก / Asok", coords: [13.7370, 100.5600], typicalDepthCm: 28, source: "JS100", description: "แยกอโศก น้ำท่วมสูง รถเล็กผ่านไม่ได้" },
  { id: "hs-sukhumvit-71", name: "สุขุมวิท 71 / Sukhumvit 71", coords: [13.7290, 100.5690], typicalDepthCm: 18, source: "BMA", description: "สุขุมวิท 71 ระบายน้ำช้า" },
  { id: "hs-rama4", name: "แยกรามคำแหง / Rama IV", coords: [13.7180, 100.5480], typicalDepthCm: 14, source: "CROWD", description: "แยกรามคำแหง น้ำขังเล็กน้อย" },
  { id: "hs-ladprao", name: "แยกลาดพร้าว / Lat Phrao", coords: [13.8160, 100.5610], typicalDepthCm: 32, source: "JS100", description: "แยกลาดพร้าว ท่วมสูง มอเตอร์ไซค์ผ่านไม่ได้" },
  { id: "hs-din-daeng", name: "ดินแดง / Din Daeng", coords: [13.7690, 100.5520], typicalDepthCm: 40, source: "BMA", description: "ดินแดง น้ำท่วมสูงมาก" },
  { id: "hs-vibhavadi", name: "วิภาวดี / Vibhavadi", coords: [13.7890, 100.5560], typicalDepthCm: 25, source: "JS100", description: "วิภาวดีรังสิต น้ำท่วมขัง" },
  { id: "hs-ratchada", name: "รัชดาภิเษก / Ratchada", coords: [13.7700, 100.5740], typicalDepthCm: 22, source: "CROWD", description: "รัชดาภิเษก น้ำขัง" },
  { id: "hs-bangna", name: "บางนา / Bangna", coords: [13.6680, 100.6050], typicalDepthCm: 30, source: "JS100", description: "บางนา-ตราด น้ำท่วมสูง" },
  { id: "hs-udomsuk", name: "อุดมสุข / Udomsuk", coords: [13.6790, 100.6100], typicalDepthCm: 24, source: "BMA", description: "อุดมสุข น้ำท่วมขัง" },
  { id: "hs-ongnut", name: "อ่อนนุช / On Nut", coords: [13.7055, 100.6010], typicalDepthCm: 26, source: "CROWD", description: "อ่อนนุช น้ำขังรถเล็กผ่านลำบาก" },
  { id: "hs-phrakhanong", name: "พระโขนง / Phra Khanong", coords: [13.7150, 100.5920], typicalDepthCm: 20, source: "JS100", description: "พระโขนง น้ำท่วมขัง" },
  { id: "hs-eakkamai", name: "เอกมัย / Ekkamai", coords: [13.7190, 100.5850], typicalDepthCm: 16, source: "CROWD", description: "เอกมัย น้ำขังเล็กน้อย" },
  { id: "hs-ari", name: "อารีย์ / Ari", coords: [13.7790, 100.5450], typicalDepthCm: 21, source: "BMA", description: "อารีย์ น้ำท่วมขัง" },
  { id: "hs-saphan-kwai", name: "สะพานควาย / Saphan Khwai", coords: [13.7920, 100.5500], typicalDepthCm: 27, source: "JS100", description: "สะพานควาย น้ำท่วมขัง" },
  { id: "hs-victory", name: "อนุสาวรีย์ชัยฯ / Victory Monument", coords: [13.7640, 100.5380], typicalDepthCm: 19, source: "BMA", description: "อนุสาวรีย์ชัย น้ำขัง" },
  { id: "hs-silom", name: "สีลม / Silom", coords: [13.7290, 100.5340], typicalDepthCm: 23, source: "CROWD", description: "สีลม น้ำท่วมขัง" },
  { id: "hs-sathorn", name: "สาทร / Sathorn", coords: [13.7200, 100.5290], typicalDepthCm: 29, source: "JS100", description: "สาทร น้ำท่วมสูง" },
  { id: "hs-ratchaprarop", name: "ราชปรารภ / Ratchaprarop", coords: [13.7540, 100.5420], typicalDepthCm: 30, source: "BMA", description: "ราชปรารภ น้ำท่วมสูง" },
  { id: "hs-phetchaburi", name: "เพชรบุรีตัดใหม่ / Petchaburi", coords: [13.7480, 100.5620], typicalDepthCm: 26, source: "JS100", description: "เพชรบุรีตัดใหม่ น้ำท่วมขัง" },
  { id: "hs-pratunam", name: "ประตูน้ำ / Pratunam", coords: [13.7490, 100.5400], typicalDepthCm: 34, source: "CROWD", description: "ประตูน้ำ น้ำท่วมสูง" },
];

/** 判定为「命中路线走廊」的横向距离阈值（米） */
const CORRIDOR_HIT_METERS = 400;

/** 动态布点的时间新鲜度（分钟），模拟刚收到的暴雨通报 */
const FRESH_OFFSETS_MIN = [8, 22, 35, 54];

export interface SeedOptions {
  /** 期望最多布设几个积水点 */
  maxCount?: number;
  /** 严重程度：'severe' 模拟暴雨，全部用高水位；'normal' 用常态值 */
  severity?: "normal" | "severe";
  /** 基准时间（默认 now） */
  now?: Date;
}

/**
 * 沿路线走廊生成拟真积水事件。
 *
 * 算法：取所有黑点中「到路线折线距离 <= CORRIDOR_HIT_METERS」的点，
 * 按距离升序（越靠近路线越优先），取前 maxCount 个。
 *
 * @param polyline 路线折线
 * @param options  配置
 */
export function seedFloodsAlongRoute(
  polyline: LatLng[],
  options: SeedOptions = {},
): FloodEvent[] {
  if (polyline.length < 2) return [];

  const { maxCount = 2, severity = "severe", now = new Date() } = options;

  const scored = BANGKOK_HOTSPOTS.map((hs) => ({
    hs,
    dist: pointToPolylineMeters(hs.coords, polyline),
  }))
    .filter((x) => x.dist <= CORRIDOR_HIT_METERS)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, maxCount);

  return scored.map((x, i) => {
    // 暴雨场景：在黑点常态水深基础上加溢流增量，制造阻断级水位
    const depth =
      severity === "severe"
        ? Math.min(60, x.hs.typicalDepthCm + 8)
        : x.hs.typicalDepthCm;

    const reportedAt = new Date(
      now.getTime() - FRESH_OFFSETS_MIN[i % FRESH_OFFSETS_MIN.length] * 60_000,
    );

    return createFloodEvent({
      id: `seeded-${x.hs.id}`,
      latitude: x.hs.coords[0],
      longitude: x.hs.coords[1],
      waterDepthCm: depth,
      source: x.hs.source,
      reportedAt,
      radiusMeters: 110,
      clearedVotes: 0,
      confidence: 0.8,
      description: x.hs.description,
    });
  });
}

/**
 * 把动态布点与固定演示数据合并，动态点优先（去重按 id）。
 */
export function mergeFloodEvents(
  base: FloodEvent[],
  seeded: FloodEvent[],
): FloodEvent[] {
  const byId = new Map<string, FloodEvent>();
  for (const f of base) byId.set(f.id, f);
  for (const f of seeded) byId.set(f.id, f);
  return [...byId.values()];
}

/** 判断路线上是否存在阻断级积水（供 UI 决定是否提示"建议绕行"） */
export function hasBlockingFloodOnRoute(
  polyline: LatLng[],
  floods: FloodEvent[],
  vehicleDepthLimitCm: number,
): boolean {
  return floods.some(
    (f) =>
      pointToPolylineMeters([f.latitude, f.longitude], polyline) <=
        f.radiusMeters && f.waterDepthCm >= vehicleDepthLimitCm,
  );
}

export { haversineMeters };
