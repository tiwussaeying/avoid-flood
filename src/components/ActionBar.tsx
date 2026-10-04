/**
 * ActionBar.tsx —— 底部常驻行动栏（一键调起地图导航 + 免责声明）
 */
import { Info, Navigation, MapPin } from "lucide-react";

interface Props {
  onGoogle: () => void;
  onWaze: () => void;
  onApple: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

export function ActionBar({
  onGoogle,
  onWaze,
  onApple,
  disabled = false,
  disabledHint,
}: Props) {
  return (
    <div className="glass sticky bottom-0 z-20 rounded-t-2xl px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
      <button
        type="button"
        disabled={disabled}
        onClick={onGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3.5 text-[15px] font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Navigation className="h-4.5 w-4.5" />
        一键调起 Google Maps 避水导航
      </button>

      {disabled && disabledHint && (
        <p className="mt-2 text-center text-[11px] text-red-300/90">
          {disabledHint}
        </p>
      )}

      <div className="mt-2.5 flex gap-2.5">
        <button
          type="button"
          onClick={onWaze}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-edge)] bg-white/5 px-3 py-2.5 text-[13px] font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          <MapPin className="h-4 w-4 text-cyan-400" />
          唤起 Waze
        </button>
        <button
          type="button"
          onClick={onApple}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-edge)] bg-white/5 px-3 py-2.5 text-[13px] font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          <MapPin className="h-4 w-4 text-slate-300" />
          Apple 地图
        </button>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        水位数据为动态估算值，仅供参考，可能滞后于现场实际。请服从现场交警指挥，
        <strong className="text-slate-400">严禁强行涉水</strong>，注意人身安全。
      </p>
    </div>
  );
}
