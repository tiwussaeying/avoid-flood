/**
 * ModelSwitcher.tsx —— 气象模型切换（对标 Windy 多模型对比）
 *
 * 泰国 TMD / 美国 GFS / 欧洲 ECMWF / 德国 ICON 四个主流模型，
 * 让专业用户对比不同机构的预报分歧。
 */
import { Layers } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import type { WeatherModel } from "../mock/weatherData.js";

interface Props {
  value: WeatherModel;
  onChange: (m: WeatherModel) => void;
}

const MODELS: WeatherModel[] = ["TMD", "GFS", "ECMWF", "ICON"];

export function ModelSwitcher({ value, onChange }: Props) {
  const { t } = useTranslation();

  const label: Record<WeatherModel, string> = {
    TMD: t.modelTmd,
    GFS: t.modelGfs,
    ECMWF: t.modelEcmwf,
    ICON: t.modelIcon,
  };

  return (
    <section className="glass animate-float-in rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wider text-white/40">
        <Layers className="h-3 w-3" />
        {t.weatherModel}
      </div>

      <div className="flex gap-1.5 rounded-xl bg-black/25 p-1">
        {MODELS.map((m) => {
          const active = m === value;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-[11.5px] font-semibold transition-all duration-200 ${
                active
                  ? "bg-gradient-to-br from-[var(--color-rain)] to-[var(--color-storm)] text-white shadow-lg shadow-sky-500/25"
                  : "text-slate-400 hover:bg-white/6 hover:text-slate-200"
              }`}
            >
              {label[m]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
