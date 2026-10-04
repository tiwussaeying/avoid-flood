/**
 * StatusBadge.tsx —— 风险评级徽标（SAFE / WARNING / IMPASSABLE）
 */
import { OverallRisk } from "../engine/routeRiskEvaluator.js";

interface Props {
  risk: OverallRisk;
  compact?: boolean;
}

const CONFIG: Record<
  OverallRisk,
  { label: string; cls: string; dot: string }
> = {
  SAFE: {
    label: "安全 SAFE",
    cls: "bg-emerald-500/12 text-emerald-300 border-emerald-500/35",
    dot: "bg-emerald-400",
  },
  WARNING: {
    label: "谨慎 CAUTION",
    cls: "bg-amber-500/12 text-amber-300 border-amber-500/35",
    dot: "bg-amber-400",
  },
  IMPASSABLE: {
    label: "阻断 BLOCKED",
    cls: "bg-red-500/12 text-red-300 border-red-500/40",
    dot: "bg-red-400",
  },
};

export function StatusBadge({ risk, compact = false }: Props) {
  const c = CONFIG[risk];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide ${c.cls} ${
        compact ? "px-2 py-0.5 text-[11px]" : ""
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {compact ? c.label.split(" ")[0] : c.label}
    </span>
  );
}
