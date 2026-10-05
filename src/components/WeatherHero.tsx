/**
 * WeatherHero.tsx —— 天气主卡（视觉强化版）
 */
import { CloudRain, Droplets, Gauge, Wind } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import { CurrentWeather, type HourlyRain } from "../mock/weatherData.js";

interface Props {
  weather: CurrentWeather;
  hourly: HourlyRain[];
  riskIndex: number;
}

function riskColor(idx: number): string {
  if (idx >= 70) return "#ff6b7a";
  if (idx >= 40) return "#fbbf24";
  return "#34d399";
}

export function WeatherHero({ weather, hourly, riskIndex }: Props) {
  const { t } = useTranslation();

  const conditionLabel =
    weather.condition === "heavyRain"
      ? t.condHeavyRain
      : weather.condition === "rain"
        ? t.condRain
        : t.condCloudy;

  const maxIntensity = Math.max(...hourly.map((h) => h.intensity), 1);

  return (
    <section className="weather-hero animate-float-in relative overflow-hidden rounded-3xl px-5 pb-5 pt-5">
      {/* 雨丝装饰 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(112deg, #bae6fd 0 1.2px, transparent 1.2px 10px)",
        }}
      />
      {/* 顶部高光 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, #38bdf8, transparent 70%)" }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-start gap-1">
            <span className="text-[64px] font-thin leading-[0.9] tracking-tighter text-white drop-shadow-lg">
              {weather.tempC}
            </span>
            <span className="mt-2 text-2xl font-thin text-white/70">°C</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <CloudRain className="h-[18px] w-[18px] text-sky-300" />
            <span className="text-[16px] font-semibold text-white">
              {conditionLabel}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-sky-100/60">
            {t.feelsLike} {weather.feelsLikeC}°C
          </p>
        </div>

        {/* 积水风险指数环 */}
        <div className="flex flex-col items-center">
          <div className="relative flex h-[80px] w-[80px] items-center justify-center">
            <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
              <circle cx="40" cy="40" r="33" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
              <circle
                cx="40" cy="40" r="33" fill="none"
                stroke={riskColor(riskIndex)} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${(riskIndex / 100) * 207.3} 207.3`}
                style={{ filter: `drop-shadow(0 0 6px ${riskColor(riskIndex)})` }}
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-[22px] font-bold leading-none" style={{ color: riskColor(riskIndex) }}>
                {riskIndex}
              </span>
              <span className="mt-0.5 text-[8px] font-medium uppercase tracking-wider text-white/50">
                RISK
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 风险指数说明 */}
      <p className="relative mt-2 text-right text-[10px] text-sky-100/45">
        {t.floodRiskIndex}
      </p>

      {/* 关键指标 */}
      <div className="relative mt-3 grid grid-cols-3 gap-2">
        <Metric icon={<Droplets className="h-3.5 w-3.5" />} label={t.rainChance} value={`${weather.rainChance}%`} />
        <Metric icon={<Wind className="h-3.5 w-3.5" />} label={t.wind} value={`${weather.windKmh} km/h`} />
        <Metric icon={<Gauge className="h-3.5 w-3.5" />} label={t.humidity} value={`${weather.humidity}%`} />
      </div>

      {/* 逐时降雨 */}
      <div className="relative mt-4 rounded-2xl bg-black/20 p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-sky-100/50">
            {t.hourlyRain}
          </span>
          <span className="rounded-full bg-sky-400/20 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
            {weather.rainMmLastHour} mm/h
          </span>
        </div>
        <div className="flex items-end justify-between gap-1.5">
          {hourly.map((h) => (
            <div key={h.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[9px] font-semibold text-sky-200/90">{h.chance}%</span>
              <div className="flex h-[52px] w-full items-end justify-center">
                <div
                  className="rain-bar w-full shadow-lg shadow-sky-500/30"
                  style={{ height: `${Math.max(10, (h.intensity / maxIntensity) * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-sky-100/40">{h.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-1 text-sky-100/50">
        {icon}
        <span className="text-[9px] leading-none">{label}</span>
      </div>
      <div className="mt-1 text-[13px] font-bold text-white">{value}</div>
    </div>
  );
}
