/**
 * DailyOutlookPanel.tsx —— 未来数日天气预报
 */
import { CloudRain, Sun, Cloud } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import { DailyOutlook } from "../mock/weatherData.js";

interface Props {
  days: DailyOutlook[];
}

export function DailyOutlookPanel({ days }: Props) {
  const { t, lang } = useTranslation();

  const dayLabel = (key: string): string => {
    switch (key) {
      case "today":
        return t.dayToday;
      case "tomorrow":
        return t.dayTomorrow;
      case "d2":
        return t.dayD2;
      default:
        return t.dayD3;
    }
  };

  const Icon = (chance: number) =>
    chance >= 70 ? CloudRain : chance >= 40 ? Cloud : Sun;

  return (
    <section className="glass animate-float-in rounded-2xl p-4">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {t.dailyOutlook}
      </h3>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {days.map((d) => {
          const I = Icon(d.rainChance);
          const wet = d.rainChance >= 70;
          return (
            <div
              key={d.dayKey}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--color-edge)] bg-white/[0.03] px-1 py-2.5"
            >
              <span className="text-[10.5px] text-slate-400">
                {dayLabel(d.dayKey)}
              </span>
              <I
                className="h-5 w-5"
                style={{
                  color: wet ? "var(--color-rain)" : "var(--color-warn)",
                }}
              />
              <span className="text-[9.5px] font-semibold text-[var(--color-rain)]">
                {d.rainChance}%
              </span>
              <span className="text-[10px] text-slate-300">
                {d.lowC}°<span className="text-slate-500">/{d.highC}°</span>
              </span>
            </div>
          );
        })}
      </div>
      {/* lang 用于触发重渲染，保持与语言切换同步 */}
      <span className="hidden">{lang}</span>
    </section>
  );
}
