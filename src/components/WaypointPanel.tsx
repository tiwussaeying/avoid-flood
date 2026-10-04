/**
 * WaypointPanel.tsx —— 避险途经点指示区
 */
import { Navigation2, ShieldAlert } from "lucide-react";
import { LatLng } from "../engine/routeRiskEvaluator.js";

interface Props {
  waypoints: LatLng[];
  originName: string;
  destinationName: string;
}

export function WaypointPanel({ waypoints, originName, destinationName }: Props) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-200">
        <ShieldAlert className="h-4 w-4 text-amber-400" />
        避险途经点 (Safe Waypoints)
      </div>

      {waypoints.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">
          当前路线无需额外绕行途经点。
        </p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          <li className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            {originName}（起点）
          </li>
          {waypoints.map((wp, i) => (
            <li
              key={`${wp[0]}-${wp[1]}-${i}`}
              className="flex items-center gap-2 text-xs text-slate-200"
            >
              <Navigation2 className="h-3.5 w-3.5 -rotate-45 text-amber-400" />
              <span className="font-medium text-amber-300">绕行点 {i + 1}</span>
              <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">
                {wp[0].toFixed(4)}, {wp[1].toFixed(4)}
              </code>
            </li>
          ))}
          <li className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {destinationName}（终点）
          </li>
        </ol>
      )}
    </div>
  );
}
