/**
 * PwsPanel.tsx —— 众包气象站网络（对标 Weather Underground）
 *
 * 把平台内已有的 CROWD 上报数据复用为「个人气象站」，
 * 展示最近站点的实测水深/降雨，形成街区块级精度。
 *
 * 与 WU 的差异：WU 只有气象读数，这里额外带「水深」—— 
 * 这是本项目独有的维度。
 */
import { Radio, WifiOff } from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import { haversineMeters } from "../engine/routeRiskEvaluator.js";
import type { FloodEvent } from "../domain/floodEvent.js";
import type { LatLng } from "../engine/routeRiskEvaluator.js";

interface Props {
  /** 全部积水事件，内部筛选 CROWD 来源作为「众包站」 */
  floods: FloodEvent[];
  /** 参考点（用户的起点/定位），用于计算距离；无则不显示距离 */
  reference?: LatLng | null;
}

/** 相对时间（分钟 -> 可读文本） */
function ageText(
  reportedAt: Date,
  now: Date,
  t: { justNow: string; minutesAgo: (n: number) => string; hoursAgo: (n: number) => string },
): string {
  const min = Math.max(0, Math.round((now.getTime() - reportedAt.getTime()) / 60000));
  if (min < 1) return t.justNow;
  if (min < 60) return t.minutesAgo(min);
  return t.hoursAgo(Math.round(min / 60));
}

export function PwsPanel({ floods, reference }: Props) {
  const { t } = useTranslation();
  const now = new Date();

  const stations = floods
    .filter((f) => f.source === "CROWD")
    .map((f) => ({
      flood: f,
      dist: reference ? haversineMeters(reference, [f.latitude, f.longitude]) : null,
    }))
    .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
    .slice(0, 4);

  return (
    <section className="glass animate-float-in rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-slate-100">
          <Radio className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="truncate">{t.pwsNetwork}</span>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
          {t.pwsStations(stations.length)}
        </span>
      </div>

      {stations.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-black/20 px-3 py-3 text-[11.5px] text-slate-500">
          <WifiOff className="h-3.5 w-3.5" />
          {t.pwsOffline}
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {stations.map(({ flood, dist }, i) => (
            <li
              key={flood.id}
              className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2"
            >
              {/* 信号强度指示 */}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/12">
                <Radio className="h-3.5 w-3.5 text-emerald-300" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[11.5px] font-medium text-slate-100">
                    {i === 0 ? t.pwsNearest : `PWS-${(i + 1).toString().padStart(2, "0")}`}
                  </span>
                  {dist !== null && (
                    <span className="shrink-0 rounded bg-white/8 px-1.5 py-0.5 text-[9px] text-slate-400">
                      {dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                  {flood.description ?? "—"}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-[12px] font-bold text-cyan-300">
                  {flood.waterDepthCm}
                  <span className="text-[9px] font-normal text-slate-500"> cm</span>
                </span>
                <span className="block text-[9px] text-slate-500">
                  {ageText(flood.reportedAt, now, t)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2.5 text-[9.5px] text-slate-500">
        {t.pwsMeasured} · {t.sourceCrowd}
      </p>
    </section>
  );
}
