/**
 * placeSearch.test.ts —— 地点搜索与动态路线生成测试
 */
import { describe, it, expect } from "vitest";
import { searchPlaces, findPlaceById } from "../src/services/placeSearch.js";
import { buildRoutes, buildDetourCandidates } from "../src/services/routeBuilder.js";
import { PLACES } from "../src/mock/places.js";
import { haversineMeters } from "../src/engine/routeRiskEvaluator.js";

describe("1) 地点搜索 (placeSearch)", () => {
  it("英文关键词匹配", () => {
    const r = searchPlaces("siam", "en");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((x) => x.place.id === "siam-paragon")).toBe(true);
  });

  it("中文关键词匹配", () => {
    const r = searchPlaces("暹罗", "zh");
    expect(r.some((x) => x.place.id === "siam-paragon")).toBe(true);
  });

  it("泰文关键词匹配", () => {
    const r = searchPlaces("อโศก", "th");
    expect(r.some((x) => x.place.id === "bts-asok")).toBe(true);
  });

  it("大小写不敏感", () => {
    const a = searchPlaces("BTS", "en").map((x) => x.place.id).sort();
    const b = searchPlaces("bts", "en").map((x) => x.place.id).sort();
    expect(a).toEqual(b);
  });

  it("返回的 label 使用指定语言", () => {
    // 用泰文名检索，验证返回 label 随语言变化
    const zh = searchPlaces("สยามพารากอน", "zh");
    expect(zh.length).toBeGreaterThan(0);
    expect(zh[0].label).toBe("暹罗百丽宫");
    const th = searchPlaces("สยามพารากอน", "th");
    expect(th[0].label).toBe("สยามพารากอน");
    const en = searchPlaces("สยามพารากอน", "en");
    expect(en[0].label).toBe("Siam Paragon");
  });

  it("提供参考点时按距离升序排序", () => {
    // 以 Asok 为参考点，最近的应该是 Asok 本身或其附近
    const origin: [number, number] = [13.7370, 100.5600];
    const r = searchPlaces("bts", "en", origin);
    expect(r.length).toBeGreaterThan(1);
    const d0 = r[0].distanceMeters!;
    const d1 = r[1].distanceMeters!;
    expect(d0).toBeLessThanOrEqual(d1);
  });

  it("空查询返回热门地点（数量受限）", () => {
    const r = searchPlaces("", "en", undefined, 6);
    expect(r).toHaveLength(6);
  });

  it("limit 生效", () => {
    const r = searchPlaces("b", "en", undefined, 3);
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it("无匹配返回空数组", () => {
    expect(searchPlaces("zzzz-not-exist", "en")).toHaveLength(0);
  });

  it("findPlaceById 能按 id 取回", () => {
    expect(findPlaceById("mega-bangna")?.nameEn).toBe("Mega Bangna");
    expect(findPlaceById("nope")).toBeUndefined();
  });
});

describe("2) 动态路线生成 (routeBuilder)", () => {
  const origin: [number, number] = [13.7462, 100.5347];
  const dest: [number, number] = [13.7245, 100.5785];

  it("生成至少 2 条候选路线", () => {
    const routes = buildRoutes(origin, dest);
    expect(routes.length).toBeGreaterThanOrEqual(2);
  });

  it("每条路线含首尾坐标，且首尾等于起终点", () => {
    for (const r of buildRoutes(origin, dest)) {
      expect(r.polyline.length).toBeGreaterThanOrEqual(2);
      const first = r.polyline[0];
      const last = r.polyline[r.polyline.length - 1];
      expect(haversineMeters(first, origin)).toBeLessThan(1);
      expect(haversineMeters(last, dest)).toBeLessThan(1);
    }
  });

  it("距离与耗时为正数且合理", () => {
    for (const r of buildRoutes(origin, dest)) {
      expect(r.distanceKm).toBeGreaterThan(0);
      expect(r.durationMin).toBeGreaterThan(0);
      // 直线距离约 4.9km，绕行不应超过 5 倍
      expect(r.distanceKm).toBeLessThan(25);
    }
  });

  it("绕行路线比主路长", () => {
    const routes = buildRoutes(origin, dest);
    const main = routes.find((r) => !r.isDetour)!;
    const detour = routes.find((r) => r.isDetour)!;
    expect(detour.distanceKm).toBeGreaterThan(main.distanceKm);
  });

  it("起终点重合时返回退化路线，不崩溃", () => {
    const routes = buildRoutes(origin, origin);
    expect(routes).toHaveLength(1);
    expect(routes[0].distanceKm).toBe(0);
  });

  it("绕行候选走廊数量 >= 1，且每条至少 2 点", () => {
    const cands = buildDetourCandidates(origin, dest);
    expect(cands.length).toBeGreaterThanOrEqual(1);
    for (const c of cands) expect(c.length).toBeGreaterThanOrEqual(2);
  });

  it("所有地点坐标有效（曼谷纬度范围内）", () => {
    for (const p of PLACES) {
      expect(p.coords[0]).toBeGreaterThan(13.0);
      expect(p.coords[0]).toBeLessThan(14.2);
      expect(p.coords[1]).toBeGreaterThan(100.0);
      expect(p.coords[1]).toBeLessThan(101.0);
    }
  });
});

