/**
 * WindField.tsx —— 风场流线可视化（对标 Windy）
 *
 * 做法：在风场网格上做粒子流线积分（RK1 欧拉推进），
 * 每个粒子的去向由双线性插值出的风向决定，
 * 把轨迹聚合成 path 一次性绘制，配合 CSS 动画产生「流动」质感。
 *
 * 纯 SVG + 纯计算，无 canvas、无第三方。粒子数可控以保证移动端流畅。
 */
import { useMemo } from "react";
import { Wind } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import {
  buildWindField,
  windDirectionKey,
  type WeatherModel,
} from "../mock/weatherData.js";

interface Props {
  model: WeatherModel;
  /** 风速 km/h，用于标题显示 */
  windKmh: number;
  windDeg: number;
  className?: string;
}

const VB_W = 320;
const VB_H = 150;
const PARTICLES = 46;
const STEPS = 22;
const STEP_LEN = 7;

/** 双线性插值取值：给定归一化坐标 (u,v) 返回 [dirDeg, speed] */
function sample(
  field: ReturnType<typeof buildWindField>,
  u: number,
  v: number,
): [number, number] {
  const { rows, cols, dirs, speeds } = field;
  const x = Math.min(cols - 1.001, Math.max(0, u * (cols - 1)));
  const y = Math.min(rows - 1.001, Math.max(0, v * (rows - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;

  const idx = (r: number, c: number) => r * cols + c;
  const w = [
    (1 - fx) * (1 - fy),
    fx * (1 - fy),
    (1 - fx) * fy,
    fx * fy,
  ];
  const ids = [
    idx(y0, x0),
    idx(y0, x0 + 1),
    idx(y0 + 1, x0),
    idx(y0 + 1, x0 + 1),
  ];

  let d = 0;
  let s = 0;
  for (let i = 0; i < 4; i++) {
    d += dirs[ids[i]] * w[i];
    s += speeds[ids[i]] * w[i];
  }
  return [d, s];
}

/** 确定性伪随机：保证每次渲染粒子分布一致，避免闪烁 */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function WindField({ model, windKmh, windDeg, className }: Props) {
  const { t } = useTranslation();

  const { paths, dirKey } = useMemo(() => {
    const field = buildWindField(7, 9, model);
    const out: string[] = [];

    for (let p = 0; p < PARTICLES; p++) {
      // 起始点：低差异分布
      let u = rand(p * 3.1);
      let v = rand(p * 7.7 + 1.3);

      let d = "";

      for (let s = 0; s < STEPS; s++) {
        const [dirDeg, speed] = sample(field, u, v);
        // 风向为「来向」，流动方向为反向
        const rad = ((dirDeg + 180) * Math.PI) / 180;
        const x = u * VB_W;
        const y = v * VB_H;

        d += s === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;

        // 步长随风速缩放（风速大的地方轨迹更长）
        const scale = STEP_LEN * (0.55 + (speed / 30) * 0.9);
        u += (Math.cos(rad) * scale) / VB_W;
        v += (Math.sin(rad) * scale) / VB_H;

        // 出界即止
        if (u < -0.05 || u > 1.05 || v < -0.05 || v > 1.05) break;
      }

      out.push(d);
    }

    return { paths: out, dirKey: windDirectionKey(windDeg) };
  }, [model, windDeg]);

  return (
    <section className={`glass animate-float-in overflow-hidden rounded-2xl p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-slate-100">
          <Wind className="h-4 w-4 shrink-0 text-[var(--color-flood)]" />
          <span className="truncate">{t.windField}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
            {windKmh} km/h · {dirKey}
          </span>
          <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] font-semibold text-violet-200">
            {model}
          </span>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl bg-black/25">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="h-[150px] w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="windStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
              <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="windBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b1a33" />
              <stop offset="100%" stopColor="#070d1c" />
            </linearGradient>
          </defs>

          <rect width={VB_W} height={VB_H} fill="url(#windBg)" />

          {/* 经纬网格，增强「地图」观感 */}
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={`gx${i}`}
              x1={(VB_W / 8) * (i + 1)} y1="0" x2={(VB_W / 8) * (i + 1)} y2={VB_H}
              stroke="rgba(56,189,248,0.06)" strokeWidth="1"
            />
          ))}
          {Array.from({ length: 4 }, (_, i) => (
            <line
              key={`gy${i}`}
              x1="0" y1={(VB_H / 4) * (i + 1)} x2={VB_W} y2={(VB_H / 4) * (i + 1)}
              stroke="rgba(56,189,248,0.06)" strokeWidth="1"
            />
          ))}

          <g
            fill="none"
            stroke="url(#windStroke)"
            strokeWidth="1.15"
            strokeLinecap="round"
            style={{ animation: "windDrift 9s linear infinite" }}
          >
            {paths.map((d, i) => (
              <path key={i} d={d} opacity={0.35 + (i % 5) * 0.12} />
            ))}
          </g>
        </svg>
      </div>

      <p className="mt-2 text-[9.5px] text-slate-500">{t.modelNote}</p>
    </section>
  );
}
