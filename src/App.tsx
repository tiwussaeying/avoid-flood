/**
 * App.tsx —— Bangkok FloodNav 主界面
 *
 * 用户流程：选择起终点（搜索/定位） → 动态生成路线 → 评估积水风险 → 导航
 */
import { useCallback, useMemo, useState } from "react";
import { CloudRain, Plus, Zap } from "lucide-react";
import { VehicleType } from "./domain/vehicle.js";
import {
  evaluateRoute,
  findLastSafePoint,
  LatLng,
  RouteRiskResult,
} from "./engine/routeRiskEvaluator.js";
import { DEMO_NOW, FLOOD_EVENTS } from "./mock/bangkokDemoData.js";
import { scaleDepth, rainScaleAt } from "./engine/timelineWater.js";
import { PLACES, type Place } from "./mock/places.js";
import {
  AIR_QUALITY,
  CANAL_LEVELS,
  CURRENT_WEATHER,
  DAILY_OUTLOOK,
  HOURLY_RAIN,
  MINUTE_RAIN,
  SUN_MOON,
  type WeatherModel,
} from "./mock/weatherData.js";
import { buildRoutes, buildDetourCandidates } from "./services/routeBuilder.js";
import { seedFloodsAlongRoute, mergeFloodEvents } from "./services/floodSeeder.js";
import { makeCurrentLocationPlace } from "./services/placeSearch.js";
import { launchNavigation, NavProvider } from "./services/navLauncher.js";
import { VehicleSelector } from "./components/VehicleSelector.js";
import { RouteCard } from "./components/RouteCard.js";
import { WaypointPanel } from "./components/WaypointPanel.js";
import { ActionBar } from "./components/ActionBar.js";
import { LanguageSwitcher } from "./components/LanguageSwitcher.js";
import { WeatherHero } from "./components/WeatherHero.js";
import { CanalPanel } from "./components/CanalPanel.js";
import { DailyOutlookPanel } from "./components/DailyOutlookPanel.js";
import { RouteSearchBar } from "./components/RouteSearchBar.js";
import { MinuteRainChart } from "./components/MinuteRainChart.js";
import { WindField } from "./components/WindField.js";
import { TimelineScrubber } from "./components/TimelineScrubber.js";
import { MetricsGrid } from "./components/MetricsGrid.js";
import { SunMoonPanel } from "./components/SunMoonPanel.js";
import { PwsPanel } from "./components/PwsPanel.js";
import { SevereAlertBanner, type SevereAlert } from "./components/SevereAlertBanner.js";
import { ModelSwitcher } from "./components/ModelSwitcher.js";
import {
  CrowdReportModal,
  CrowdReportPayload,
} from "./components/CrowdReportModal.js";
import { FloodStoreProvider, useFloodStore } from "./store/floodStore.js";
import { I18nProvider, useTranslation } from "./i18n/i18n.js";

const RISK_RANK: Record<RouteRiskResult["overallRisk"], number> = {
  IMPASSABLE: 3,
  WARNING: 2,
  SAFE: 1,
};

/** 默认起终点：曼谷两大地标 */
const DEFAULT_ORIGIN = PLACES.find((p) => p.id === "siam-paragon")!;
const DEFAULT_DEST = PLACES.find((p) => p.id === "bts-thonglo")!;

