/**
 * ActionBar.tsx —— 底部常驻行动栏（i18n 版）
 */
import { Info, MapPin, Navigation } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";

interface Props {
  onGoogle: () => void;
  onWaze: () => void;
  onApple: () => void;
  disabled?: boolean;
  disabledHint?: string;
}

export function ActionBar({ onGoogle, onWaze, onApple, disabled = false }: Props) {
  const { t } = useTranslation();

  return (
    <div className="glass sticky bottom-0 z-20 rounded-t-2xl px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
      <button
        type="button"
        disabled={disabled}
        onClick={onGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3.5 text-[15px] font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Navigation className="h-4 w-4" />
        {t.navGoogle}
      </button>

      {disabled && (
        <p className="mt-2 text-center text-[11px] text-red-300/90">
          {t.blockedNavHint}
        </p>
      )}

      <div className="mt-2.5 flex gap-2.5">
        <button
          type="button"
          onClick={onWaze}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-edge)] bg-white/5 px-3 py-2.5 text-[13px] font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          <MapPin className="h-4 w-4 text-cyan-400" />
          {t.navWaze}
        </button>
        <button
          type="button"
          onClick={onApple}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-edge)] bg-white/5 px-3 py-2.5 text-[13px] font-semibold text-slate-200 transition-colors hover:bg-white/10"
        >
          <MapPin className="h-4 w-4 text-slate-300" />
          {t.navApple}
        </button>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        {t.disclaimer}
      </p>
    </div>
  );
}
