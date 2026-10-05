/**
 * RouteSearchBar.tsx —— 起终点输入（点击才展开，Google Maps 风格）
 *
 * 设计原则（按用户要求）：
 *   - 空白态：只显示「输入起点」「输入终点」两个空槽位，不预设任何地点
 *   - 点击槽位 → 全屏搜索面板打开，自动聚焦输入框、自动弹出键盘
 *   - 支持任意地址 / 地标 / 经纬度（本地库 → 坐标 → OpenStreetMap）
 *   - 原地输入 + 联想列表，选中后立即回到主界面并触发重算
 *
 * 网络检索 450ms 防抖 + 请求序号防竞态，断网自动降级，绝不阻塞输入。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  Building2,
  Clock,
  Cross,
  Globe,
  HardDrive,
  LocateFixed,
  MapPin,
  Plane,
  Search,
  Train,
  TreePine,
  X,
} from "lucide-react";
import { useTranslation } from "../i18n/i18n.js";
import { searchPlaces, type SearchResult } from "../services/placeSearch.js";
import { resolvePlaceQuery, type GeocodeHit } from "../services/geocoding.js";
import { PLACES, type Place } from "../mock/places.js";
import type { LatLng } from "../engine/routeRiskEvaluator.js";

type Field = "origin" | "destination";

interface Props {
  origin: Place | null;
  destination: Place | null;
  onOriginChange: (p: Place | null) => void;
  onDestinationChange: (p: Place | null) => void;
  /** 用户经纬度（用于「我的位置」与距离排序） */
  userLocation: LatLng | null;
  onUseMyLocation: () => void;
  locating: boolean;
}

/** 地点类别图标 */
function CategoryIcon({ category }: { category: Place["category"] }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  switch (category) {
    case "mall":
      return <Building2 className={cls} />;
    case "bts":
      return <Train className={cls} />;
    case "hospital":
      return <Cross className={cls} />;
    case "park":
      return <TreePine className={cls} />;
    case "airport":
      return <Plane className={cls} />;
    default:
      return <MapPin className={cls} />;
  }
}

/** 数据来源徽标 */
function SourceTag({ kind }: { kind: GeocodeHit["origin_"] }) {
  const { t } = useTranslation();
  if (kind === "local") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/12 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald-300">
        <HardDrive className="h-2.5 w-2.5" />
        {t.sourceLocal}
      </span>
    );
  }
  if (kind === "osm") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sky-500/12 px-1.5 py-0.5 text-[9.5px] font-medium text-sky-300">
        <Globe className="h-2.5 w-2.5" />
        {t.sourceOsm}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[9.5px] font-medium text-amber-300">
      <MapPin className="h-2.5 w-2.5" />
      {t.sourceCoords}
    </span>
  );
}

