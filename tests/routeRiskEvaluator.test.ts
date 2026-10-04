import { describe, it, expect } from "vitest";
import {
  VehicleType,
  PassabilityStatus,
  evaluatePassability,
} from "../src/domain/vehicle.js";
import {
  FloodEvent,
  FloodValidity,
  calculateFloodStatus,
  createFloodEvent,
} from "../src/domain/floodEvent.js";
import {
  evaluateRoute,
  haversineMeters,
  pointToSegmentMeters,
  pointToPolylineMeters,
  LatLng,
} from "../src/engine/routeRiskEvaluator.js";

const MIN = 60_000;
const NOW = new Date("2026-10-04T12:00:00Z");

function floodAt(
  lat: number,
  lng: number,
  waterDepthCm: number,
  opts: Partial<FloodEvent> = {},
): FloodEvent {
  return createFloodEvent({
    id: opts.id ?? `f-${lat}-${lng}`,
    latitude: lat,
    longitude: lng,
    waterDepthCm,
    source: opts.source ?? "CROWD",
    reportedAt: opts.reportedAt ?? NOW,
    radiusMeters: opts.radiusMeters ?? 30,
    clearedVotes: opts.clearedVotes ?? 0,
  });
}

describe("1) 车型涉水评估 (vehicle)", () => {
  // 用户指定的验收用例（原文）
  it("水深 25cm：轿车 BLOCKED，而皮卡/SUV CAUTION", () => {
    expect(evaluatePassability(VehicleType.SEDAN, 25)).toBe(
      PassabilityStatus.BLOCKED,
    );
    expect(evaluatePassability(VehicleType.SUV_PICKUP, 25)).toBe(
      PassabilityStatus.CAUTION,
    );
  });

  it("边界：<= 阈值一半为 PASSABLE", () => {
    expect(evaluatePassability(VehicleType.MOTORCYCLE, 5)).toBe(
      PassabilityStatus.PASSABLE,
    );
    expect(evaluatePassability(VehicleType.SEDAN, 10)).toBe(
      PassabilityStatus.PASSABLE,
    );
    expect(evaluatePassability(VehicleType.SUV_PICKUP, 20)).toBe(
      PassabilityStatus.PASSABLE,
    );
  });

  it("边界：等于阈值为 CAUTION，超过阈值为 BLOCKED", () => {
    expect(evaluatePassability(VehicleType.SEDAN, 20)).toBe(
      PassabilityStatus.CAUTION,
    );
    expect(evaluatePassability(VehicleType.SEDAN, 20.1)).toBe(
      PassabilityStatus.BLOCKED,
    );
    expect(evaluatePassability(VehicleType.TRUCK, 60)).toBe(
      PassabilityStatus.CAUTION,
    );
    expect(evaluatePassability(VehicleType.TRUCK, 61)).toBe(
      PassabilityStatus.BLOCKED,
    );
  });

  it("摩托车：5cm 安全，6cm 谨慎，11cm 阻断", () => {
    expect(evaluatePassability(VehicleType.MOTORCYCLE, 5)).toBe(
      PassabilityStatus.PASSABLE,
    );
    expect(evaluatePassability(VehicleType.MOTORCYCLE, 6)).toBe(
      PassabilityStatus.CAUTION,
    );
    expect(evaluatePassability(VehicleType.MOTORCYCLE, 11)).toBe(
      PassabilityStatus.BLOCKED,
    );
  });

  it("非法水深抛出 RangeError", () => {
    expect(() => evaluatePassability(VehicleType.SEDAN, -1)).toThrow(RangeError);
  });
});

describe("2) 积水半衰期与反向解除 (floodEvent)", () => {
  it("0~60 分钟：FRESH，置信度 1.0", () => {
    const e = floodAt(13.75, 100.5, 30, { reportedAt: new Date(NOW.getTime() - 30 * MIN) });
    const s = calculateFloodStatus(e, NOW);
    expect(s.validity).toBe(FloodValidity.FRESH);
    expect(s.confidence).toBeCloseTo(1.0);
    expect(s.isActive).toBe(true);
  });

  it("60~120 分钟：AGING，置信度 0.7", () => {
    const e = floodAt(13.75, 100.5, 30, { reportedAt: new Date(NOW.getTime() - 90 * MIN) });
    const s = calculateFloodStatus(e, NOW);
    expect(s.validity).toBe(FloodValidity.AGING);
    expect(s.confidence).toBeCloseTo(0.7);
    expect(s.isActive).toBe(true);
  });

  it("120~180 分钟：STALE，置信度 0.3", () => {
    const e = floodAt(13.75, 100.5, 30, { reportedAt: new Date(NOW.getTime() - 150 * MIN) });
    const s = calculateFloodStatus(e, NOW);
    expect(s.validity).toBe(FloodValidity.STALE);
    expect(s.confidence).toBeCloseTo(0.3);
    expect(s.isActive).toBe(true);
  });

  it("超过 180 分钟：EXPIRED，不再有效", () => {
    const e = floodAt(13.75, 100.5, 30, { reportedAt: new Date(NOW.getTime() - 181 * MIN) });
    const s = calculateFloodStatus(e, NOW);
    expect(s.validity).toBe(FloodValidity.EXPIRED);
    expect(s.confidence).toBe(0);
    expect(s.isActive).toBe(false);
  });

  it("反向解除：clearedVotes>=2 直接 CLEARED，优先于时间", () => {
    const e = floodAt(13.75, 100.5, 80, { clearedVotes: 2, reportedAt: NOW });
    const s = calculateFloodStatus(e, NOW);
    expect(s.validity).toBe(FloodValidity.CLEARED);
    expect(s.isActive).toBe(false);
  });
});

