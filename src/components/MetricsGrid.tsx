/**
 * MetricsGrid.tsx —— 综合气象指标网格
 *
 * 对标 The Weather Channel / AccuWeather 的指标面板，
 * 覆盖气压、露点、紫外线、能见度、云量、空气质量。
 */
import {
  Cloud,
  Eye,
  Gauge,
  Leaf,
  Sun,
  Thermometer,
} from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import {
  aqiLevel,
  uvLevel,
  type AirQuality,
  type CurrentWeather,
  type UvLevel,
  type AqiLevel,
} from "../mock/weatherData.js";

interface Props {
  weather: CurrentWeather;
  air: AirQuality;
}

/** AQI 分级配色 */
const AQI_COLOR: Record<AqiLevel, string> = {
  good: "#34d399",
  moderate: "#fbbf24",
  unhealthySensitive: "#fb923c",
  unhealthy: "#fb5c6c",
  veryUnhealthy: "#c084fc",
  hazardous: "#f43f5e",
};

/** 紫外线分级配色 */
const UV_COLOR: Record<UvLevel, string> = {
  low: "#34d399",
  moderate: "#fbbf24",
  high: "#fb923c",
  veryHigh: "#fb5c6c",
  extreme: "#c084fc",
};

export function MetricsGrid({ weather, air }: Props) {
  const { t } = useTranslation();

  const aq = aqiLevel(air.aqi);
  const uv = uvLevel(weather.uvIndex);

  const aqiLabel: Record<AqiLevel, string> = {
    good: t.aqiGood,
    moderate: t.aqiModerate,
    unhealthySensitive: t.aqiUnhealthySensitive,
    unhealthy: t.aqiUnhealthy,
    veryUnhealthy: t.aqiVeryUnhealthy,
    hazardous: t.aqiHazardous,
  };

  const uvLabel: Record<UvLevel, string> = {
    low: t.uvLow,
    moderate: t.uvModerate,
    high: t.uvHigh,
    veryHigh: t.uvVeryHigh,
    extreme: t.uvExtreme,
  };

  return (
    <section className="glass animate-float-in rounded-2xl p-4">
      <div className="grid grid-cols-3 gap-2.5">
        <Cell
          icon={<Gauge className="h-3.5 w-3.5" />}
          label={t.pressure}
          value={`${weather.pressureHpa}`}
          unit="hPa"
        />
        <Cell
          icon={<Thermometer className="h-3.5 w-3.5" />}
          label={t.dewPoint}
          value={`${weather.dewPointC.toFixed(1)}`}
          unit="°C"
        />
        <Cell
          icon={<Eye className="h-3.5 w-3.5" />}
          label={t.visibility}
          value={`${weather.visibilityKm.toFixed(1)}`}
          unit="km"
        />
        <Cell
          icon={<Cloud className="h-3.5 w-3.5" />}
          label={t.cloudCover}
          value={`${weather.cloudCover}`}
          unit="%"
        />
        <Cell
          icon={<Sun className="h-3.5 w-3.5" />}
          label={t.uvIndex}
          value={`${weather.uvIndex}`}
          unit={uvLabel[uv]}
          accent={UV_COLOR[uv]}
        />
        <Cell
          icon={<Leaf className="h-3.5 w-3.5" />}
          label={t.aqi}
          value={`${air.aqi}`}
          unit={aqiLabel[aq]}
          accent={AQI_COLOR[aq]}
        />
      </div>

      {/* 颗粒物细分 */}
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2">
        <span className="text-[10px] text-slate-400">PM2.5</span>
        <span className="text-[11.5px] font-semibold text-slate-200">{air.pm25.toFixed(1)} µg/m³</span>
        <span className="ml-auto text-[10px] text-slate-400">PM10</span>
        <span className="text-[11.5px] font-semibold text-slate-200">{air.pm10.toFixed(1)} µg/m³</span>
      </div>
    </section>
  );
}

function Cell({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.05] px-2.5 py-2.5">
      <div className="flex items-center gap-1 text-slate-400">
        {icon}
        <span className="truncate text-[9px] leading-none">{label}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className="text-[15px] font-bold leading-none"
          style={accent ? { color: accent } : { color: "#eaf1ff" }}
        >
          {value}
        </span>
        <span className="truncate text-[9px] text-slate-500">{unit}</span>
      </div>
    </div>
  );
}
