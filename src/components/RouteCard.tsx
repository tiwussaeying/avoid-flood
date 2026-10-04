/**
 * RouteCard.tsx —— 单条路线的对比卡片
 * 展示：路线名 / 耗时 / 距离 / 风险徽标 / 途经积水点明细
 */
import {
  AlertTriangle,
  Clock,
  Droplets,
  MapPin,
  Route as RouteIcon,
  ShieldCheck,
  Star,
} from "lucide-react";
import { DemoRoute } from "../mock/bangkokDemoData.js";
import { RouteRiskResult, OverallRisk } from "../engine/routeRiskEvaluator.js";
import { PassabilityStatus } from "../domain/vehicle.js";
import { StatusBadge } from "./StatusBadge.js";

interface Props {
  route: DemoRoute;
  risk: RouteRiskResult;
  /** 是否为当前选中用于导航的路线 */
  selected: boolean;
  onSelect: () => void;
}

const FLOOD_ID_LABEL: Record<string, string> = {
  "asok-interchange": "Asok 交叉口",
  "sukhumvit-71": "Sukhumvit 71 巷口",
};

/** 把「单车积水点的通行状态」映射到风险徽标色 */
function hitStatusToRisk(status: PassabilityStatus): OverallRisk {
  if (status === PassabilityStatus.BLOCKED) return "IMPASSABLE";
  if (status === PassabilityStatus.CAUTION) return "WARNING";
  return "SAFE";
}

export function RouteCard({ route, risk, selected, onSelect }: Props) {
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
    <button
      type="button"
      onClick={onSelect}
      className={`glass w-full rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${ringCls}`}
    >
      {/* 头部：名称 + 徽标 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[15px] font-semibold text-slate-100">
              {route.name}
            </h3>
            {route.isRecommended && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                <Star className="h-3 w-3" /> 推荐
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {route.subtitle}
          </p>
        </div>
        <StatusBadge risk={risk.overallRisk} compact />
      </div>

      {/* 指标行 */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          {route.durationMin} 分钟
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RouteIcon className="h-3.5 w-3.5 text-slate-500" />
          {route.distanceKm.toFixed(1)} km
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Droplets className="h-3.5 w-3.5 text-slate-500" />
          {risk.hits.length} 处积水
        </span>
      </div>

      {/* 命中积水明细 */}
      {risk.hits.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-[var(--color-edge)] pt-3">
          {risk.hits.map((hit) => (
            <div
              key={hit.flood.id}
              className="flex items-center justify-between text-xs"
            >
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                {FLOOD_ID_LABEL[hit.flood.id] ?? hit.flood.id}
                <span className="text-slate-500">
                  ({hit.flood.waterDepthCm}cm · {hit.flood.source})
                </span>
              </span>
              <StatusBadge risk={hitStatusToRisk(hit.status)} compact />
            </div>
          ))}
        </div>
      )}

      {/* 阻断警告条 */}
      {isBlocked && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            当前车型<strong className="font-bold">无法安全通过</strong>
            该路线积水段，建议改选下方推荐路线。
          </span>
        </div>
      )}

      {!isBlocked && !isWarning && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300/90">
          <ShieldCheck className="h-3.5 w-3.5" />
          全程无高危积水，可安全通行
        </div>
      )}
    </button>
  );
}
