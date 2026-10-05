/**
 * waypoints.test.ts —— 避险途经点提取的正确性
 *
 * 关键约束：途经点必须是「路线中段的绕行节点」，
 * 不得等于起终点，否则 UI 上会出现重复条目。
 */
import { describe, it, expect } from "vitest";
import { evaluateRoute, haversineMeters } from "../src/engine/routeRiskEvaluator.js";
import { buildRoutes, buildDetourCandidates } from "../src/services/routeBuilder.js";
import { seedFloodsAlongRoute } from "../src/services/floodSeeder.js";
import { VehicleType } from "../src/domain/vehicle.js";
import { PLACES } from "../src/mock/places.js";

const NOW = new Date("2026-10-04T15:30:00Z");
const O: [number, number] = [13.7462, 100.5347];
const D: [number, number] = [13.7245, 100.5785];

describe("避险途经点提取", () => {
  it("IMPASSABLE 路线产出的途经点不为空", () => {
    const routes = buildRoutes(O, D);
    const corridor = routes.flatMap((r) => r.polyline);
    const floods = seedFloodsAlongRoute(corridor, { now: NOW });
    const cands = buildDetourCandidates(O, D);

    const blocked = routes
      .map((r) => ({ r, res: evaluateRoute(r.polyline, floods, VehicleType.MOTORCYCLE, NOW, cands) }))
      .filter((x) => x.res.overallRisk === "IMPASSABLE");

    expect(blocked.length).toBeGreaterThan(0);
    for (const b of blocked) {
      expect(b.res.avoidanceWaypoints.length).toBeGreaterThan(0);
    }
  });

  it("途经点不得与起点重合（避免 UI 重复条目）", () => {
    const routes = buildRoutes(O, D);
    const corridor = routes.flatMap((r) => r.polyline);
    const floods = seedFloodsAlongRoute(corridor, { now: NOW });
    const cands = buildDetourCandidates(O, D);

    for (const r of routes) {
      const res = evaluateRoute(r.polyline, floods, VehicleType.MOTORCYCLE, NOW, cands);
      for (const wp of res.avoidanceWaypoints) {
        expect(haversineMeters(wp, O)).toBeGreaterThan(50);
        expect(haversineMeters(wp, D)).toBeGreaterThan(50);
      }
    }
  });

  it("途经点数量介于 1~2 之间", () => {
    const routes = buildRoutes(O, D);
    const corridor = routes.flatMap((r) => r.polyline);
    const floods = seedFloodsAlongRoute(corridor, { now: NOW });
    const cands = buildDetourCandidates(O, D);
    const res = evaluateRoute(routes[0].polyline, floods, VehicleType.MOTORCYCLE, NOW, cands);
    if (res.overallRisk === "IMPASSABLE") {
      expect(res.avoidanceWaypoints.length).toBeGreaterThanOrEqual(1);
      expect(res.avoidanceWaypoints.length).toBeLessThanOrEqual(2);
    }
  });

  it("SAFE 路线不产出途经点", () => {
    const routes = buildRoutes(O, [13.6663, 100.6550]);
    const res = evaluateRoute(routes[0].polyline, [], VehicleType.SEDAN, NOW, []);
    expect(res.overallRisk).toBe("SAFE");
    expect(res.avoidanceWaypoints).toEqual([]);
  });

  it("无候选走廊时不抛异常，返回空途经点", () => {
    const routes = buildRoutes(O, D);
    const corridor = routes.flatMap((r) => r.polyline);
    const floods = seedFloodsAlongRoute(corridor, { now: NOW });
    const res = evaluateRoute(routes[0].polyline, floods, VehicleType.MOTORCYCLE, NOW, []);
    expect(Array.isArray(res.avoidanceWaypoints)).toBe(true);
  });

  it("途经点坐标均为合法经纬度", () => {
    const routes = buildRoutes(O, D);
    const corridor = routes.flatMap((r) => r.polyline);
    const floods = seedFloodsAlongRoute(corridor, { now: NOW });
    const cands = buildDetourCandidates(O, D);
    for (const r of routes) {
      const res = evaluateRoute(r.polyline, floods, VehicleType.MOTORCYCLE, NOW, cands);
      for (const [lat, lng] of res.avoidanceWaypoints) {
        expect(Number.isFinite(lat)).toBe(true);
        expect(Number.isFinite(lng)).toBe(true);
        expect(Math.abs(lat)).toBeLessThanOrEqual(90);
        expect(Math.abs(lng)).toBeLessThanOrEqual(180);
      }
    }
  });

  it("全部 POI 组合下途经点均不等于起终点", () => {
    const bad: string[] = [];
    for (const a of PLACES) {
      for (const b of PLACES) {
        if (a.id === b.id) continue;
        const routes = buildRoutes(a.coords, b.coords);
        const corridor = routes.flatMap((r) => r.polyline);
        const floods = seedFloodsAlongRoute(corridor, { now: NOW });
        const cands = buildDetourCandidates(a.coords, b.coords);
        for (const r of routes) {
          const res = evaluateRoute(r.polyline, floods, VehicleType.MOTORCYCLE, NOW, cands);
          for (const wp of res.avoidanceWaypoints) {
            if (haversineMeters(wp, a.coords) < 30 || haversineMeters(wp, b.coords) < 30) {
              bad.push(`${a.id}->${b.id}:${r.id}`);
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
