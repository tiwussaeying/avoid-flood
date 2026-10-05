/**
 * MinuteRainChart.tsx —— 分钟级降水曲线（对标 Apple Weather Next Hour）
 *
 * 特性：
 *   - 过去 30 分钟实测 + 未来 60 分钟预测，连成一条连续曲线
 *   - 当前位置竖线分隔「实测 / 预测」
 *   - 渐变面积填充，随强度变色
 *   - 雨势拐点文案（如「25 分钟后雨停」）
 *   - 纯 SVG，零依赖，可离线渲染
 */
import { useMemo } from "react";
import { CloudRain, CloudSun, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import {
  findRainTurningPoint,
  type MinuteRain,
} from "../mock/weatherData.js";

interface Props {
  series: MinuteRain[];
}

const W = 340;
const H = 96;
const PAD_X = 6;
const PAD_TOP = 10;
const PAD_BOTTOM = 18;

export function MinuteRainChart({ series }: Props) {
  const { t } = useTranslation();

  const turning = useMemo(() => findRainTurningPoint(series), [series]);

  const { path, area, points, maxMm, zeroX, maxIdx } = useMemo(() => {
    if (series.length === 0) {
      return { path: "", area: "", points: [], maxMm: 1, zeroX: 0, maxIdx: 0 };
    }

    const max = Math.max(...series.map((s) => s.mmPerHour), 1);
    const minOff = series[0].offsetMin;
    const maxOff = series[series.length - 1].offsetMin;
    const span = Math.max(1, maxOff - minOff);

    const toX = (off: number) =>
      PAD_X + ((off - minOff) / span) * (W - PAD_X * 2);
    const toY = (mm: number) =>
      H - PAD_BOTTOM - (mm / max) * (H - PAD_BOTTOM - PAD_TOP);

    const pts = series.map((s) => ({
      x: toX(s.offsetMin),
      y: toY(s.mmPerHour),
      mm: s.mmPerHour,
      off: s.offsetMin,
    }));

    // 用三次贝塞尔平滑折线，避免尖锐锯齿
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const cx = (a.x + b.x) / 2;
      d += ` C ${cx.toFixed(2)} ${a.y.toFixed(2)}, ${cx.toFixed(2)} ${b.y.toFixed(2)}, ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
    }

    const areaPath =
      `${d} L ${pts[pts.length - 1].x.toFixed(2)} ${H - PAD_BOTTOM} L ${pts[0].x.toFixed(2)} ${H - PAD_BOTTOM} Z`;

    // offset = 0 的位置 x
    const zero = toX(0);
    const peakIdx = series.reduce(
      (best, s, i) => (s.mmPerHour > series[best].mmPerHour ? i : best),
      0,
    );

    return { path: d, area: areaPath, points: pts, maxMm: max, zeroX: zero, maxIdx: peakIdx };
  }, [series]);

  if (series.length === 0) return null;

  // 拐点文案
  const turningText = (() => {
    switch (turning.kind) {
      case "stopping":
        return t.rainStoppingIn(turning.inMinutes);
      case "starting":
        return t.rainStartingIn(turning.inMinutes);
      case "peaking":
        return t.rainPeakingIn(turning.inMinutes);
      default:
        return t.rainSteady;
    }
  })();

  const TurningIcon =
    turning.kind === "stopping"
      ? TrendingDown
      : turning.kind === "starting" || turning.kind === "peaking"
        ? TrendingUp
        : CloudSun;

  const turningColor =
    turning.kind === "stopping"
      ? "text-emerald-300"
      : turning.kind === "peaking"
        ? "text-amber-300"
        : "text-sky-300";

  const currentMm = series.find((s) => s.offsetMin === 0)?.mmPerHour ?? series[0].mmPerHour;
  const intensityLabel =
    currentMm >= 20 ? t.rainIntense : currentMm >= 5 ? t.rainModerate : currentMm >= 1 ? t.rainLight : t.rainNone;

  return (
    <section className="glass animate-float-in rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-slate-100">
          <CloudRain className="h-4 w-4 shrink-0 text-[var(--color-rain)]" />
          <span className="truncate">{t.minuteRain}</span>
        </div>
        <span className="shrink-0 rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
          {currentMm.toFixed(1)} mm/h · {intensityLabel}
        </span>
      </div>

      {/* 拐点提示 */}
      <div className={`mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold ${turningColor}`}>
        <TurningIcon className="h-3.5 w-3.5" />
        {turningText}
      </div>

      {/* 曲线 */}
      <div className="mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[96px] w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="minuteFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="minuteStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="55%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>

          {/* 基线 */}
          <line
            x1={PAD_X} y1={H - PAD_BOTTOM} x2={W - PAD_X} y2={H - PAD_BOTTOM}
            stroke="rgba(255,255,255,0.10)" strokeWidth="1"
          />

          {/* 预测区背景 */}
          <rect
            x={zeroX} y={PAD_TOP}
            width={W - PAD_X - zeroX} height={H - PAD_BOTTOM - PAD_TOP}
            fill="rgba(167,139,250,0.06)"
          />

          <path d={area} fill="url(#minuteFill)" />
          <path d={path} fill="none" stroke="url(#minuteStroke)" strokeWidth="2.2" strokeLinecap="round" />

          {/* 峰值标记 */}
          {points[maxIdx] && (
            <circle cx={points[maxIdx].x} cy={points[maxIdx].y} r="2.6" fill="#a78bfa" />
          )}

          {/* 当前时刻竖线 */}
          <line
            x1={zeroX} y1={PAD_TOP} x2={zeroX} y2={H - PAD_BOTTOM}
            stroke="rgba(255,255,255,0.42)" strokeWidth="1.2" strokeDasharray="3 3"
          />
          <text x={zeroX} y={H - 5} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.55)">
            {t.nowLabel}
          </text>

          <text x={PAD_X} y={H - 5} fontSize="9" fill="rgba(255,255,255,0.34)">
            -30m
          </text>
          <text x={W - PAD_X} y={H - 5} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.34)">
            +60m
          </text>
        </svg>
      </div>

      <div className="mt-1 flex items-center justify-between text-[9.5px] text-slate-500">
        <span>{t.pastMeasured}</span>
        <span>{t.futureForecast} · max {maxMm.toFixed(1)} mm/h</span>
      </div>
    </section>
  );
}
