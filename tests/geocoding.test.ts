/**
 * geocoding.test.ts —— 自由地址解析、动态积水布点、端点淹没判定
 */
import { describe, it, expect } from "vitest";
import { parseLatLngInput } from "../src/services/geocoding.js";
import {
  seedFloodsAlongRoute,
  mergeFloodEvents,
  BANGKOK_HOTSPOTS,
} from "../src/services/floodSeeder.js";
import { buildRoutes, buildDetourCandidates } from "../src/services/routeBuilder.js";
import { evaluateRoute, pointToPolylineMeters } from "../src/engine/routeRiskEvaluator.js";
import { VehicleType, PassabilityStatus, evaluatePassability } from "../src/domain/vehicle.js";
import { createFloodEvent } from "../src/domain/floodEvent.js";
import { isBangkokContext, BANGKOK_BOUNDS } from "../src/services/bangkokBounds.js";
import { PLACES } from "../src/mock/places.js";

const NOW = new Date("2026-10-04T15:30:00Z");

describe("1) 坐标直填解析 (parseLatLngInput)", () => {
  it("逗号分隔的合法坐标", () => {
    expect(parseLatLngInput("13.7462,100.5347")).toEqual([13.7462, 100.5347]);
  });

  it("空格分隔", () => {
    expect(parseLatLngInput("13.7462 100.5347")).toEqual([13.7462, 100.5347]);
  });

  it("带方向后缀", () => {
    expect(parseLatLngInput("13.7462N 100.5347E")).toEqual([13.7462, 100.5347]);
  });

  it("携带 ° 符号", () => {
    expect(parseLatLngInput("13.7462°, 100.5347°")).toEqual([13.7462, 100.5347]);
  });

  it("普通地名返回 null（不误判为坐标）", () => {
    expect(parseLatLngInput("Siam Paragon")).toBeNull();
    expect(parseLatLngInput("暹罗百丽宫")).toBeNull();
  });

  it("越界纬度被拒绝", () => {
    expect(parseLatLngInput("95.0,100.5")).toBeNull();
  });

  it("越界经度被拒绝", () => {
    expect(parseLatLngInput("13.7,200.5")).toBeNull();
  });

  it("单个数值被拒绝", () => {
    expect(parseLatLngInput("13.7462")).toBeNull();
  });
});

describe("2) 曼谷包围盒 (bangkokBounds)", () => {
  it("曼谷坐标命中", () => {
    expect(isBangkokContext(13.7462, 100.5347)).toBe(true);
  });

  it("清迈坐标不命中", () => {
    expect(isBangkokContext(18.7883, 98.9853)).toBe(false);
  });

  it("边界值闭区间", () => {
    expect(isBangkokContext(BANGKOK_BOUNDS.minLat, BANGKOK_BOUNDS.minLng)).toBe(true);
    expect(isBangkokContext(BANGKOK_BOUNDS.maxLat, BANGKOK_BOUNDS.maxLng)).toBe(true);
  });
});

describe("3) 沿路线走廊动态布点 (floodSeeder)", () => {
  it("布点均落在路线走廊的命中阈值内（400m）", () => {
    const routes = buildRoutes([13.7462, 100.5347], [13.7245, 100.5785]);
    const corridor = routes.flatMap((r) => r.polyline);
    const seeded = seedFloodsAlongRoute(corridor, { now: NOW });
    expect(seeded.length).toBeGreaterThan(0);
    for (const f of seeded) {
      const d = pointToPolylineMeters([f.latitude, f.longitude], corridor);
      expect(d).toBeLessThanOrEqual(400);
    }
  });

  it("布点均取自曼谷真实常淹黑点库（id 可追源）", () => {
    const routes = buildRoutes([13.7462, 100.5347], [13.7245, 100.5785]);
    const corridor = routes.flatMap((r) => r.polyline);
    const seeded = seedFloodsAlongRoute(corridor, { now: NOW });
    for (const f of seeded) {
      expect(BANGKOK_HOTSPOTS.some((h) => f.id === `seeded-${h.id}`)).toBe(true);
    }
  });

  it("空折线返回空数组（不抛异常）", () => {
    expect(seedFloodsAlongRoute([])).toEqual([]);
    expect(seedFloodsAlongRoute([[13.7, 100.5]])).toEqual([]);
  });

  it("maxCount 生效", () => {
    const routes = buildRoutes([13.7462, 100.5347], [13.7245, 100.5785]);
    const corridor = routes.flatMap((r) => r.polyline);
    const seeded = seedFloodsAlongRoute(corridor, { maxCount: 1, now: NOW });
    expect(seeded.length).toBeLessThanOrEqual(1);
  });

  it("severe 模式的深度不低于 hotspott 常态值", () => {
    const routes = buildRoutes([13.7462, 100.5347], [13.7245, 100.5785]);
    const corridor = routes.flatMap((r) => r.polyline);
    const seeded = seedFloodsAlongRoute(corridor, { severity: "severe", now: NOW });
    for (const f of seeded) {
      const hs = BANGKOK_HOTSPOTS.find((h) => f.id.includes(h.id));
      if (hs) expect(f.waterDepthCm).toBeGreaterThanOrEqual(hs.typicalDepthCm);
    }
  });

  it("布点时间均在过去且不超过 180 分钟（保证有效）", () => {
    const routes = buildRoutes([13.7462, 100.5347], [13.7245, 100.5785]);
    const corridor = routes.flatMap((r) => r.polyline);
    const seeded = seedFloodsAlongRoute(corridor, { now: NOW });
    for (const f of seeded) {
      const ageMin = (NOW.getTime() - f.reportedAt.getTime()) / 60000;
      expect(ageMin).toBeGreaterThan(0);
      expect(ageMin).toBeLessThan(180);
    }
  });

  it("mergeFloodEvents 按 id 去重且动态点覆盖静态点", () => {
    const a = createFloodEvent({ id: "x", latitude: 13.7, longitude: 100.5, waterDepthCm: 10, source: "BMA", reportedAt: NOW });
    const b = createFloodEvent({ id: "x", latitude: 13.7, longitude: 100.5, waterDepthCm: 50, source: "JS100", reportedAt: NOW });
    const merged = mergeFloodEvents([a], [b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].waterDepthCm).toBe(50);
  });
});

