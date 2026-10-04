/**
 * RouteCard.tsx —— 单条路线的对比卡片（i18n 版）
 */
import {
  AlertTriangle,
  Clock,
  Droplets,
  Route as RouteIcon,
  ShieldCheck,
  Star,
} from "lucide-react";
import { DemoRoute } from "../mock/bangkokDemoData.js";
import { RouteRiskResult } from "../engine/routeRiskEvaluator.js";
import { StatusBadge } from "./StatusBadge.js";
import { FloodDetailItem } from "./FloodDetailItem.js";
import { useTranslation } from "../i18n/i18n.js";

interface Props {
  route: DemoRoute;
  risk: RouteRiskResult;
  selected: boolean;
  onSelect: () => void;
  now: Date;
  onVoteCleared: (floodId: string) => void;
}

export function RouteCard({
  route,
  risk,
  selected,
  onSelect,
  now,
  onVoteCleared,
}: Props) {
  const { t, lang } = useTranslation();
  const isBlocked = risk.overallRisk === "IMPASSABLE";
  const isWarning = risk.overallRisk === "WARNING";

  const ringCls = selected
    ? isBlocked
      ? "ring-2 ring-red-500/60"
      : isWarning
        ? "ring-2 ring-amber-500/55"
        : "ring-2 ring-emerald-500/55"
    : "ring-1 ring-[var(--color-edge)]";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={`glass w-full cursor-pointer rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${ringCls}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold text-slate-100">
              {route.name[lang]}
            </h3>
            {route.isRecommended && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                <Star className="h-3 w-3" /> {t.recommended}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {route.subtitle[lang]}
          </p>
        </div>
        <StatusBadge risk={risk.overallRisk} compact />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          {route.durationMin} {t.minutes}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RouteIcon className="h-3.5 w-3.5 text-slate-500" />
          {route.distanceKm.toFixed(1)} km
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5 text-slate-500" />
          {t.floodCount(risk.hits.length)}
        </span>
      </div>

      {risk.hits.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-[var(--color-edge)] pt-3">
          {risk.hits.map((hit) => (
            <FloodDetailItem
              key={hit.flood.id}
              flood={hit.flood}
              status={hit.status}
              now={now}
              onVoteCleared={onVoteCleared}
            />
          ))}
        </div>
      )}

      {isBlocked && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t.blockedHint}</span>
        </div>
      )}

      {!isBlocked && !isWarning && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300/90">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t.allClearHint}
        </div>
      )}
    </div>
  );
}

