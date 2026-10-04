/**
 * navLauncher.ts —— 统一的外部地图唤起服务
 *
 * 负责把「起点 / 终点 / 安全避险途经点」组装成各大厂地图 App 的
 * Universal Link 或 URL Scheme，供 UI 层一键唤起。
 *
 * 纯字符串构造：无副作用，便于单测与复用。
 */

/** 经纬度坐标 [lat, lng] */
export type LatLng = [number, number];

export interface NavRoute {
  origin: LatLng;
  destination: LatLng;
  /** 安全避险途经点（0~N 个），仅部分厂商支持 */
  waypoints?: LatLng[];
  /** 出行方式，默认驾车 */
  travelMode?: "driving" | "walking" | "bicycling" | "transit";
}

/** 保留 6 位小数，足够米级精度且 URL 简洁 */
const fmt = (p: LatLng): string => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;

/** 用 | 连接途经点，按厂商要求编码 */
const fmtWaypoints = (waypoints: LatLng[] | undefined): string | null =>
  waypoints && waypoints.length > 0 ? waypoints.map(fmt).join("|") : null;

/* ------------------------------------------------------------------ */
/* 1. Google Maps                                                      */
/* ------------------------------------------------------------------ */

/**
 * 生成 Google Maps 方向链接（官方 Maps URLs API）。
 * 支持 origin / destination / waypoints / travelmode。
 * 兼容移动端 Universal Link 与桌面浏览器。
 */
export function buildGoogleMapsUrl(route: NavRoute): string {
  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("origin", fmt(route.origin));
  params.set("destination", fmt(route.destination));
  params.set("travelmode", route.travelMode ?? "driving");

  const wp = fmtWaypoints(route.waypoints);
  if (wp) params.set("waypoints", wp);

  // URLSearchParams 会把 | 编码为 %7C，Google 两种都接受
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/* 2. Waze                                                             */
/* ------------------------------------------------------------------ */

/**
 * 生成 Waze 深度链接。
 * Waze **不支持多点途经**，因此策略为：
 *   - 若有首选避险绕行点，则将其作为「导航目标」(ll)，
 *     并在 nave=yes 时把真实终点写进注释，避免绕过积水后仍被导回淹没点；
 *   - 若无需绕行，则直接导航至终点。
 */
export function buildWazeUrl(route: NavRoute): string {
  const preferredDetour =
    route.waypoints && route.waypoints.length > 0 ? route.waypoints[0] : null;
  const target = preferredDetour ?? route.destination;

  const params = new URLSearchParams();
  params.set("ll", fmt(target));
  params.set("navigate", "yes");
  params.set("utm_source", "bangkok-floodnav");
  // 有绕行时，把最终目的地作为提示附加在文本里
  if (preferredDetour) {
    params.set("q", `avoid-flood detour -> ${fmt(route.destination)}`);
  }
  return `https://waze.com/ul?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/* 3. Apple Maps                                                       */
/* ------------------------------------------------------------------ */

/**
 * 生成 Apple Maps 链接（iOS 上以 maps:// scheme 唤起 App）。
 * 使用 daddr（目的地）、saddr（起点）与通过点坐标；多个途经点用 +to: 串联。
 * 非 iOS 设备打开会回退到网页版。
 */
export function buildAppleMapsUrl(route: NavRoute, iosScheme = true): string {
  const base = iosScheme ? "maps://" : "https://maps.apple.com/";
  const params = new URLSearchParams();
  params.set("saddr", fmt(route.origin));
  params.set("daddr", fmt(route.destination));
  params.set("dirflg", "d"); // 驾车

  const wp = route.waypoints;
  if (wp && wp.length > 0) {
    // Apple Maps 通过点使用 +to: 语法
    params.set("waypoints", wp.map(fmt).join("+to:"));
  }
  return `${base}?${params.toString()}`;
}

/* ------------------------------------------------------------------ */
/* 4. 统一唤起                                                          */
/* ------------------------------------------------------------------ */

export type NavProvider = "google" | "waze" | "apple";

/** 按 provider 生成对应链接 */
export function buildNavUrl(provider: NavProvider, route: NavRoute): string {
  switch (provider) {
    case "google":
      return buildGoogleMapsUrl(route);
    case "waze":
      return buildWazeUrl(route);
    case "apple":
      return buildAppleMapsUrl(route, true);
  }
}

/** 在浏览器新窗口唤起导航（PWA / Web 环境） */
export function launchNavigation(provider: NavProvider, route: NavRoute): void {
  const url = buildNavUrl(provider, route);
  window.open(url, "_blank", "noopener,noreferrer");
}
