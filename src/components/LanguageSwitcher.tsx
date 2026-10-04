/**
 * LanguageSwitcher.tsx —— Header 紧凑语言切换（TH / EN / CN）
 */
import { Languages } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import { LANGUAGES } from "../i18n/types.js";

export function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-[var(--color-edge)] bg-black/30 p-0.5">
      <Languages className="mx-1 h-3 w-3 text-slate-500" />
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
            lang === l.code
              ? "bg-cyan-500/20 text-cyan-300"
              : "text-slate-500 hover:text-slate-300"
          }`}
          aria-pressed={lang === l.code}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
