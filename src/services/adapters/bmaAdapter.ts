/**
 * bmaAdapter.ts —— 曼谷市政 / Traffy Fondue 排水工单适配器
 *
 * 将 BMA（曼谷市政府）排水投诉数据结构转换为统一的 FloodEvent。
 * 数据形态参考 Traffy Fondue（市政问题上报平台）的工单 JSON。
 */

import { FloodEvent, createFloodEvent } from "../../domain/floodEvent.js";

/** 原始工单数据结构（Traffy Fondue 风格） */
export interface BmaTicket {
  ticketId: string;
  coords: { lat: number; lng: number } | [number, number];
  title: string;
  status: "in_progress" | "resolved";
  timestamp: string | number | Date;
  /** 可选：明确水深（厘米） */
  waterDepthCm?: number;
  /** 可选：事件标签，用于推断水深 */
  tags?: string[];
  /** 可选：工单链接 */
  url?: string;
}

/** 无明确水深时，按标签推断的保守默认水深（厘米） */
export const BMA_DEFAULT_DEPTH_CM = 20;

/** 高风险标签 -> 更高默认水深 */
const HIGH_RISK_TAGS: { tag: string; depthCm: number }[] = [
  { tag: "น้ำท่วมสูง", depthCm: 40 }, // 深积水
  { tag: "ท่วมขัง", depthCm: 30 }, // 积水滞留
  { tag: "รถเล็กผ่านไม่ได้", depthCm: 35 }, // 小型车无法通过
];

const BMA_BASE_CONFIDENCE = 0.9;

/** 归一化坐标：[lat,lng] 或 {lat,lng} */
function normalizeCoords(coords: BmaTicket["coords"]): [number, number] {
  if (Array.isArray(coords)) return [coords[0], coords[1]];
  return [coords.lat, coords.lng];
}

/** 归一化时间戳 */
function normalizeDate(ts: BmaTicket["timestamp"]): Date {
  if (ts instanceof Date) return ts;
  if (typeof ts === "number") return new Date(ts);
  return new Date(ts);
}

/** 依据标签推断水深（无明确水深时使用） */
function inferDepthFromTags(tags: string[] | undefined): number {
  if (!tags || tags.length === 0) return BMA_DEFAULT_DEPTH_CM;
  for (const { tag, depthCm } of HIGH_RISK_TAGS) {
    if (tags.some((t) => t.includes(tag))) return depthCm;
  }
  return BMA_DEFAULT_DEPTH_CM;
}

/**
 * 解析单条 BMA 工单。
 * 仅处理「未解除」的险情（status === "in_progress"）；已解决返回 null。
 */
export function parseBmaTicket(ticket: BmaTicket): FloodEvent | null {
  if (ticket.status === "resolved") return null;

  const [lat, lng] = normalizeCoords(ticket.coords);
  const depth = ticket.waterDepthCm ?? inferDepthFromTags(ticket.tags);

  return createFloodEvent({
    id: `bma-${ticket.ticketId}`,
    latitude: lat,
    longitude: lng,
    waterDepthCm: depth,
    source: "BMA",
    reportedAt: normalizeDate(ticket.timestamp),
    radiusMeters: 35,
    clearedVotes: 0,
    confidence: BMA_BASE_CONFIDENCE,
    description: ticket.title,
    ...(ticket.url ? { sourceUrl: ticket.url } : {}),
  });
}

/** 批量解析，过滤掉已解决工单 */
export function parseBmaTickets(tickets: BmaTicket[]): FloodEvent[] {
  return tickets
    .map(parseBmaTicket)
    .filter((e): e is FloodEvent => e !== null);
}
