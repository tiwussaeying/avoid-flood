/**
 * App.tsx —— Bangkok FloodNav 主界面（气象级 UI 改版）
 *
 * 数据：天气(weatherData) + 积水(FloodStore) → 风险评估 → UI
 * 布局：天空背景 → 天气主卡 → 车型 → 路线对比 → 河道 → 未来天气
 */
import { useMemo, useState } from "react";
import { CloudRain, Plus, Zap } from "lucide-react";
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
import {
  CANAL_LEVELS,
  CURRENT_WEATHER,
  DAILY_OUTLOOK,
  HOURLY_RAIN,
} from "./mock/weatherData.js";
import { launchNavigation, NavProvider } from "./services/navLauncher.js";
import { VehicleSelector } from "./components/VehicleSelector.js";
import { RouteCard } from "./components/RouteCard.js";
import { WaypointPanel } from "./components/WaypointPanel.js";
import { ActionBar } from "./components/ActionBar.js";
import { LanguageSwitcher } from "./components/LanguageSwitcher.js";
import { WeatherHero } from "./components/WeatherHero.js";
import { CanalPanel } from "./components/CanalPanel.js";
import { DailyOutlookPanel } from "./components/DailyOutlookPanel.js";
import {
  CrowdReportModal,
  CrowdReportPayload,
} from "./components/CrowdReportModal.js";
import { FloodStoreProvider, useFloodStore } from "./store/floodStore.js";
import { I18nProvider, useTranslation } from "./i18n/i18n.js";

interface EvaluatedRoute {
  route: (typeof DEMO_ROUTES)[number];
  risk: RouteRiskResult;
}

const RISK_RANK: Record<RouteRiskResult["overallRisk"], number> = {
  IMPASSABLE: 3,
  WARNING: 2,
  SAFE: 1,
};

function FloodNavApp() {
  const { t } = useTranslation();
  const { floods, voteCleared, addCrowdReport } = useFloodStore();
  const [vehicle, setVehicle] = useState<VehicleType>(VehicleType.SEDAN);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const now = DEMO_NOW;

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

  // 积水风险指数：结合降雨强度、活跃积水点数量、当前路线风险
  const riskIndex = useMemo(() => {
    const rainFactor = CURRENT_WEATHER.rainChance;
    const floodFactor = Math.min(100, floods.length * 22);
    const routeFactor =
      active.risk.overallRisk === "IMPASSABLE"
        ? 100
        : active.risk.overallRisk === "WARNING"
          ? 60
          : 25;
    return Math.round(rainFactor * 0.3 + floodFactor * 0.3 + routeFactor * 0.4);
  }, [floods.length, active.risk.overallRisk]);

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
    void launchNavigation(provider, navRoute);
  };

  const handleSubmitReport = (payload: CrowdReportPayload) => {
    const midLat = (ORIGIN[0] + DESTINATION[0]) / 2;
    const midLng = (ORIGIN[1] + DESTINATION[1]) / 2;
    addCrowdReport({
      latitude: midLat,
      longitude: midLng,
      waterDepthCm: payload.waterDepthCm,
      description: payload.description || t.sourceCrowd,
    });
  };

  return (
    <>
      {/* 天空背景层 */}
      <div className="sky-bg" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#080b18]/80 px-4 pb-2.5 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-rain)] to-[var(--color-storm)] shadow-lg shadow-sky-500/30">
                <CloudRain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-bold leading-tight tracking-tight text-white">
                  {t.appName}
                </h1>
                <p className="text-[10.5px] leading-tight text-white/45">
                  {t.appTagline}
                </p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        {/* 主体 */}
        <main className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-2">
          {/* ① 天气主卡（视觉焦点） */}
          <WeatherHero
            weather={CURRENT_WEATHER}
            hourly={HOURLY_RAIN}
            riskIndex={riskIndex}
          />

          {/* ② 车型切换 */}
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
              <Zap className="h-3 w-3" /> {t.selectVehicle}
            </div>
            <VehicleSelector value={vehicle} onChange={setVehicle} />
          </section>

          {/* ③ 路线风险对比 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                {t.routeComparison}
              </h2>
              <span className="text-[10.5px] text-white/35">
                {t.floodPointsNow} {floods.length}
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

          {/* ④ 避险途经点 */}
          <WaypointPanel
            waypoints={active.risk.avoidanceWaypoints as LatLng[]}
            originName={ORIGIN_NAME}
            destinationName={DESTINATION_NAME}
          />

          {/* ⑤ 河道水位 */}
          <CanalPanel canals={CANAL_LEVELS} />

          {/* ⑥ 未来天气 */}
          <DailyOutlookPanel days={DAILY_OUTLOOK} />
        </main>

        {/* 悬浮上报按钮 */}
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="fixed bottom-40 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-flood)] to-[var(--color-rain-deep)] text-white shadow-xl shadow-cyan-500/40 transition-transform hover:scale-105 active:scale-95"
          style={{ animation: "pulseGlow 2.6s ease-in-out infinite" }}
          aria-label={t.reportTitle}
        >
          <Plus className="h-6 w-6" strokeWidth={2.8} />
        </button>

        <ActionBar
          onGoogle={() => handleLaunch("google")}
          onWaze={() => handleLaunch("waze")}
          onApple={() => handleLaunch("apple")}
          disabled={blockedSelected}
        />

        <CrowdReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          onSubmit={handleSubmitReport}
          locationLabel={`${ORIGIN_NAME} → ${DESTINATION_NAME}`}
        />
      </div>
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <FloodStoreProvider initialFloods={FLOOD_EVENTS}>
        <FloodNavApp />
      </FloodStoreProvider>
    </I18nProvider>
  );
}

