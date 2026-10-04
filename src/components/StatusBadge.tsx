/**
 * StatusBadge.tsx —— 风险评级徽标（i18n 版）
 */
import { OverallRisk } from "../engine/routeRiskEvaluator.js";
import { useTranslation } from "../i18n/i18n.js";

interface Props {
  risk: OverallRisk;
  compact?: boolean;
}

const CLS: Record<OverallRisk, { cls: string; dot: string }> = {
  SAFE: {
    cls: "bg-emerald-500/12 text-emerald-300 border-emerald-500/35",
    dot: "bg-emerald-400",
  },
  WARNING: {
    cls: "bg-amber-500/12 text-amber-300 border-amber-500/35",
    dot: "bg-amber-400",
  },
  IMPASSABLE: {
    cls: "bg-red-500/12 text-red-300 border-red-500/40",
    dot: "bg-red-400",
  },
};

export function StatusBadge({ risk, compact = false }: Props) {
  const { t } = useTranslation();
  const c = CLS[risk];

  const label =
    risk === "SAFE"
      ? t.riskSafe
      : risk === "WARNING"
        ? t.riskWarning
        : t.riskImpassable;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${c.cls} ${
        compact ? "px-2 py-0.5 text-[11px]" : ""
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}
