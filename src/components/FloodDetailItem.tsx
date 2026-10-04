/**
 * FloodDetailItem.tsx —— 积水点详情条目
 * 展示来源徽标、上报时间、水深，并提供「水退了」反向解除按钮。
 */
import { CheckCircle2, Clock, Droplets, ExternalLink } from "lucide-react";
import { FloodEvent, FloodSource } from "../domain/floodEvent.js";
import { PassabilityStatus } from "../domain/vehicle.js";
import { StatusBadge } from "./StatusBadge.js";
import { OverallRisk } from "../engine/routeRiskEvaluator.js";

interface Props {
  flood: FloodEvent;
  status: PassabilityStatus;
  /** 当前时间，用于显示「x 分钟前」 */
  now: Date;
  onVoteCleared: (id: string) => void;
}

/** 来源徽标样式与文案 */
const SOURCE_META: Record<
  FloodSource,
  { label: string; cls: string; short: string }
> = {
  BMA: {
    label: "BMA 市政",
    short: "BMA",
    cls: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  JS100: {
    label: "JS100 广播",
    short: "JS100",
    cls: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  CROWD: {
    label: "众包上报",
    short: "众包",
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
};

function hitStatusToRisk(status: PassabilityStatus): OverallRisk {
  if (status === PassabilityStatus.BLOCKED) return "IMPASSABLE";
  if (status === PassabilityStatus.CAUTION) return "WARNING";
  return "SAFE";
}

/** 相对时间：x 分钟前 */
function relativeTime(from: Date, now: Date): string {
  const min = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60_000));
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  return `${h} 小时前`;
}

export function FloodDetailItem({ flood, status, now, onVoteCleared }: Props) {
  const meta = SOURCE_META[flood.source];
  const remainingVotes = Math.max(0, 2 - flood.clearedVotes);

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--color-edge)] bg-black/20 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        {/* 第一行：来源徽标 + 相对时间 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${meta.cls}`}
          >
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-500">
            <Clock className="h-3 w-3" />
            {relativeTime(flood.reportedAt, now)}
          </span>
          {flood.confidence !== undefined && (
            <span className="text-[10.5px] text-slate-500">
              置信 {(flood.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* 第二行：水深 + 描述 */}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300">
          <Droplets className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-semibold">{flood.waterDepthCm} cm</span>
          {flood.description && (
            <span className="truncate text-slate-500">· {flood.description}</span>
          )}
        </div>

        {/* 来源链接 */}
        {flood.sourceUrl && (
          <a
            href={flood.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[10.5px] text-cyan-400 hover:underline"
          >
            <ExternalLink className="h-2.5 w-2.5" />
            查看原始来源
          </a>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge risk={hitStatusToRisk(status)} compact />
        <button
          type="button"
          onClick={() => onVoteCleared(flood.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10.5px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
          title={`还需 ${remainingVotes} 票确认水退`}
        >
          <CheckCircle2 className="h-3 w-3" />
          水退了 ({flood.clearedVotes}/2)
        </button>
      </div>
    </div>
  );
}
