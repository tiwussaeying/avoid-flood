/**
 * WaypointPanel.tsx —— 避险途经点指示区（i18n 版）
 */
import { Navigation2, ShieldAlert } from "lucide-react";
import { LatLng } from "../engine/routeRiskEvaluator.js";
import { useTranslation } from "../i18n/i18n.js";

interface Props {
  waypoints: LatLng[];
  originName: string;
  destinationName: string;
}

export function WaypointPanel({ waypoints, originName, destinationName }: Props) {
  const { t } = useTranslation();

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
        <ShieldAlert className="h-4 w-4 text-amber-400" />
        {t.safeWaypoints}
      </div>

      {waypoints.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">{t.noWaypoints}</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          <li className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            {originName}（{t.start}）
          </li>
          {waypoints.map((wp, i) => (
            <li
              key={`${wp[0]}-${wp[1]}-${i}`}
              className="flex items-center gap-2 text-xs text-slate-200"
            >
              <Navigation2 className="h-3.5 w-3.5 -rotate-45 text-amber-400" />
              <span className="font-medium text-amber-300">
                {t.detourPoint(i + 1)}
              </span>
              <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">
                {wp[0].toFixed(4)}, {wp[1].toFixed(4)}
              </code>
            </li>
          ))}
          <li className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {destinationName}（{t.end}）
          </li>
        </ol>
      )}
    </div>
  );
}
