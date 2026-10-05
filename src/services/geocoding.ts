/**
 * geocoding.ts —— 自由地点解析（任意地址 / 地标 -> 坐标）
 *
 * 三级降级策略，保证用户输入任意文本都能拿到结果：
 *   1) 本地 POI 库模糊匹配（离线优先、零延迟、无隐私外泄）
 *   2) Nominatim / OpenStreetMap 正向地理编码（真实任意地址）
 *   3) 坐标直填（"13.7462,100.5347" 或十进制度数对）
 *
 * 设计原则：网络失败绝不抛出，一律降级为 null，由 UI 决定提示。
 */

import type { LatLng } from "../engine/routeRiskEvaluator.js";
import { PLACES, placeName, type Place } from "../mock/places.js";
import { searchPlaces, makeCurrentLocationPlace } from "./placeSearch.js";
import type { Language } from "../i18n/types.js";
import { isBangkokContext } from "./bangkokBounds.js";

/** Nominatim 端点（可通过环境变量覆盖，便于自建代理） */
const NOMINATIM_ENDPOINT =
  (import.meta as { env?: Record<string, string> }).env?.VITE_NOMINATIM_URL ??
  "https://nominatim.openstreetmap.org/search";

/** 网络请求超时（毫秒）：弱网下不阻塞 UI */
const GEOCODE_TIMEOUT_MS = 6000;

export interface GeocodeHit {
  /** 显示名（当前语言或 Nominatim 返回的 display_name） */
  label: string;
  /** 副标题：完整地址或国家/城市 */
  detail: string;
  coords: LatLng;
  /** 数据来源，供 UI 标注可信度 */
  origin_: "local" | "osm" | "coords";
}

/** 把坐标包装成可被 App 使用的地点对象 */
export function geocodeHitToPlace(hit: GeocodeHit): Place {
  return makeCurrentLocationPlace(hit.coords, hit.label);
}

/* ------------------------------------------------------------------ */
/* 1. 坐标直填解析                                                     */
/* ------------------------------------------------------------------ */

/**
 * 解析 "13.7462,100.5347" / "13.7462 100.5347" / "13.7462N 100.5347E"
 * 合法性校验：纬度 [-90,90]，经度 [-180,180]。
 */
export function parseLatLngInput(raw: string): LatLng | null {
  const s = raw.trim().replace(/[°]/g, " ").replace(/[NEne]/g, " ").trim();
  const parts = s.split(/[,\s]+/).filter(Boolean);
  if (parts.length !== 2) return null;

  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

/* ------------------------------------------------------------------ */
/* 2. Nominatim 正向地理编码                                           */
/* ------------------------------------------------------------------ */

interface NominatimItem {
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
}

/**
 * 调用 OSM Nominatim 正向地理编码。
 * 失败（超时/网络错误/非 JSON/字段缺失）一律返回 []，绝不抛出。
 */
export async function geocodeRemote(
  query: string,
  lang: Language,
): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (!q) return [];

  const url =
    `${NOMINATIM_ENDPOINT}?format=jsonv2&limit=6&addressdetails=1&accept-language=` +
    encodeURIComponent(lang === "zh" ? "zh-CN,en" : lang) +
    `&q=` +
    encodeURIComponent(q);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return [];

    // 防御：部分网关会返回 HTML 错误页而非 JSON
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return [];
    }
    if (!Array.isArray(data)) return [];

    return (data as NominatimItem[])
      .map((item): GeocodeHit | null => {
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const display = item.display_name ?? q;
        const short = item.name?.trim() || display.split(",")[0]?.trim() || q;
        return {
          label: short,
          detail: display,
          coords: [lat, lng],
          origin_: "osm",
        };
      })
      .filter((x): x is GeocodeHit => x !== null)
      // 曼谷结果优先：无城市限定词的查询（如「医院」）避免返回外府同名地
      .sort((a, b) => {
        const aIn = isBangkokContext(a.coords[0], a.coords[1]) ? 0 : 1;
        const bIn = isBangkokContext(b.coords[0], b.coords[1]) ? 0 : 1;
        return aIn - bIn;
      });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* 3. 统一入口：本地优先，网络兜底                                     */
/* ------------------------------------------------------------------ */

/**
 * 解析用户输入为候选地点列表。
 *
 * @param query 用户输入（任意地址、地标、坐标）
 * @param lang  当前语言
 * @param near  参考点（影响本地结果排序），可选
 */
export async function resolvePlaceQuery(
  query: string,
  lang: Language,
  near?: LatLng,
): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (!q) return [];

  // ① 坐标直填
  const coord = parseLatLngInput(q);
  if (coord) {
    const tag = lang === "zh" ? "坐标点" : lang === "th" ? "พิกัด" : "Coordinate";
    return [
      {
        label: `${tag} ${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}`,
        detail: `${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}`,
        coords: coord,
        origin_: "coords",
      },
    ];
  }

  // ② 本地 POI 库
  const local = searchPlaces(q, lang, near, 6).map(
    (r): GeocodeHit => ({
      label: r.label,
      detail: r.place.nameEn,
      coords: r.place.coords,
      origin_: "local",
    }),
  );

  // ③ 网络兜底（本地无结果或结果弱时触发）
  const needRemote = local.length === 0;
  if (!needRemote) return local;

  const remote = await geocodeRemote(q, lang);
  return remote;
}

/** 便捷：直接把查询解析为单个 Place（取第一个命中），无结果返回 null */
export async function resolveToPlace(
  query: string,
  lang: Language,
  near?: LatLng,
): Promise<Place | null> {
  const hits = await resolvePlaceQuery(query, lang, near);
  if (hits.length === 0) return null;
  const first = hits[0];
  return {
    ...makeCurrentLocationPlace(first.coords, first.label),
    nameEn: first.label,
    nameTh: first.label,
    nameZh: first.label,
  };
}

/** 全部本地 POI（供「热门地点」快捷列表） */
export function popularPlaces(lang: Language): Place[] {
  void lang;
  return PLACES.slice(0, 8);
}

export { placeName };
