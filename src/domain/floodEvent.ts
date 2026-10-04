/**
 * 积水事件与时间半衰期模型 (Flood event + temporal decay)
 *
 * 纯领域逻辑：描述一次「积水上报」事件，并根据「报告时间 -> 当前时间」
 * 的衰减规则计算其有效性；同时支持「反向退水」解除机制。
 * 无第三方依赖。
 */

/** 数据来源 */
export type FloodSource = "JS100" | "BMA" | "CROWD";

/** 积水事件 */
export interface FloodEvent {
  id: string;
  latitude: number;
  longitude: number;
  /** 积水深度（厘米） */
  waterDepthCm: number;
  source: FloodSource;
  /** 上报时间 */
  reportedAt: Date;
  /** 影响半径（米），默认 30m */
  radiusMeters: number;
  /** 确认水退的票数（反向解除机制） */
  clearedVotes: number;
}

/** 事件的时间有效性状态 */
export enum FloodValidity {
  /** 0~60 分钟：有效度 100% */
  FRESH = "FRESH",
  /** 60~120 分钟：有效度 70% */
  AGING = "AGING",
  /** 120~180 分钟：有效度 30% */
  STALE = "STALE",
  /** 超过 180 分钟：过期，应被忽略 */
  EXPIRED = "EXPIRED",
  /** 反向解除：clearedVotes 达标，水位已退 */
  CLEARED = "CLEARED",
}

/** 计算结果的完整结构 */
export interface FloodStatus {
  validity: FloodValidity;
  /** 时间衰减置信度系数：1.0 / 0.7 / 0.3 / 0（EXPIRE/CLEARED 均为 0） */
  confidence: number;
  /** 该积水点当前是否仍应参与风险评估 */
  isActive: boolean;
}

/** 默认影响半径（米） */
export const DEFAULT_RADIUS_METERS = 30;

/** 反向解除所需的最少「确认水退」票数 */
export const CLEARED_VOTES_THRESHOLD = 2;

/** 时间衰减分段（分钟） */
const MINUTE_MS = 60_000;
const AGING_START_MIN = 60;
const STALE_START_MIN = 120;
const EXPIRED_START_MIN = 180;

/**
 * 计算积水事件在 currentTime 时点的有效性与置信度。
 *
 * 规则优先级：反向解除 (CLEARED) 高于时间衰减。
 *
 * @param event        积水事件
 * @param currentTime  当前时间
 */
export function calculateFloodStatus(
  event: FloodEvent,
  currentTime: Date,
): FloodStatus {
  // 反向解除机制：足够多的用户确认水已退，直接判定 CLEARED
  if (event.clearedVotes >= CLEARED_VOTES_THRESHOLD) {
    return { validity: FloodValidity.CLEARED, confidence: 0, isActive: false };
  }

  const elapsedMs = currentTime.getTime() - event.reportedAt.getTime();
  const elapsedMin = elapsedMs / MINUTE_MS;

  // 未来时间（时钟漂移）按最新处理
  if (elapsedMin <= AGING_START_MIN) {
    return { validity: FloodValidity.FRESH, confidence: 1.0, isActive: true };
  }
  if (elapsedMin <= STALE_START_MIN) {
    return { validity: FloodValidity.AGING, confidence: 0.7, isActive: true };
  }
  if (elapsedMin <= EXPIRED_START_MIN) {
    return { validity: FloodValidity.STALE, confidence: 0.3, isActive: true };
  }
  return { validity: FloodValidity.EXPIRED, confidence: 0, isActive: false };
}

/** 便捷判断：事件此刻是否仍有效（应参与风险计算） */
export function isFloodActive(event: FloodEvent, currentTime: Date): boolean {
  return calculateFloodStatus(event, currentTime).isActive;
}

/** 便捷工厂：创建一个带默认半径的积水事件 */
export function createFloodEvent(
  partial: Omit<FloodEvent, "radiusMeters" | "clearedVotes"> &
    Partial<Pick<FloodEvent, "radiusMeters" | "clearedVotes">>,
): FloodEvent {
  return {
    radiusMeters: DEFAULT_RADIUS_METERS,
    clearedVotes: 0,
    ...partial,
  };
}
