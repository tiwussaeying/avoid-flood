/**
 * placeSearch.ts —— 地点模糊搜索
 *
 * 支持中/英/泰三语关键词匹配，并按「匹配质量 + 距离」排序。
 * 纯函数，便于单测。
 */

import type { LatLng } from "../engine/routeRiskEvaluator.js";
import { haversineMeters } from "../engine/routeRiskEvaluator.js";
import { PLACES, placeName, type Place } from "../mock/places.js";
import type { Language } from "../i18n/types.js";

export interface SearchResult {
  place: Place;
  /** 当前语言显示名 */
  label: string;
  /** 距参考点距离（米），无参考点时为 null */
  distanceMeters: number | null;
}

/**
 * 归一化查询串：小写、去空格。
 */
function normalize(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * 判断地点是否匹配关键词：命中任一语言名称即算匹配。
 */
function matches(place: Place, q: string): boolean {
  return (
    place.nameEn.toLowerCase().includes(q) ||
    place.nameTh.includes(q) ||
    place.nameZh.includes(q)
  );
}

/**
 * 搜索地点。
 *
 * @param query     关键词（支持中/英/泰）
 * @param lang      当前语言（决定返回的 label）
 * @param origin    参考点（用于按距离排序），可选
 * @param limit     最多返回数量，默认 8
 */
export function searchPlaces(
  query: string,
  lang: Language,
  origin?: LatLng,
  limit = 8,
): SearchResult[] {
  const q = normalize(query);

  const matched = q
    ? PLACES.filter((p) => matches(p, q))
    : PLACES.slice(); // 空查询返回全部（供「热门地点」用）

  const results: SearchResult[] = matched.map((place) => ({
    place,
    label: placeName(place, lang),
    distanceMeters: origin ? haversineMeters(origin, place.coords) : null,
  }));

  // 有参考点时按距离升序；否则按原始顺序
  if (origin) {
    results.sort(
      (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0),
    );
  }

  return results.slice(0, limit);
}

/** 按 id 查找地点 */
export function findPlaceById(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id);
}

/**
 * 把任意经纬度包装成一个「无名地点」（用于用户定位）。
 */
export function makeCurrentLocationPlace(coords: LatLng, label: string): Place {
  return {
    id: "current-location",
    nameEn: label,
    nameTh: label,
    nameZh: label,
    category: "intersection",
    coords,
  };
}
