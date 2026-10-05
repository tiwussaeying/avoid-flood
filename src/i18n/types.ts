/**
 * types.ts —— i18n 文案键与语言定义（强类型）
 */

export type Language = "th" | "en" | "zh";

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "th", label: "TH" },
  { code: "en", label: "EN" },
  { code: "zh", label: "CN" },
];

/** 全站文案键（强类型：新增语言必须覆盖全部键） */
export interface TranslationDict {
  appName: string;
  appTagline: string;
  stormAlert: string;
  selectVehicle: string;
  vehicleMotorcycle: string;
  vehicleSedan: string;
  vehiclePickup: string;
  vehicleTruck: string;
  routeComparison: string;
  floodPointsNow: string;
  riskSafe: string;
  riskWarning: string;
  riskImpassable: string;
  minutes: string;
  floodCount: (n: number) => string;
  recommended: string;
  blockedHint: string;
  allClearHint: string;
  safeWaypoints: string;
  noWaypoints: string;
  start: string;
  end: string;
  detourPoint: (n: number) => string;
  reportTitle: string;
  reportLocation: string;
  waterDepth: string;
  currentDepth: (cm: number) => string;
  presetAnkle: string;
  presetHalfWheel: string;
  presetExhaust: string;
  presetSubmerged: string;
  sedanBlockedLabel: string;
  descriptionPlaceholder: string;
  sedanCannotPass: string;
  sedanCanPass: string;
  submitReport: string;
  sourceBma: string;
  sourceJs100: string;
  sourceCrowd: string;
  confidence: string;
  justNow: string;
  minutesAgo: (n: number) => string;
  hoursAgo: (n: number) => string;
  viewSource: string;
  clearedButton: (votes: number, need: number) => string;
  navGoogle: string;
  navWaze: string;
  navApple: string;
  blockedNavHint: string;
  disclaimer: string;
  languageLabel: string;

  /* ── 天气模块 ── */
  condHeavyRain: string;
  condRain: string;
  condCloudy: string;
  feelsLike: string;
  humidity: string;
  wind: string;
  rainChance: string;
  rainLastHour: string;
  hourlyRain: string;
  dailyOutlook: string;
  canalLevel: string;
  warningLevel: string;
  dayToday: string;
  dayTomorrow: string;
  dayD2: string;
  dayD3: string;
  floodRiskIndex: string;
  riskLevelNote: string;

  /* ── 地点搜索 ── */
  searchOriginPlaceholder: string;
  searchDestPlaceholder: string;
  searchPlaceholder: string;
  searchRouteBtn: string;
  pickOrigin: string;
  pickDestination: string;
  useMyLocation: string;
  noPlaceFound: string;
  routeFrom: (from: string) => string;
  routeTo: (to: string) => string;
  locationDenied: string;
  routeMain: string;
  routeDetour: string;
  routeAlt: string;
  routeDist: (km: number) => string;

  /* ── 自由地址搜索与网络后补 ── */
  searchAnyPlaceHint: string;
  searchingNetwork: string;
  sourceLocal: string;
  sourceOsm: string;
  sourceCoords: string;
  useThisAddress: (q: string) => string;
  noNetworkResult: string;
  floodOnRoute: (n: number) => string;
  noFloodOnRoute: string;
  seededNote: string;
  originFloodedHint: string;
  destinationFloodedHint: string;
  navigateNearestSafe: string;
  blockedButNavigable: string;

  /* ── 分钟级降水（对标 Apple Weather） ── */
  minuteRain: string;
  pastMeasured: string;
  futureForecast: string;
  nowLabel: string;
  rainStoppingIn: (n: number) => string;
  rainStartingIn: (n: number) => string;
  rainPeakingIn: (n: number) => string;
  rainSteady: string;
  rainNone: string;
  rainLight: string;
  rainModerate: string;
  rainIntense: string;

  /* ── 风场与模型（对标 Windy） ── */
  windField: string;
  weatherModel: string;
  modelTmd: string;
  modelGfs: string;
  modelEcmwf: string;
  modelIcon: string;
  modelNote: string;

  /* ── 时间轴（对标 Windy / Apple） ── */
  timeline: string;
  timelineNow: string;
  timelinePast: (h: number) => string;
  timelineFuture: (h: number) => string;
  playAnimation: string;
  pauseAnimation: string;

  /* ── 综合指标（对标 TWC / AccuWeather） ── */
  pressure: string;
  dewPoint: string;
  uvIndex: string;
  visibility: string;
  cloudCover: string;
  aqi: string;
  aqiGood: string;
  aqiModerate: string;
  aqiUnhealthySensitive: string;
  aqiUnhealthy: string;
  aqiVeryUnhealthy: string;
  aqiHazardous: string;
  uvLow: string;
  uvModerate: string;
  uvHigh: string;
  uvVeryHigh: string;
  uvExtreme: string;

  /* ── 日月与天象 ── */
  sunrise: string;
  sunset: string;
  moonPhase: string;
  daylight: string;
  moonNew: string;
  moonWaxingCrescent: string;
  moonFirstQuarter: string;
  moonWaxingGibbous: string;
  moonFull: string;
  moonWaningGibbous: string;
  moonLastQuarter: string;
  moonWaningCrescent: string;

  /* ── 极端天气警报（对标 TWC） ── */
  severeAlertTitle: string;
  severeAlertBody: string;
  severeAlertFlood: string;
  severeAlertWind: string;
  severeAlertDismiss: string;

  /* ── 众包气象站（对标 WU） ── */
  pwsNetwork: string;
  pwsStations: (n: number) => string;
  pwsNearest: string;
  pwsMeasured: string;
  pwsOffline: string;

  /* ── 降水强度分级 ── */
  intensityLight: string;
  intensityModerate: string;
  intensityHeavy: string;
  intensityViolent: string;
  mmPerHour: string;
}
