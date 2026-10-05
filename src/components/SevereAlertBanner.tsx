/**
 * SevereAlertBanner.tsx —— 极端天气警报横幅
 *
 * 对标 The Weather Channel 的 severe alert：可关闭，
 * 关闭状态持久化到 localStorage（key 含警报 id，新警报会重新弹出）。
 */
import { useEffect, useState } from "react";
import { AlertTriangle, Waves, Wind, X } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";

export type AlertKind = "flood" | "wind";

export interface SevereAlert {
  /** 唯一 id，用于记忆「已读」状态 */
  id: string;
  kind: AlertKind;
}

interface Props {
  alerts: SevereAlert[];
}

const STORAGE_PREFIX = "floodnav.dismissedAlert.";

export function SevereAlertBanner({ alerts }: Props) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // 读取已读状态（容错：localStorage 不可用时忽略）
  useEffect(() => {
    const next = new Set<string>();
    try {
      for (const a of alerts) {
        if (localStorage.getItem(STORAGE_PREFIX + a.id) === "1") next.add(a.id);
      }
    } catch {
      /* 忽略 */
    }
    setDismissed(next);
  }, [alerts]);

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    try {
      localStorage.setItem(STORAGE_PREFIX + id, "1");
    } catch {
      /* 忽略 */
    }
  };

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const primary = visible[0];
  const Icon = primary.kind === "flood" ? Waves : Wind;
  const kindLabel = primary.kind === "flood" ? t.severeAlertFlood : t.severeAlertWind;

  return (
    <section
      role="alert"
      className="animate-float-in relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-500/18 via-red-500/10 to-transparent p-3.5"
    >
      {/* 左侧脉冲指示条 */}
      <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-red-400 to-orange-500" />

      <div className="flex items-start gap-2.5 pl-1.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-red-500/25">
          <Icon className="h-3.5 w-3.5 text-red-300" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 shrink-0 text-red-300" />
            <span className="text-[12px] font-bold text-red-100">{t.severeAlertTitle}</span>
            <span className="rounded-md bg-red-500/25 px-1.5 py-0.5 text-[9px] font-semibold text-red-200">
              {kindLabel}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-red-100/75">{t.severeAlertBody}</p>
        </div>

        <button
          type="button"
          onClick={() => dismiss(primary.id)}
          aria-label={t.severeAlertDismiss}
          className="shrink-0 rounded-lg p-1 text-red-200/70 transition-colors hover:bg-white/10 hover:text-red-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
