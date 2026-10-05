/**
 * routeGeneration.test.ts —— 动态路线生成的语义不变量
 *
 * 核心保障：起终点在安全区域时，系统必须能给出至少一条可通行路线；
 * 「全部阻断」只能出现在起终点本身被淹的情况下。
 */
import { describe, it, expect } from "vitest";
import { buildRoutes, buildDetourCandidates } from "../src/services/routeBuilder.js";
import { seedFloodsAlongRoute } from "../src/services/floodSeeder.js";
import { evaluateRoute } from "../src/engine/routeRiskEvaluator.js";
import { VehicleType } from "../src/domain/vehicle.js";
import { PLACES } from "../src/mock/places.js";

const NOW = new Date("2026-10-04T15:30:00Z");

/** 曼谷包围盒外的「安全区」测试点，用于隔离端点淹没因素 */
const SAFE_ORIGIN: [number, number] = [13.7462, 100.5347]; // Siam Paragon
const SAFE_DEST: [number, number] = [13.6663, 100.6550]; // Mega Bangna

describe("动态路线结构", () => {
  it("生成 3 条路线：主干道 + 2 条绕行，角色不重复", () => {
    const routes = buildRoutes(SAFE_ORIGIN, SAFE_DEST);
    expect(routes).toHaveLength(3);
    expect(routes.map((r) => r.kind).sort()).toEqual(["alt", "detour", "main"]);
    expect(routes.filter((r) => r.isDetour)).toHaveLength(2);
  });

  it("三条路线几何互不相同（距离/折线不重复）", () => {
    const routes = buildRoutes(SAFE_ORIGIN, SAFE_DEST);
    const distances = routes.map((r) => r.distanceKm.toFixed(3));
    // 绕行路线之间距离必须不同，否则 UI 上看起来像同一份数据
    expect(new Set(distances).size).toBeGreaterThanOrEqual(3);
  });

  it("绕行路线距离必然长于主干道", () => {
    const routes = buildRoutes(SAFE_ORIGIN, SAFE_DEST);
    const main = routes.find((r) => r.kind === "main")!;
    for (const r of routes.filter((x) => x.kind !== "main")) {
      expect(r.distanceKm).toBeGreaterThan(main.distanceKm);
    }
  });

  it("起终点重合时返回退化路线且不抛异常", () => {
    const routes = buildRoutes(SAFE_ORIGIN, SAFE_ORIGIN);
    expect(routes).toHaveLength(1);
    expect(routes[0].distanceKm).toBe(0);
    expect(routes[0].durationMin).toBe(0);
  });

  it("折线首尾精确等于起终点", () => {
    const routes = buildRoutes(SAFE_ORIGIN, SAFE_DEST);
    for (const r of routes) {
      expect(r.polyline[0]).toEqual(SAFE_ORIGIN);
      expect(r.polyline[r.polyline.length - 1]).toEqual(SAFE_DEST);
    }
  });
});

describe("安全路线的存在性（跨全部 POI 组合扫描）", () => {
  it("除起终点自身被淹外，必须存在至少一条可通行路线", () => {
    const violations: string[] = [];

    for (const a of PLACES) {
      for (const b of PLACES) {
        if (a.id === b.id) continue;

        const routes = buildRoutes(a.coords, b.coords);
        const corridor = routes.flatMap((r) => r.polyline);
        const floods = seedFloodsAlongRoute(corridor, { now: NOW });
        const cands = buildDetourCandidates(a.coords, b.coords);
        const results = routes.map((r) =>
          evaluateRoute(r.polyline, floods, VehicleType.SEDAN, NOW, cands),
        );

        const allBlocked = results.every((r) => r.overallRisk === "IMPASSABLE");
        const endpointFlooded = results.some(
          (r) => r.originFlooded || r.destinationFlooded,
        );

        if (allBlocked && !endpointFlooded) {
          violations.push(`${a.id} -> ${b.id}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

describe("车型切换对同一路线的影响", () => {
  it("同一积水深度下，车型越大风险越低（单调性）", () => {
    const routes = buildRoutes(SAFE_ORIGIN, [13.7245, 100.5785]);
    const corridor = routes.flatMap((r) => r.polyline);
    const floods = seedFloodsAlongRoute(corridor, { now: NOW });
    const cands = buildDetourCandidates(SAFE_ORIGIN, [13.7245, 100.5785]);

    const rank = { SAFE: 0, WARNING: 1, IMPASSABLE: 2 } as const;
    const main = routes[0];

    const moto = rank[evaluateRoute(main.polyline, floods, VehicleType.MOTORCYCLE, NOW, cands).overallRisk];
    const sedan = rank[evaluateRoute(main.polyline, floods, VehicleType.SEDAN, NOW, cands).overallRisk];
    const pickup = rank[evaluateRoute(main.polyline, floods, VehicleType.SUV_PICKUP, NOW, cands).overallRisk];
    const truck = rank[evaluateRoute(main.polyline, floods, VehicleType.TRUCK, NOW, cands).overallRisk];

    // 涉水能力越强，风险等级不应更高
    expect(moto).toBeGreaterThanOrEqual(sedan);
    expect(sedan).toBeGreaterThanOrEqual(pickup);
    expect(pickup).toBeGreaterThanOrEqual(truck);
  });
});
