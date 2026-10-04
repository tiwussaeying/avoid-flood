/**
 * FloodDetailItem.tsx —— 积水点详情条目（i18n 版）
 * 展示来源徽标、上报时间、水深，并提供「水退了」反向解除按钮。
 */
import { CheckCircle2, Clock, Droplets, ExternalLink } from "lucide-react";
import { FloodEvent, FloodSource } from "../domain/floodEvent.js";
import { CLEARED_VOTES_THRESHOLD } from "../domain/floodEvent.js";
import { PassabilityStatus } from "../domain/vehicle.js";
import { StatusBadge } from "./StatusBadge.js";
import { OverallRisk } from "../engine/routeRiskEvaluator.js";
import { useTranslation } from "../i18n/i18n.js";

interface Props {
  flood: FloodEvent;
  status: PassabilityStatus;
  now: Date;
  onVoteCleared: (id: string) => void;
}

/** 来源徽标样式 */
const SOURCE_CLS: Record<FloodSource, string> = {
  BMA: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  JS100: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  CROWD: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function hitStatusToRisk(status: PassabilityStatus): OverallRisk {
  if (status === PassabilityStatus.BLOCKED) return "IMPASSABLE";
  if (status === PassabilityStatus.CAUTION) return "WARNING";
  return "SAFE";
}

export function FloodDetailItem({ flood, status, now, onVoteCleared }: Props) {
  const { t } = useTranslation();

  const sourceLabel =
    flood.source === "BMA"
      ? t.sourceBma
      : flood.source === "JS100"
        ? t.sourceJs100
        : t.sourceCrowd;

  const relTime = (() => {
    const min = Math.max(
      0,
      Math.round((now.getTime() - flood.reportedAt.getTime()) / 60_000),
    );
    if (min < 1) return t.justNow;
    if (min < 60) return t.minutesAgo(min);
    return t.hoursAgo(Math.floor(min / 60));
  })();

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--color-edge)] bg-black/20 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${SOURCE_CLS[flood.source]}`}
          >
            {sourceLabel}
          </span>
          <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-500">
            <Clock className="h-3 w-3" />
            {relTime}
          </span>
          {flood.confidence !== undefined && (
            <span className="text-[10.5px] text-slate-500">
              {t.confidence} {(flood.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
          <Droplets className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-semibold">{flood.waterDepthCm} cm</span>
          {flood.description && (
            <span className="truncate text-slate-500">· {flood.description}</span>
          )}
        </div>

        {flood.sourceUrl && (
          <a
            href={flood.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-cyan-400 hover:underline"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            {t.viewSource}
          </a>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge risk={hitStatusToRisk(status)} compact />
        <button
          type="button"
          onClick={() => onVoteCleared(flood.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10.5px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
        >
          <CheckCircle2 className="h-3 w-3" />
          {t.clearedButton(flood.clearedVotes, CLEARED_VOTES_THRESHOLD)}
        </button>
      </div>
    </div>
  );
}