describe("4) 任意起终点都能产出可评估风险（不恒 SAFE）", () => {
  it("Siam -> Thong Lo：主干道命中积水，绕行路线安全", () => {
    const routes = buildRoutes([13.7462, 100.5347], [13.7245, 100.5785]);
    const corridor = routes.flatMap((r) => r.polyline);
    const floods = seedFloodsAlongRoute(corridor, { now: NOW });
    const cands = buildDetourCandidates([13.7462, 100.5347], [13.7245, 100.5785]);

    const results = routes.map((r) =>
      evaluateRoute(r.polyline, floods, VehicleType.SEDAN, NOW, cands),
    );
    // 至少有一条路线被判定有风险（说明布点确实落在走廊上）
    expect(results.some((r) => r.overallRisk !== "SAFE")).toBe(true);
  });

  it("长途跨城（Siam -> 素万那普机场）也应产出积水布点", () => {
    const routes = buildRoutes([13.7462, 100.5347], [13.69, 100.7501]);
    const corridor = routes.flatMap((r) => r.polyline);
    const floods = seedFloodsAlongRoute(corridor, { now: NOW });
    expect(floods.length).toBeGreaterThan(0);
  });
});

describe("5) 端点淹没判定 (originFlooded / destinationFlooded)", () => {
  it("起点落在积水缓冲区内 -> originFlooded = true", () => {
    const floods = [
      createFloodEvent({ id: "f1", latitude: 13.7462, longitude: 100.5347, waterDepthCm: 30, source: "JS100", reportedAt: NOW, radiusMeters: 200 }),
    ];
    const r = evaluateRoute([[13.7462, 100.5347], [13.72, 100.58]], floods, VehicleType.SEDAN, NOW);
    expect(r.originFlooded).toBe(true);
  });

  it("终点落在积水缓冲区内 -> destinationFlooded = true", () => {
    const floods = [
      createFloodEvent({ id: "f1", latitude: 13.7245, longitude: 100.5785, waterDepthCm: 30, source: "JS100", reportedAt: NOW, radiusMeters: 200 }),
    ];
    const r = evaluateRoute([[13.7462, 100.5347], [13.7245, 100.5785]], floods, VehicleType.SEDAN, NOW);
    expect(r.destinationFlooded).toBe(true);
  });

  it("两端均无积水 -> 两个标记均为 false", () => {
    const floods = [
      createFloodEvent({ id: "f1", latitude: 13.60, longitude: 100.90, waterDepthCm: 30, source: "JS100", reportedAt: NOW, radiusMeters: 100 }),
    ];
    const r = evaluateRoute([[13.7462, 100.5347], [13.7245, 100.5785]], floods, VehicleType.SEDAN, NOW);
    expect(r.originFlooded).toBe(false);
    expect(r.destinationFlooded).toBe(false);
  });

  it("已过期积水不影响端点判定", () => {
    const old = new Date(NOW.getTime() - 300 * 60_000);
    const floods = [
      createFloodEvent({ id: "f1", latitude: 13.7462, longitude: 100.5347, waterDepthCm: 30, source: "JS100", reportedAt: old, radiusMeters: 200 }),
    ];
    const r = evaluateRoute([[13.7462, 100.5347], [13.72, 100.58]], floods, VehicleType.SEDAN, NOW);
    expect(r.originFlooded).toBe(false);
  });
});

describe("6) 车型阈值在动态布点场景下的一致性", () => {
  it("Asok 布点（深度 > 20cm）对轿车阻断、对皮卡不阻断", () => {
    const depth = 36; // severe 模式: 28 + 8
    expect(evaluatePassability(VehicleType.SEDAN, depth)).toBe(PassabilityStatus.BLOCKED);
    expect(evaluatePassability(VehicleType.SUV_PICKUP, depth)).not.toBe(PassabilityStatus.BLOCKED);
  });

  it("本地 POI 库坐标全部落在曼谷包围盒内", () => {
    for (const p of PLACES) {
      expect(isBangkokContext(p.coords[0], p.coords[1])).toBe(true);
    }
  });
});
