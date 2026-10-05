/**
 * TimelineScrubber.tsx —— 时间轴拖拽（对标 Windy / Apple Weather）
 *
 * 用户可拖拽滑块在 -6h ~ +6h 之间浏览降水演变，
 * 并可切换自动播放，直观看到「水在涨还是在退」。
 */
import { useEffect } from "react";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";

interface Props {
  /** 当前偏移小时，负=过去，正=未来 */
  value: number;
  /** 范围（绝对值），如 6 表示 -6~+6 */
  range?: number;
  onChange: (v: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
}

export function TimelineScrubber({
  value,
  range = 6,
  onChange,
  playing,
  onTogglePlay,
}: Props) {
  const { t } = useTranslation();

  // 自动播放：每 700ms 前进 0.5 小时，到顶回绕
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      onChange(value >= range ? -range : Math.round((value + 0.5) * 2) / 2);
    }, 700);
    return () => window.clearInterval(id);
  }, [playing, value, range, onChange]);

  const label =
    value === 0
      ? t.timelineNow
      : value < 0
        ? t.timelinePast(Math.abs(value))
        : t.timelineFuture(value);

  const pct = ((value + range) / (range * 2)) * 100;

  return (
    <section className="glass animate-float-in rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-100">{t.timeline}</span>
        <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[10.5px] font-semibold text-sky-200">
          {label}
        </span>
      </div>

      <div className="mt-3.5 flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? t.pauseAnimation : t.playAnimation}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-rain)] to-[var(--color-storm)] text-white shadow-lg shadow-sky-500/25 transition-transform hover:scale-105 active:scale-95"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        <div className="relative flex-1">
          {/* 刻度背景 */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-0.5">
            {Array.from({ length: 13 }, (_, i) => (
              <span key={i} className="h-2 w-px bg-white/12" />
            ))}
          </div>

          {/* 当前进度轨 */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-400"
              style={{ width: `${pct}%` }}
            />
          </div>

          <input
            type="range"
            min={-range}
            max={range}
            step={0.5}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="timeline-range relative z-10 w-full"
            aria-label={t.timeline}
          />
        </div>
      </div>

      <div className="mt-1.5 flex justify-between text-[9.5px] text-slate-500">
        <span>{t.timelinePast(range)}</span>
        <span>{t.timelineNow}</span>
        <span>{t.timelineFuture(range)}</span>
      </div>
    </section>
  );
}
