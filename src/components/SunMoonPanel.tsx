/**
 * SunMoonPanel.tsx —— 日出日落与月相
 *
 * 月相用 SVG 双圆遮罩绘制，按 phase 精确渲染盈亏形状。
 */
import { Sunrise, Sunset } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import { moonPhaseKey, type SunMoon } from "../mock/weatherData.js";

interface Props {
  data: SunMoon;
}

/** "HH:mm" -> 分钟数 */
function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function SunMoonPanel({ data }: Props) {
  const { t } = useTranslation();

  const dayMin = Math.max(0, toMin(data.sunset) - toMin(data.sunrise));
  const dayH = Math.floor(dayMin / 60);
  const dayM = dayMin % 60;

  const moonKey = moonPhaseKey(data.moonPhase);
  const moonLabel: Record<typeof moonKey, string> = {
    new: t.moonNew,
    waxingCrescent: t.moonWaxingCrescent,
    firstQuarter: t.moonFirstQuarter,
    waxingGibbous: t.moonWaxingGibbous,
    full: t.moonFull,
    waningGibbous: t.moonWaningGibbous,
    lastQuarter: t.moonLastQuarter,
    waningCrescent: t.moonWaningCrescent,
  };

  const illumination = Math.round(Math.abs(Math.cos(data.moonPhase * Math.PI * 2)) * 100);

  return (
    <section className="glass animate-float-in rounded-2xl p-4">
      <div className="grid grid-cols-3 gap-3">
        <Item icon={<Sunrise className="h-4 w-4 text-amber-300" />} label={t.sunrise} value={data.sunrise} />
        <Item icon={<Sunset className="h-4 w-4 text-orange-400" />} label={t.sunset} value={data.sunset} />

        {/* 月相 */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 40 40" className="h-6 w-6">
            <defs>
              <clipPath id="moonClip">
                <circle cx="20" cy="20" r="14" />
              </clipPath>
            </defs>
            {/* 暗面 */}
            <circle cx="20" cy="20" r="14" fill="#0f1a33" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            {/* 亮面：用椭圆横向缩放模拟盈亏 */}
            <g clipPath="url(#moonClip)">
              <ellipse
                cx="20" cy="20"
                rx={Math.abs(14 * (2 * data.moonPhase - 1))}
                ry="14"
                fill="#e2e8f5"
              />
            </g>
          </svg>
          <span className="mt-0.5 text-[8.5px] uppercase tracking-wide text-slate-400">
            {t.moonPhase}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-2.5 text-[10px]">
        <span className="text-slate-400">{moonLabel[moonKey]}</span>
        <span className="text-slate-300">
          {illumination}% · {t.daylight} {dayH}h {dayM}m
        </span>
      </div>
    </section>
  );
}

function Item({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center">
      {icon}
      <span className="mt-1 text-[12px] font-bold text-slate-100">{value}</span>
      <span className="text-[8.5px] uppercase tracking-wide text-slate-400">{label}</span>
    </div>
  );
}