describe("3) 几何距离算法 (geometry)", () => {
  it("Haversine：曼谷两点距离量级正确", () => {
    const d = haversineMeters([13.7563, 100.5018], [13.7572, 100.5018]);
    expect(d).toBeGreaterThan(90);
    expect(d).toBeLessThan(110);
  });

  it("点到线段：垂足落在段内", () => {
    const d = pointToSegmentMeters([13.7572, 100.5018], [13.7563, 100.5], [
      13.7563,
      100.5036,
    ]);
    expect(d).toBeGreaterThan(90);
    expect(d).toBeLessThan(110);
  });

  it("点到线段：垂足落在端点外时取端点距离", () => {
    const d = pointToSegmentMeters([13.76, 100.5], [13.7563, 100.5], [
      13.7563,
      100.5036,
    ]);
    expect(d).toBeGreaterThan(0);
  });

  it("点到折线：取所有线段的最小值", () => {
    const polyline: LatLng[] = [
      [13.7563, 100.5],
      [13.7563, 100.5036],
      [13.7580, 100.5036],
    ];
    const d = pointToPolylineMeters([13.7563, 100.5018], polyline);
    expect(d).toBeLessThan(5);
  });
});

describe("4) 路线风险评估与避险途经点 (evaluateRoute)", () => {
  // 一条沿经度方向、穿城的路线
  const route: LatLng[] = [
    [13.7563, 100.5],
    [13.7563, 100.5036],
    [13.7563, 100.5072],
  ];

  it("无积水 -> SAFE", () => {
    const res = evaluateRoute(route, [], VehicleType.SEDAN, NOW);
    expect(res.overallRisk).toBe("SAFE");
    expect(res.hits).toHaveLength(0);
    expect(res.avoidanceWaypoints).toHaveLength(0);
  });

  it("浅积水(12cm)对轿车 -> WARNING（CAUTION）", () => {
    const floods = [floodAt(13.7563, 100.5018, 12, { id: "shallow" })];
    const res = evaluateRoute(route, floods, VehicleType.SEDAN, NOW);
    expect(res.overallRisk).toBe("WARNING");
    expect(res.hits).toHaveLength(1);
    expect(res.hits[0].status).toBe(PassabilityStatus.CAUTION);
  });

  it("深积水(50cm)对轿车 -> IMPASSABLE 且输出绕行途经点", () => {
    const floods = [floodAt(13.7563, 100.5018, 50, { id: "deep", radiusMeters: 30 })];
    const detour: LatLng[] = [
      [13.7380, 100.4990],
      [13.7380, 100.5030],
      [13.7380, 100.5070],
    ];
    const res = evaluateRoute(route, floods, VehicleType.SEDAN, NOW, [detour]);
    expect(res.overallRisk).toBe("IMPASSABLE");
    expect(res.hits[0].status).toBe(PassabilityStatus.BLOCKED);
    expect(res.avoidanceWaypoints.length).toBeGreaterThanOrEqual(1);
    expect(res.avoidanceWaypoints.length).toBeLessThanOrEqual(2);
    for (const wp of res.avoidanceWaypoints) {
      expect(haversineMeters(wp, [13.7563, 100.5018])).toBeGreaterThan(30);
    }
  });

  it("超过 3 小时(181min)的积水点被忽略 -> SAFE", () => {
    const floods = [
      floodAt(13.7563, 100.5018, 90, {
        id: "old",
        reportedAt: new Date(NOW.getTime() - 181 * MIN),
      }),
    ];
    const res = evaluateRoute(route, floods, VehicleType.SEDAN, NOW);
    expect(res.overallRisk).toBe("SAFE");
    expect(res.hits).toHaveLength(0);
  });

  it("同一处 30cm 积水：皮卡 CAUTION->WARNING，卡车 PASSABLE->SAFE", () => {
    const floods = [floodAt(13.7563, 100.5018, 30, { id: "mid" })];
    const pickup = evaluateRoute(route, floods, VehicleType.SUV_PICKUP, NOW);
    expect(pickup.overallRisk).toBe("WARNING");

    const truck = evaluateRoute(route, floods, VehicleType.TRUCK, NOW);
    expect(truck.overallRisk).toBe("SAFE");
  });

  it("已解除的积水(clearedVotes=2)不参与风险评估", () => {
    const floods = [
      floodAt(13.7563, 100.5018, 90, { id: "cleared", clearedVotes: 2 }),
    ];
    const res = evaluateRoute(route, floods, VehicleType.SEDAN, NOW);
    expect(res.overallRisk).toBe("SAFE");
  });
});