export function RouteSearchBar({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  userLocation,
  onUseMyLocation,
  locating,
}: Props) {
  const { t, lang } = useTranslation();
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [query, setQuery] = useState("");
  const [remoteHits, setRemoteHits] = useState<GeocodeHit[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  /** 请求序号：丢弃过期响应，避免快速输入时结果错乱 */
  const reqSeq = useRef(0);

  // 面板打开时聚焦输入框并弹出键盘
  useEffect(() => {
    if (activeField) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 90);
      return () => window.clearTimeout(id);
    }
  }, [activeField]);

  // Esc 关闭面板
  useEffect(() => {
    if (!activeField) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveField(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeField]);

  // 本地候选：始终即时可用（离线也能选）
  const localResults: SearchResult[] = useMemo(
    () => searchPlaces(query, lang, userLocation ?? undefined, query ? 8 : 6),
    [query, lang, userLocation],
  );

  // 在线检索：仅在本地无结果时触发，450ms 防抖
  useEffect(() => {
    const q = query.trim();
    if (!q || localResults.length > 0) {
      setRemoteHits([]);
      setRemoteLoading(false);
      return;
    }

    const seq = ++reqSeq.current;
    setRemoteLoading(true);

    const timer = window.setTimeout(() => {
      resolvePlaceQuery(q, lang, userLocation ?? undefined)
        .then((hits) => {
          if (seq !== reqSeq.current) return; // 过期响应，丢弃
          setRemoteHits(hits);
        })
        .catch(() => {
          if (seq === reqSeq.current) setRemoteHits([]);
        })
        .finally(() => {
          if (seq === reqSeq.current) setRemoteLoading(false);
        });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [query, lang, userLocation, localResults.length]);

  const openField = (f: Field) => {
    setQuery("");
    setRemoteHits([]);
    setActiveField(f);
  };

  const commitPlace = (place: Place) => {
    if (activeField === "origin") onOriginChange(place);
    else onDestinationChange(place);
    setActiveField(null);
    setQuery("");
    setRemoteHits([]);
  };

  /** 直接把当前输入的原始文本当作目标（在线检索无结果时的兜底） */
  const commitRawQuery = async () => {
    const q = query.trim();
    if (!q) return;
    const hits = await resolvePlaceQuery(q, lang, userLocation ?? undefined);
    if (hits.length > 0) {
      const h = hits[0];
      commitPlace({
        id: `custom-${Date.now()}`,
        nameEn: h.label,
        nameTh: h.label,
        nameZh: h.label,
        category: "intersection",
        coords: h.coords,
      });
    }
  };

  const swap = () => {
    const o = origin;
    onOriginChange(destination);
    onDestinationChange(o);
  };

  const displayName = (p: Place): string =>
    lang === "th" ? p.nameTh : lang === "zh" ? p.nameZh : p.nameEn;

  /** 常用地点：仅在有定位时展示最近的两处，避免首屏堆积 */
  const recentPlaces = useMemo(() => {
    if (!userLocation) return [];
    return searchPlaces("", lang, userLocation, 2).map((r) => r.place);
  }, [lang, userLocation]);

  const showRemoteList = localResults.length === 0 && remoteHits.length > 0;
  const showRemoteEmpty =
    localResults.length === 0 &&
    !remoteLoading &&
    remoteHits.length === 0 &&
    query.trim().length > 1;
  const bothFilled = Boolean(origin && destination);

  return (
    <section className="glass animate-float-in rounded-2xl p-3">
      {/* 起终点输入槽位：空白态只有占位符，不含任何预设地点 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          {/* 起点 */}
          <button
            type="button"
            onClick={() => openField("origin")}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-edge)] bg-black/25 px-3 py-2.5 text-left transition-colors hover:border-[var(--color-edge-hi)]"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-rain)]" />
            <span className={`flex-1 truncate text-[13px] ${origin ? "text-white" : "text-slate-500"}`}>
              {origin ? displayName(origin) : t.searchOriginPlaceholder}
            </span>
            {origin && (
              <span
                role="button"
                tabIndex={0}
                aria-label="clear origin"
                onClick={(e) => {
                  e.stopPropagation();
                  onOriginChange(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    onOriginChange(null);
                  }
                }}
                className="shrink-0 rounded p-0.5 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>

          {/* 终点 */}
          <button
            type="button"
            onClick={() => openField("destination")}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-edge)] bg-black/25 px-3 py-2.5 text-left transition-colors hover:border-[var(--color-edge-hi)]"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-danger)]" />
            <span className={`flex-1 truncate text-[13px] ${destination ? "text-white" : "text-slate-500"}`}>
              {destination ? displayName(destination) : t.searchDestPlaceholder}
            </span>
            {destination && (
              <span
                role="button"
                tabIndex={0}
                aria-label="clear destination"
                onClick={(e) => {
                  e.stopPropagation();
                  onDestinationChange(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation();
                    onDestinationChange(null);
                  }
                }}
                className="shrink-0 rounded p-0.5 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        </div>

        {/* 交换 + 定位 */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={swap}
            disabled={!origin && !destination}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[var(--color-edge)] bg-black/25 text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-35"
            aria-label="swap"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onUseMyLocation}
            disabled={locating}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-[var(--color-rain)]/40 bg-[var(--color-rain)]/15 text-[var(--color-rain)] transition-colors hover:bg-[var(--color-rain)]/25 disabled:opacity-50"
            aria-label={t.useMyLocation}
          >
            <LocateFixed className={`h-4 w-4 ${locating ? "animate-pulse" : ""}`} />
          </button>
        </div>
      </div>

      {/* 未选全时不显示 CTA，避免遮挡 */}
      {bothFilled && (
        <button
          type="button"
          onClick={() => setActiveField(null)}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-rain)] to-[var(--color-storm)] px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-sky-500/20 transition-all hover:brightness-110 active:scale-[0.99]"
        >
          <Search className="h-4 w-4" />
          {t.searchRouteBtn}
        </button>
      )}

      {/* 搜索面板（点击槽位后才出现） */}
      {activeField && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="close"
            onClick={() => setActiveField(null)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <div className="glass-strong relative z-10 w-full max-w-md animate-[slideUp_220ms_ease-out] rounded-t-3xl px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-600" />

            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-white">
                {activeField === "origin" ? t.pickOrigin : t.pickDestination}
              </h3>
              <button
                type="button"
                onClick={() => setActiveField(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 输入框：自动聚焦、弹出键盘 */}
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--color-edge-hi)] bg-black/40 px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) void commitRawQuery();
                }}
                placeholder={t.searchPlaceholder}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 bg-transparent text-[13px] text-white placeholder:text-slate-600 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="shrink-0 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 「我的位置」快捷入口 */}
            <button
              type="button"
              onClick={() => {
                onUseMyLocation();
                setActiveField(null);
              }}
              className="mt-2.5 flex w-full items-center gap-3 rounded-xl border border-[var(--color-rain)]/30 bg-[var(--color-rain)]/10 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-rain)]/18"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-rain)]/18 text-[var(--color-rain)]">
                <LocateFixed className="h-4 w-4" />
              </span>
              <span className="text-[13px] font-medium text-sky-200">{t.useMyLocation}</span>
            </button>

            <p className="mt-2 text-[10.5px] text-slate-500">{t.searchAnyPlaceHint}</p>

            {/* 建议列表 */}
            <div className="mt-3 max-h-[52vh] space-y-1 overflow-y-auto">
              {/* 在线检索中 */}
              {remoteLoading && (
                <div className="flex items-center gap-2 px-3 py-3 text-[12px] text-sky-300">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400" />
                  {t.searchingNetwork}
                </div>
              )}

              {/* 空查询 + 有定位：展示最近地点 */}
              {!query && recentPlaces.length > 0 && (
                <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  {t.pwsNearest}
                </p>
              )}

              {/* 本地结果 */}
              {localResults.map((r) => (
                <button
                  key={r.place.id}
                  type="button"
                  onClick={() => commitPlace(r.place)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/8"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/6 text-[var(--color-rain)]">
                    <CategoryIcon category={r.place.category} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-white">{r.label}</span>
                    <span className="block truncate text-[10.5px] text-slate-500">{r.place.nameEn}</span>
                  </span>
                  {r.distanceMeters !== null && (
                    <span className="shrink-0 text-[10.5px] text-slate-500">
                      {r.distanceMeters < 1000
                        ? `${Math.round(r.distanceMeters)} m`
                        : `${(r.distanceMeters / 1000).toFixed(1)} km`}
                    </span>
                  )}
                </button>
              ))}

              {/* 在线结果 */}
              {showRemoteList &&
                remoteHits.map((h, i) => {
                  const place: Place = {
                    id: `osm-${i}-${h.coords[0].toFixed(4)}`,
                    nameEn: h.label,
                    nameTh: h.label,
                    nameZh: h.label,
                    category: "intersection",
                    coords: h.coords,
                  };
                  return (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => commitPlace(place)}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/8"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300">
                        <Globe className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] text-white">{h.label}</span>
                          <SourceTag kind={h.origin_} />
                        </span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-slate-500">{h.detail}</span>
                      </span>
                    </button>
                  );
                })}

              {/* 空结果兜底 */}
              {showRemoteEmpty && (
                <button
                  type="button"
                  onClick={() => void commitRawQuery()}
                  className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[var(--color-edge-hi)] px-3 py-3 text-left transition-colors hover:bg-white/6"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-amber-200">
                      {t.useThisAddress(query.trim())}
                    </span>
                    <span className="block truncate text-[10.5px] text-slate-500">{t.noNetworkResult}</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** 供 App 使用的热门地点快捷项（无预设默认值，仅暴露常量） */
export const QUICK_PLACES = PLACES.slice(0, 6);

export { Clock };
