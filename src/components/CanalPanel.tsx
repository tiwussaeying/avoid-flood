/**
 * CanalPanel.tsx —— 河道水位警戒面板
 * 展示曼谷主要排水河道当前水位与警戒线，预报「倒灌积水」风险。
 */
import { Waves } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import { CanalLevel } from "../mock/weatherData.js";

interface Props {
  canals: CanalLevel[];
}

export function CanalPanel({ canals }: Props) {
  const { t } = useTranslation();

  return (
    <section className="glass animate-float-in rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-100">
        <Waves className="h-4 w-4 text-[var(--color-flood)]" />
        {t.canalLevel}
      </div>

      <div className="mt-3 space-y-3">
        {canals.map((c) => {
          const pct = Math.min(100, (c.levelM / c.warningM) * 100);
          const near = pct >= 85;
          return (
            <div key={c.name}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">{c.name}</span>
                <span
                  className={near ? "font-semibold text-[var(--color-warn)]" : "text-slate-400"}
                >
                  {c.levelM.toFixed(2)} / {c.warningM.toFixed(2)} m
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: near
                      ? "linear-gradient(90deg, var(--color-warn), var(--color-danger))"
                      : "linear-gradient(90deg, var(--color-flood), var(--color-rain))",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 text-[10px] text-slate-500">{t.warningLevel} · ongoing monitoring</p>
    </section>
  );
}
