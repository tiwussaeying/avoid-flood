/**
 * places.ts —— 曼谷地点数据库（演示用）
 *
 * 提供可搜索的地点集合（商场/BTS站/医院/路口等），
 * 供起终点输入框做模糊匹配。
 *
 * 真实产品中此处应替换为 Google Places / 高德 POI 检索 API。
 */

import type { LatLng } from "../engine/routeRiskEvaluator.js";

export interface Place {
  id: string;
  /** 英文名 */
  nameEn: string;
  /** 泰文名 */
  nameTh: string;
  /** 中文名 */
  nameZh: string;
  /** 地点类型，用于图标 */
  category: "mall" | "bts" | "hospital" | "intersection" | "park" | "airport";
  coords: LatLng;
}

/** 曼谷主要地点（覆盖常见出行起终点） */
export const PLACES: Place[] = [
  { id: "siam-paragon", nameEn: "Siam Paragon", nameTh: "สยามพารากอน", nameZh: "暹罗百丽宫", category: "mall", coords: [13.7462, 100.5347] },
  { id: "siam-center", nameEn: "Siam Center", nameTh: "สยามเซ็นเตอร์", nameZh: "暹罗中心", category: "mall", coords: [13.7456, 100.5331] },
  { id: "mbk", nameEn: "MBK Center", nameTh: "มาบุญครอง", nameZh: "MBK 商场", category: "mall", coords: [13.7449, 100.5298] },
  { id: "central-world", nameEn: "Central World", nameTh: "เซ็นทรัลเวิลด์", nameZh: "中央世界", category: "mall", coords: [13.7466, 100.5395] },
  { id: "terminal21", nameEn: "Terminal 21 Asok", nameTh: "เทอร์มินอล 21 อโศก", nameZh: "Terminal 21 Asok", category: "mall", coords: [13.7372, 100.5602] },
  { id: "emquartier", nameEn: "EmQuartier", nameTh: "เอ็มควอเทียร์", nameZh: "EmQuartier", category: "mall", coords: [13.7310, 100.5691] },
  { id: "mega-bangna", nameEn: "Mega Bangna", nameTh: "เมกาบางนา", nameZh: "Mega Bangna", category: "mall", coords: [13.6663, 100.6550] },

  { id: "bts-asok", nameEn: "BTS Asok", nameTh: "บีทีเอส อโศก", nameZh: "BTS Asok 站", category: "bts", coords: [13.7370, 100.5600] },
  { id: "bts-thonglo", nameEn: "BTS Thong Lo", nameTh: "บีทีเอส ทองหล่อ", nameZh: "BTS Thong Lo 站", category: "bts", coords: [13.7245, 100.5785] },
  { id: "bts-phromphong", nameEn: "BTS Phrom Phong", nameTh: "บีทีเอส พร้อมพงษ์", nameZh: "BTS Phrom Phong 站", category: "bts", coords: [13.7307, 100.5696] },
  { id: "bts-ekkamai", nameEn: "BTS Ekkamai", nameTh: "บีทีเอส เอกมัย", nameZh: "BTS Ekkamai 站", category: "bts", coords: [13.7198, 100.5850] },
  { id: "bts-phayathai", nameEn: "BTS Phaya Thai", nameTh: "บีทีเอส พญาไท", nameZh: "BTS Phaya Thai 站", category: "bts", coords: [13.7567, 100.5418] },
  { id: "mrt-sukhumvit", nameEn: "MRT Sukhumvit", nameTh: "MRT สุขุมวิท", nameZh: "MRT Sukhumvit 站", category: "bts", coords: [13.7385, 100.5610] },

  { id: "chula-hospital", nameEn: "Chulalongkorn Hospital", nameTh: "โรงพยาบาลจุฬาลงกรณ์", nameZh: "朱拉隆功医院", category: "hospital", coords: [13.7322, 100.5362] },
  { id: "bumrungrad", nameEn: "Bumrungrad Hospital", nameTh: "โรงพยาบาลบำรุงราษฎร์", nameZh: "康民医院", category: "hospital", coords: [13.7415, 100.5522] },

  { id: "asok-intersection", nameEn: "Asok Intersection", nameTh: "แยกอโศก", nameZh: "Asok 交叉口", category: "intersection", coords: [13.7370, 100.5600] },
  { id: "sukhumvit71", nameEn: "Sukhumvit Soi 71", nameTh: "สุขุมวิท ซอย 71", nameZh: "Sukhumvit 71 巷口", category: "intersection", coords: [13.7290, 100.5690] },
  { id: "rama4", nameEn: "Rama IV Junction", nameTh: "แยกรามคำแหง", nameZh: "Rama IV 路口", category: "intersection", coords: [13.7180, 100.5480] },

  { id: "lumphini", nameEn: "Lumphini Park", nameTh: "สวนลุมพินี", nameZh: "伦披尼公园", category: "park", coords: [13.7317, 100.5416] },
  { id: "benjasiri", nameEn: "Benjasiri Park", nameTh: "สวนเบญจสิริ", nameZh: "Benjasiri 公园", category: "park", coords: [13.7300, 100.5660] },

  { id: "bkk-airport", nameEn: "Suvarnabhumi Airport", nameTh: "สนามบินสุวรรณภูมิ", nameZh: "素万那普机场", category: "airport", coords: [13.6900, 100.7501] },
  { id: "donmueang", nameEn: "Don Mueang Airport", nameTh: "สนามบินดอนเมือง", nameZh: "廊曼机场", category: "airport", coords: [13.9126, 100.6068] },
];

/** 按优先级取地点显示名（当前语言） */
export function placeName(p: Place, lang: "th" | "en" | "zh"): string {
  return lang === "th" ? p.nameTh : lang === "zh" ? p.nameZh : p.nameEn;
}