function FloodNavApp() {
  const { t, lang } = useTranslation();
  const { floods, voteCleared, addCrowdReport } = useFloodStore();

  const [vehicle, setVehicle] = useState<VehicleType>(VehicleType.SEDAN);
  const [origin, setOrigin] = useState<Place | null>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<Place | null>(DEFAULT_DEST);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  /** 时间轴偏移（小时），负=过去 */
  const [hoursOffset, setHoursOffset] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  /** 气象模型（对标 Windy 多模型切换） */
  const [model, setModel] = useState<WeatherModel>("TMD");

  const now = DEMO_NOW;

  const placeLabel = useCallback(
    (p: Place): string =>
      lang === "th" ? p.nameTh : lang === "zh" ? p.nameZh : p.nameEn,
    [lang],
  );

  // ── 动态生成路线（起终点变化时重算） ──
  const builtRoutes = useMemo(() => {
    if (!origin || !destination) return [];
    return buildRoutes(origin.coords, destination.coords);
  }, [origin, destination]);

  const detourCandidates = useMemo(() => {
    if (!origin || !destination) return [];
    return buildDetourCandidates(origin.coords, destination.coords);
  }, [origin, destination]);

  // ── 沿路线走廊动态布设拟真积水点（演示环境下保证任意起终点都有可评估数据）──
  // 真实产品替换点：此处改为订阅 BMA / JS100 / 气象局洪水 API 的实时数据流。
  const routeFloods = useMemo(() => {
    if (builtRoutes.length === 0) return floods;
    // 以主路 + 绕行走廊为布点依据，确保「主干道被淹、绕行安全」的对比可复现
    const corridor = builtRoutes.flatMap((r) => r.polyline);
    const seeded = seedFloodsAlongRoute(corridor, { maxCount: 3, severity: "severe", now });
    return mergeFloodEvents(floods, seeded);
  }, [builtRoutes, floods, now]);

  /**
   * 时间轴缩放后的真实积水集合。
   * 拖时间轴时，每个积水点的水深按 waterScaleAt 曲线演变，
   * 深度归零的点自动从评估中消失（等价于「水退了」）。
   */
  const scaledFloods = useMemo(() => {
    if (hoursOffset === 0) return routeFloods;
    return routeFloods.map((f) => ({
      ...f,
      waterDepthCm: scaleDepth(f.waterDepthCm, hoursOffset, f.source === "CROWD"),
    }));
  }, [routeFloods, hoursOffset]);

  /** 时间轴缩放后的分钟级降水曲线 */
  const scaledMinuteRain = useMemo(
    () =>
      MINUTE_RAIN.map((p) => ({
        ...p,
        mmPerHour: Math.round(p.mmPerHour * rainScaleAt(hoursOffset) * 10) / 10,
      })),
    [hoursOffset],
  );

  /** 严重天气警报（对标 TWC） */
  const severeAlerts = useMemo<SevereAlert[]>(() => {
    const list: SevereAlert[] = [];
    if (CURRENT_WEATHER.rainChance >= 85) list.push({ id: "flood-2026-1004", kind: "flood" });
    if (CURRENT_WEATHER.windKmh >= 22) list.push({ id: "wind-2026-1004", kind: "wind" });
    return list;
  }, []);

  // ── 风险评估 ──
  const evaluated = useMemo(
    () =>
      builtRoutes.map((r) => ({
        built: r,
        risk: evaluateRoute(
          r.polyline,
          scaledFloods,
          vehicle,
          now,
          detourCandidates,
        ),
      })),
    [builtRoutes, scaledFloods, vehicle, now, detourCandidates],
  );

  const active = useMemo(() => {
    if (selectedId) {
      const chosen = evaluated.find((e) => e.built.id === selectedId);
      if (chosen) return chosen;
    }
    if (evaluated.length === 0) return null;
    return [...evaluated].sort(
      (a, b) => RISK_RANK[b.risk.overallRisk] - RISK_RANK[a.risk.overallRisk],
    )[0];
  }, [evaluated, selectedId]);

  const blockedSelected = active?.risk.overallRisk === "IMPASSABLE";

  // 积水风险指数
  const riskIndex = useMemo(() => {
    const rainFactor = CURRENT_WEATHER.rainChance;
    const floodFactor = Math.min(100, scaledFloods.length * 22);
    const routeFactor = !active
      ? 0
      : active.risk.overallRisk === "IMPASSABLE"
        ? 100
        : active.risk.overallRisk === "WARNING"
          ? 60
          : 25;
    return Math.round(rainFactor * 0.3 + floodFactor * 0.3 + routeFactor * 0.4);
  }, [scaledFloods.length, active]);

  /** 随时间轴缩放后的当前天气（温度/降雨量随轴演变） */
  const timeScaledWeather = useMemo(() => {
    const rs = rainScaleAt(hoursOffset);
    return {
      ...CURRENT_WEATHER,
      tempC: Math.round(CURRENT_WEATHER.tempC - hoursOffset * 0.6),
      rainMmLastHour: Math.round(CURRENT_WEATHER.rainMmLastHour * rs * 10) / 10,
      rainChance: Math.max(0, Math.min(100, Math.round(CURRENT_WEATHER.rainChance * rs))),
      condition:
        rs > 0.75 ? "heavyRain" : rs > 0.35 ? "rain" : "cloudy",
    } as typeof CURRENT_WEATHER;
  }, [hoursOffset]);

  // ── 导航参数 ──
  const navRoute = useMemo(() => {
    if (!origin || !destination || !active) return null;
    return {
      origin: origin.coords,
      destination: destination.coords,
      waypoints: active.risk.avoidanceWaypoints as LatLng[],
    };
  }, [origin, destination, active]);

  /**
   * 降级导航目标：当所选路线 IMPASSABLE 时，
   * 把终点改为「积水路段前的最后一个安全停靠点」，
   * 确保用户在全部路线被阻断时仍有可执行的下一步。
   */
  const safeStopPoint = useMemo<LatLng | null>(() => {
    if (!active || !blockedSelected) return null;
    return findLastSafePoint(active.built.polyline, scaledFloods, now);
  }, [active, blockedSelected, scaledFloods, now]);

  const degradedNav = blockedSelected && safeStopPoint !== null;

  const handleLaunch = (provider: NavProvider) => {
    if (!navRoute) return;

    // 降级：全阻断但存在安全停靠点 -> 导航至该点
    if (degradedNav && safeStopPoint) {
      void launchNavigation(provider, {
        origin: navRoute.origin,
        destination: safeStopPoint,
        waypoints: [],
      });
      return;
    }

    if (blockedSelected) return;
    void launchNavigation(provider, navRoute);
  };

  // ── 获取用户定位 ──
  const handleUseMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocError(t.locationDenied);
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LatLng = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setOrigin(makeCurrentLocationPlace(coords, t.useMyLocation));
        setLocating(false);
      },
      () => {
        setLocError(t.locationDenied);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [t]);

  const handleSubmitReport = (payload: CrowdReportPayload) => {
    // 众包点落在当前路线中点附近
    const base = origin?.coords ?? [13.7462, 100.5347];
    const dest = destination?.coords ?? [13.7245, 100.5785];
    addCrowdReport({
      latitude: (base[0] + dest[0]) / 2,
      longitude: (base[1] + dest[1]) / 2,
      waterDepthCm: payload.waterDepthCm,
      description: payload.description || t.sourceCrowd,
    });
  };

  const routeTitle = (built: { kind: "main" | "detour" | "alt" }): string =>
    built.kind === "main"
      ? t.routeMain
      : built.kind === "alt"
        ? t.routeAlt
        : t.routeDetour;

  const routeSubtitle =
    origin && destination
      ? `${t.routeFrom(placeLabel(origin))} · ${t.routeTo(placeLabel(destination))}`
      : undefined;

  return (
    <>
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

        <main className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-3">
          {/* ① 起终点搜索（核心输入） */}
          <RouteSearchBar
            origin={origin}
            destination={destination}
            onOriginChange={(p) => {
              setOrigin(p);
              setSelectedId(null);
            }}
            onDestinationChange={(p) => {
              setDestination(p);
              setSelectedId(null);
            }}
            userLocation={userLocation}
            onUseMyLocation={handleUseMyLocation}
            locating={locating}
          />

          {locError && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
              {locError}
            </p>
          )}

          {/* ① 极端天气警报（对标 The Weather Channel） */}
          <SevereAlertBanner alerts={severeAlerts} />

          {/* ② 气象模型切换（对标 Windy） */}
          <ModelSwitcher value={model} onChange={setModel} />

          {/* ② 天气主卡 */}
          <WeatherHero
            weather={timeScaledWeather}
            hourly={HOURLY_RAIN}
            riskIndex={riskIndex}
          />

          {/* ③ 分钟级降水（对标 Apple Weather） */}
          <MinuteRainChart series={scaledMinuteRain} />

          {/* ④ 风场流线（对标 Windy） */}
          <WindField
            model={model}
            windKmh={timeScaledWeather.windKmh}
            windDeg={timeScaledWeather.windDeg}
          />

          {/* ⑤ 时间轴拖拽（对标 Windy / Apple） */}
          <TimelineScrubber
            value={hoursOffset}
            onChange={setHoursOffset}
            playing={timelinePlaying}
            onTogglePlay={() => setTimelinePlaying((v) => !v)}
          />

          {/* ⑥ 车型切换 */}
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
              <Zap className="h-3 w-3" /> {t.selectVehicle}
            </div>
            <VehicleSelector value={vehicle} onChange={setVehicle} />
          </section>

          {/* ④ 路线风险对比 */}
          {evaluated.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                  {t.routeComparison}
                </h2>
                <span className="text-[10.5px] text-white/35">
                  {t.floodPointsNow} {scaledFloods.length}
                </span>
              </div>
              {evaluated.map(({ built, risk }) => {
                // 推荐标记：该路线为当前优选且无无法通行风险
                const isRecommended =
                  active?.built.id === built.id &&
                  risk.overallRisk !== "IMPASSABLE";
                return (
                  <RouteCard
                    key={built.id}
                    title={routeTitle(built)}
                    subtitle={routeSubtitle}
                    durationMin={built.durationMin}
                    distanceKm={built.distanceKm}
                    risk={risk}
                    selected={active?.built.id === built.id}
                    isRecommended={isRecommended}
                    onSelect={() => setSelectedId(built.id)}
                    now={now}
                    onVoteCleared={voteCleared}
                  />
                );
              })}
            </section>
          ) : (
            <section className="glass rounded-2xl p-6 text-center">
              <p className="text-[13px] text-slate-400">{t.pickOrigin} / {t.pickDestination}</p>
            </section>
          )}

          {/* ⑤ 避险途经点 */}
          {active && (
            <WaypointPanel
              waypoints={active.risk.avoidanceWaypoints as LatLng[]}
              originName={origin ? placeLabel(origin) : "—"}
              destinationName={destination ? placeLabel(destination) : "—"}
            />
          )}

          {/* ⑥ 河道水位 */}
          <CanalPanel canals={CANAL_LEVELS} />

          {/* 综合气象指标（对标 TWC / AccuWeather） */}
          <MetricsGrid weather={timeScaledWeather} air={AIR_QUALITY} />

          {/* 日出日落与月相 */}
          <SunMoonPanel data={SUN_MOON} />

          {/* 众包气象站网络（对标 Weather Underground） */}
          <PwsPanel floods={scaledFloods} reference={origin?.coords ?? null} />

          {/* ⑦ 未来天气 */}
          <DailyOutlookPanel days={DAILY_OUTLOOK} />
        </main>

        {/* 悬浮上报 */}
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
          disabled={!!blockedSelected && !degradedNav}
          degraded={degradedNav}
        />

        <CrowdReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          onSubmit={handleSubmitReport}
          locationLabel={
            origin && destination
              ? `${placeLabel(origin)} → ${placeLabel(destination)}`
              : "—"
          }
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
