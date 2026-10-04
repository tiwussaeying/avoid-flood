/**
 * App.tsx —— Bangkok FloodNav 移动端原型主界面
 *
 * 流程：
 *   车型切换 -> 对两条候选路线重算风险 -> 展示对比卡片
 *   -> 选中路线 -> 底部行动栏组装带 Waypoints 的链接并唤起外部地图
 */
import { useMemo, useState } from "react";
import { CloudRain, Droplets, Zap } from "lucide-react";
import { VehicleType } from "./domain/vehicle.js";
import {
  evaluateRoute,
  LatLng,
  RouteRiskResult,
} from "./engine/routeRiskEvaluator.js";
import {
  DEMO_NOW,
  DEMO_ROUTES,
  DESTINATION,
  DESTINATION_NAME,
  DETOUR_CANDIDATES,
  FLOOD_EVENTS,
  ORIGIN,
  ORIGIN_NAME,
} from "./mock/bangkokDemoData.js";
import { launchNavigation, NavProvider } from "./services/navLauncher.js";
import { VehicleSelector } from "./components/VehicleSelector.js";
import { RouteCard } from "./components/RouteCard.js";
import { WaypointPanel } from "./components/WaypointPanel.js";
import { ActionBar } from "./components/ActionBar.js";

interface EvaluatedRoute {
  route: (typeof DEMO_ROUTES)[number];
  risk: RouteRiskResult;
}

const RISK_RANK: Record<RouteRiskResult["overallRisk"], number> = {
  IMPASSABLE: 3,
  WARNING: 2,
  SAFE: 1,
};

export default function App() {
  const [vehicle, setVehicle] = useState<VehicleType>(VehicleType.SEDAN);
  // 默认选中「风险最高」的路线，以便直观呈现主路阻断效果；
  // 用户点击其他卡片后，selectedId 变为显式选择。
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 机型变化时重算全部路线（纯函数，无副作用）
  const evaluated: EvaluatedRoute[] = useMemo(
    () =>
      DEMO_ROUTES.map((route) => ({
        route,
        risk: evaluateRoute(
          route.polyline,
          FLOOD_EVENTS,
          vehicle,
          DEMO_NOW,
          DETOUR_CANDIDATES,
        ),
      })),
    [vehicle],
  );

  // 最终用于展示与导航的路线
  const active = useMemo(() => {
    if (selectedId) {
      const chosen = evaluated.find((e) => e.route.id === selectedId);
      if (chosen) return chosen;
    }
    return [...evaluated].sort(
      (a, b) => RISK_RANK[b.risk.overallRisk] - RISK_RANK[a.risk.overallRisk],
    )[0];
  }, [evaluated, selectedId]);

  const blockedSelected = active.risk.overallRisk === "IMPASSABLE";

  // 组装导航参数：使用当前路线的安全绕行途经点
  const navRoute = useMemo(
    () => ({
      origin: ORIGIN,
      destination: DESTINATION,
      waypoints: active.risk.avoidanceWaypoints as LatLng[],
    }),
    [active],
  );

  const handleLaunch = (provider: NavProvider) => {
    if (blockedSelected) return;
    launchNavigation(provider, navRoute);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      {/* Header —— 深色毛玻璃 */}
      <header className="glass sticky top-0 z-20 px-4 pb-3.5 pt-[max(14px,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 shadow-lg shadow-cyan-500/25">
              <Droplets className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold leading-tight tracking-tight text-white">
                Bangkok FloodNav
              </h1>
              <p className="text-[10.5px] leading-tight text-slate-400">
                暴雨避水路线规划
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/12 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
            <CloudRain className="h-3.5 w-3.5" />
            暴雨预警
          </span>
        </div>
      </header>

      {/* 主体滚动区 */}
      <main className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-4">
        {/* 车型切换 */}
        <section>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            <Zap className="h-3 w-3" /> 选择车型 · 即时重算
          </div>
          <VehicleSelector value={vehicle} onChange={setVehicle} />
        </section>

        {/* 路线对比 */}
        <section className="space-y-3">
          <h2 className="px-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            路线风险对比
          </h2>
          {evaluated.map(({ route, risk }) => (
            <RouteCard
              key={route.id}
              route={route}
              risk={risk}
              selected={active.route.id === route.id}
              onSelect={() => setSelectedId(route.id)}
            />
          ))}
        </section>

        {/* 避险途经点 */}
        <WaypointPanel
          waypoints={active.risk.avoidanceWaypoints as LatLng[]}
          originName={ORIGIN_NAME}
          destinationName={DESTINATION_NAME}
        />
      </main>

      {/* 底部行动栏 */}
      <ActionBar
        onGoogle={() => handleLaunch("google")}
        onWaze={() => handleLaunch("waze")}
        onApple={() => handleLaunch("apple")}
        disabled={blockedSelected}
        disabledHint="当前选中路线存在阻断积水，请先选择安全路线再导航"
      />
    </div>
  );
}
