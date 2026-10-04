/**
 * js100Adapter.ts —— JS100 (จส.100) 交通广播推文解析器
 *
 * 对泰语推文文本做模式匹配，抽取水深、地点与危险等级，
 * 统一输出为 FloodEvent。推文本身不含结构化坐标，故需外部提供
 * 坐标（由地理编码或已知路段映射补充）。
 */

import { FloodEvent, createFloodEvent } from "../../domain/floodEvent.js";

/** 原始推文 */
export interface Js100Tweet {
  id: string;
  text: string;
  createdAt: string | number | Date;
  url?: string;
  /** 由地理编码/路段映射补充的坐标 */
  coords?: [number, number];
}

/** JS100 推文初始置信度 */
export const JS100_BASE_CONFIDENCE = 0.85;

/** 高危阻断语义：小型车无法通过 / 深积水 */
const BLOCKING_PHRASES = ["รถเล็กผ่านไม่ได้", "ท่วมสูง", "ผ่านไม่ได้", "ปิดการจราจร"];

/** 阻断态对应的最低水深（厘米） */
export const BLOCKING_MIN_DEPTH_CM = 30;

/** 未匹配到水深且非阻断时的保守默认水深 */
export const JS100_DEFAULT_DEPTH_CM = 20;

/** 水深正则：匹配 "20 ซม."、"30 cm"、"สูง 45 เซนติเมตร"、"1.5 ม." 等 */
const DEPTH_PATTERNS: RegExp[] = [
  // 数字 + 公分单位（ซม / ซม. / cm / เซนติเมตร）
  /(\d+(?:\.\d+)?)\s*(?:ซม\.?|cm|เซนติเมตร)/i,
  // 数字 + 米单位（ม / ม. / m / เมตร）-> 转 cm
  /(\d+(?:\.\d+)?)\s*(?:ม\.|เมตร|m\b)/i,
];

/** 泰国常见行政区/路段关键词，用于推断描述归属 */
export const THAI_AREA_KEYWORDS = [
  "สุขุมวิท", // Sukhumvit
  "อโศก", // Asok
  "รัชดา", // Ratchada
  "พญาไท", // Phaya Thai
  "ลาดพร้าว", // Lat Phrao
  "บางนา", // Bangna
  "สีลม", // Silom
  "ดินแดง", // Din Daeng
];

export interface ParsedTweet {
  /** 是否判定为阻断级 */
  isBlocking: boolean;
  /** 抽取或推断的水深（厘米） */
  depthCm: number;
  /** 命中的地段关键词（若有） */
  area?: string;
}

/**
 * 从泰语推文正文解析水深与危险等级（纯函数，便于单测）。
 */
/**
 * 从泰语推文正文解析水深与危险等级（纯函数，便于单测）。
 *
 * 键规则：
 *  - 若文本中**明确给出水深数字**（如 "20 ซม." / "0.5 ม."），以该数字为准；
 *  - 仅在**未给出明确水深**时，才依据阻断语义（如 รถเล็กผ่านไม่ได้ / ท่วมสูง）
 *    把水深抬升到 BLOCKING_MIN_DEPTH_CM（30cm）；
 *  - 两者都没有则使用保守默认值 20cm。
 */
export function parseTweetText(text: string): ParsedTweet {
  const normalized = text.trim();
  const isBlocking = BLOCKING_PHRASES.some((p) => normalized.includes(p));

  let depthCm: number | null = null;

  // 优先匹配厘米单位
  const cmMatch = DEPTH_PATTERNS[0].exec(normalized);
  if (cmMatch) {
    depthCm = parseFloat(cmMatch[1]);
  } else {
    // 再看米单位 -> 转厘米
    const mMatch = DEPTH_PATTERNS[1].exec(normalized);
    if (mMatch) {
      depthCm = parseFloat(mMatch[1]) * 100;
    }
  }

  // 无明确水深 + 阻断语义 -> 抬升到阻断下限
  if (depthCm === null && isBlocking) {
    depthCm = BLOCKING_MIN_DEPTH_CM;
  }

  const area = THAI_AREA_KEYWORDS.find((k) => normalized.includes(k));

  return {
    isBlocking,
    depthCm: depthCm ?? JS100_DEFAULT_DEPTH_CM,
    ...(area ? { area } : {}),
  };
}

/** 批量解析推文 -> FloodEvent（无坐标的推文会被跳过） */
export function parseJs100Tweets(tweets: Js100Tweet[]): FloodEvent[] {
  const events: FloodEvent[] = [];
  for (const tweet of tweets) {
    const parsed = parseTweetText(tweet.text);
    if (!tweet.coords) continue; // 缺坐标无法落图，交由地理编码环节补齐

    const reportedAt =
      tweet.createdAt instanceof Date
        ? tweet.createdAt
        : new Date(tweet.createdAt);

    const event: FloodEvent = createFloodEvent({
      id: `js100-${tweet.id}`,
      latitude: tweet.coords[0],
      longitude: tweet.coords[1],
      waterDepthCm: parsed.depthCm,
      source: "JS100",
      reportedAt,
      radiusMeters: 40,
      clearedVotes: 0,
      confidence: JS100_BASE_CONFIDENCE,
      description: tweet.text,
      ...(tweet.url ? { sourceUrl: tweet.url } : {}),
    });
    events.push(event);
  }
  return events;
}

