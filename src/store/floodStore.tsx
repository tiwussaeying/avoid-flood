/**
 * floodStore.tsx —— 全局积水状态管理（React Context）
 *
 * 职责：
 *   - 持有当前地图上的全部积水事件
 *   - 每 30 秒执行 decayCheck：按半衰期计算有效性，剔除已过期/已解除的积水
 *   - voteCleared：记录「水退了」投票，达标后立即剔除
 *   - addCrowdReport：注入用户众包上报
 *
 * 注意：Context 本身返回 null-safety，业务函数保持纯逻辑便于测试。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FloodEvent,
  calculateFloodStatus,
  createFloodEvent,
} from "../domain/floodEvent.js";

/** 半衰期刷新间隔（毫秒） */
export const DECAY_CHECK_INTERVAL_MS = 30_000;

/** 纯函数：过滤出仍然活跃（未过期且未解除）的积水事件 */
export function filterActiveFloods(
  floods: FloodEvent[],
  now: Date,
): FloodEvent[] {
  return floods.filter((f) => calculateFloodStatus(f, now).isActive);
}

/** 纯函数：对某条积水投票「水退了」，返回新数组 */
export function applyClearedVote(
  floods: FloodEvent[],
  floodId: string,
): FloodEvent[] {
  return floods.map((f) =>
    f.id === floodId ? { ...f, clearedVotes: f.clearedVotes + 1 } : f,
  );
}

/** 纯函数：把投票后已达标（CLEARED）的积水剔除 */
export function pruneClearedFloods(
  floods: FloodEvent[],
  now: Date,
): FloodEvent[] {
  return floods.filter((f) => {
    const status = calculateFloodStatus(f, now);
    // CLEARED 立即剔除；EXPIRED 也剔除；其余保留
    return status.isActive;
  });
}

export interface FloodStoreValue {
  floods: FloodEvent[];
  /** 最近一次刷新时间 */
  lastDecayAt: Date;
  voteCleared: (floodId: string) => void;
  addCrowdReport: (report: {
    latitude: number;
    longitude: number;
    waterDepthCm: number;
    description?: string;
  }) => void;
  /** 手动触发一次刷新（测试用） */
  refresh: () => void;
}

export const FloodStoreContext = createContext<FloodStoreValue | null>(null);

export function FloodStoreProvider({
  children,
  initialFloods = [],
  /** 注入时钟，便于测试；默认取系统时间 */
  now = () => new Date(),
  /** 定时刷新间隔，可覆盖（测试时可设更大或禁用） */
  intervalMs = DECAY_CHECK_INTERVAL_MS,
}: {
  children: ReactNode;
  initialFloods?: FloodEvent[];
  now?: () => Date;
  intervalMs?: number;
}) {
  const [floods, setFloods] = useState<FloodEvent[]>(initialFloods);
  const [lastDecayAt, setLastDecayAt] = useState<Date>(now());
  const nowRef = useRef(now);
  nowRef.current = now;

  const refresh = useCallback(() => {
    const t = nowRef.current();
    setFloods((prev) => pruneClearedFloods(prev, t));
    setLastDecayAt(t);
  }, []);

  // 生命周期定时刷新
  useEffect(() => {
    if (intervalMs <= 0) return;
    const timer = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(timer);
  }, [refresh, intervalMs]);

  const voteCleared = useCallback((floodId: string) => {
    const t = nowRef.current();
    setFloods((prev) => pruneClearedFloods(applyClearedVote(prev, floodId), t));
  }, []);

  const addCrowdReport = useCallback<FloodStoreValue["addCrowdReport"]>(
    (report) => {
      const t = nowRef.current();
      const event = createFloodEvent({
        id: `crowd-${t.getTime()}-${Math.floor(Math.random() * 1e6)}`,
        latitude: report.latitude,
        longitude: report.longitude,
        waterDepthCm: report.waterDepthCm,
        source: "CROWD",
        reportedAt: t,
        radiusMeters: 30,
        clearedVotes: 0,
        confidence: 0.6,
        ...(report.description ? { description: report.description } : {}),
      });
      setFloods((prev) => [...prev, event]);
    },
    [],
  );

  const value = useMemo<FloodStoreValue>(
    () => ({ floods, lastDecayAt, voteCleared, addCrowdReport, refresh }),
    [floods, lastDecayAt, voteCleared, addCrowdReport, refresh],
  );

  return (
    <FloodStoreContext.Provider value={value}>
      {children}
    </FloodStoreContext.Provider>
  );
}

/** 消费 FloodStore；未包裹 Provider 时抛出明确错误 */
export function useFloodStore(): FloodStoreValue {
  const ctx = useContext(FloodStoreContext);
  if (!ctx) {
    throw new Error("useFloodStore 必须在 <FloodStoreProvider> 内使用");
  }
  return ctx;
}
