/**
 * bangkokBounds.ts —— 曼谷城市包围盒
 *
 * 用途：无国家/城市限定词的搜索（如「医院」「Iconsiam」）时，
 * 优先返回曼谷范围内的结果，避免返回外府同名地点。
 */

/** 曼谷大都会范围（含暖武里/北榄等都会区） */
export const BANGKOK_BOUNDS = {
  minLat: 13.4,
  maxLat: 14.1,
  minLng: 100.2,
  maxLng: 100.9,
} as const;

/** 坐标是否位于曼谷都会区 */
export function isBangkokContext(lat: number, lng: number): boolean {
  return (
    lat >= BANGKOK_BOUNDS.minLat &&
    lat <= BANGKOK_BOUNDS.maxLat &&
    lng >= BANGKOK_BOUNDS.minLng &&
    lng <= BANGKOK_BOUNDS.maxLng
  );
}
