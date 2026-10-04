/**
 * App.tsx —— Bangkok FloodNav 移动端原型主界面（阶段 3 版）
 *
 * 数据管道：适配器(BMA/JS100) + Mock 初始 -> FloodStore
 *          -> 定时 decayCheck -> 风险评估 -> UI
 * 交互：车型切换重算 / 众包上报 / 反向退水投票
 */
import { useMemo, useState } from "react";
import { CloudRain, Droplets, Plus, Zap } from "lucide-react";
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
import {
  CrowdReportModal,
  CrowdReportPayload,
} from "./components/CrowdReportModal.js";
import { FloodStoreProvider, useFloodStore } from "./store/floodStore.js";

interface EvaluatedRoute {
  route: (typeof DEMO_ROUTES)[number];
  risk: RouteRiskResult;
}

const RISK_RANK: Record<RouteRiskResult["overallRisk"], number> = {
  IMPASSABLE: 3,
  WARNING: 2,
  SAFE: 1,
};

/** 主界面（消费 FloodStore） */
function FloodNavApp() {
  const { floods, voteCleared, addCrowdReport } = useFloodStore();
  const [vehicle, setVehicle] = useState<VehicleType>(VehicleType.SEDAN);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  // 时间锚点：演示环境固定为 DEMO_NOW，保证半衰期结果可复现
  const now = DEMO_NOW;

  // 机型或积水集变化时重算全部路线
  const evaluated: EvaluatedRoute[] = useMemo(
    () =>
      DEMO_ROUTES.map((route) => ({
        route,
        risk: evaluateRoute(
          route.polyline,
          floods,
          vehicle,
          now,
          DETOUR_CANDIDATES,
        ),
      })),
    [floods, vehicle, now],
  );

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

  const handleSubmitReport = (payload: CrowdReportPayload) => {
    // 众包点落在起点与终点之间的中间位置附近（演示用）
    const midLat = (ORIGIN[0] + DESTINATION[0]) / 2;
    const midLng = (ORIGIN[1] + DESTINATION[1]) / 2;
    addCrowdReport({
      latitude: midLat,
      longitude: midLng,
      waterDepthCm: payload.waterDepthCm,
      description: payload.description || "用户众包上报",
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      {/* Header */}
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

      {/* 主体 */}
      <main className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-4">
        <section>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            <Zap className="h-3 w-3" /> 选择车型 · 即时重算
          </div>
          <VehicleSelector value={vehicle} onChange={setVehicle} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              路线风险对比
            </h2>
            <span className="text-[10.5px] text-slate-500">
              当前积水点 {floods.length} 处
            </span>
          </div>
          {evaluated.map(({ route, risk }) => (
            <RouteCard
              key={route.id}
              route={route}
              risk={risk}
              selected={active.route.id === route.id}
              onSelect={() => setSelectedId(route.id)}
              now={now}
              onVoteCleared={voteCleared}
            />
          ))}
        </section>

        <WaypointPanel
          waypoints={active.risk.avoidanceWaypoints as LatLng[]}
          originName={ORIGIN_NAME}
          destinationName={DESTINATION_NAME}
        />
      </main>

      {/* 悬浮上报按钮 */}
      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="fixed bottom-40 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 text-slate-950 shadow-xl shadow-cyan-500/30 transition-transform hover:scale-105 active:scale-95"
        style={{ animation: "pulseGlow 2.4s ease-in-out infinite" }}
        aria-label="上报积水"
      >
        <Plus className="h-6 w-6" strokeWidth={2.8} />
      </button>

      <ActionBar
        onGoogle={() => handleLaunch("google")}
        onWaze={() => handleLaunch("waze")}
        onApple={() => handleLaunch("apple")}
        disabled={blockedSelected}
        disabledHint="当前选中路线存在阻断积水，请先选择安全路线再导航"
      />

      <CrowdReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={handleSubmitReport}
        locationLabel={`${ORIGIN_NAME} 至 ${DESTINATION_NAME} 沿线`}
      />
    </div>
  );
}

/** 根组件：注入 FloodStore（初始数据来自 Mock） */
export default function App() {
  return (
    <FloodStoreProvider initialFloods={FLOOD_EVENTS}>
      <FloodNavApp />
    </FloodStoreProvider>
  );
}
