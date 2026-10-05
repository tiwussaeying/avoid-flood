/**
 * safeStop.test.ts —— 全阻断时的「最后安全停靠点」降级逻辑
 */
import { describe, it, expect } from "vitest";
import { findLastSafePoint } from "../src/engine/routeRiskEvaluator.js";
import { createFloodEvent } from "../src/domain/floodEvent.js";

const NOW = new Date("2026-10-04T15:30:00Z");

/** 一条自西向东的直线路线，每 0.01 度一个点 */
const LINE: [number, number][] = [
  [13.72, 100.50],
  [13.72, 100.52],
  [13.72, 100.54],
  [13.72, 100.56],
  [13.72, 100.58],
];

describe("findLastSafePoint", () => {
  it("路线末端被淹时，返回积水点之前的最后一个点", () => {
    const floods = [
      createFloodEvent({
        id: "f1",
        latitude: 13.72,
        longitude: 100.56,
        waterDepthCm: 40,
        source: "JS100",
        reportedAt: NOW,
        radiusMeters: 1500,
      }),
    ];
    const pt = findLastSafePoint(LINE, floods, NOW);
    expect(pt).not.toBeNull();
    // 100.54 是 100.56 之前的一个点
    expect(pt![1]).toBeCloseTo(100.54, 5);
  });

  it("起点即被淹时返回 null（无处可去）", () => {
    const floods = [
      createFloodEvent({
        id: "f1",
        latitude: 13.72,
        longitude: 100.50,
        waterDepthCm: 40,
        source: "JS100",
        reportedAt: NOW,
        radiusMeters: 500,
      }),
    ];
    expect(findLastSafePoint(LINE, floods, NOW)).toBeNull();
  });

  it("全程无积水时返回终点", () => {
    const pt = findLastSafePoint(LINE, [], NOW);
    expect(pt![1]).toBeCloseTo(100.58, 5);
  });

  it("过期积水不影响安全点判定", () => {
    const old = new Date(NOW.getTime() - 400 * 60_000);
    const floods = [
      createFloodEvent({
        id: "f1",
        latitude: 13.72,
        longitude: 100.56,
        waterDepthCm: 40,
        source: "JS100",
        reportedAt: old,
        radiusMeters: 1500,
      }),
    ];
    const pt = findLastSafePoint(LINE, floods, NOW);
    expect(pt![1]).toBeCloseTo(100.58, 5);
  });

  it("空折线返回 null", () => {
    expect(findLastSafePoint([], [], NOW)).toBeNull();
  });
});
