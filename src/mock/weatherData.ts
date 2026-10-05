/**
 * weatherData.ts —— 曼谷天口气象数据层（演示）
 *
 * 对标五大天气 App 的数据维度：
 *   Apple Weather  -> 分钟级降水（Nowcast）
 *   The Weather Channel -> 综合指标、AQI
 *   AccuWeather    -> RealFeel、MinuteCast、紫外线
 *   Windy          -> 风场矢量、多模型、时间轴
 *   Weather Underground -> 众包气象站
 *
 * 全部为纯数据 + 纯派生函数，零副作用，便于单测。
 * 真实产品替换点：接 TMD（泰国气象厅）/ OpenWeather / Open-Meteo API。
 */

export interface CurrentWeather {
  /** 气温 ℃ */
  tempC: number;
  /** 体感温度 ℃（RealFeel 对标） */
  feelsLikeC: number;
  /** 天气描述 key（由 i18n 解析） */
  condition: "heavyRain" | "rain" | "cloudy";
  /** 湿度 % */
  humidity: number;
  /** 降雨概率 % */
  rainChance: number;
  /** 风速 km/h */
  windKmh: number;
  /** 风向（度，0=北，顺时针） */
  windDeg: number;
  /** 过去 1 小时降雨量 mm */
  rainMmLastHour: number;
  /** 气压 hPa */
  pressureHpa: number;
  /** 露点温度 ℃ */
  dewPointC: number;
  /** 紫外线指数 0~11+ */
  uvIndex: number;
  /** 能见度 km */
  visibilityKm: number;
  /** 云量 % */
  cloudCover: number;
}

export interface HourlyRain {
  label: string;
  intensity: number;
  chance: number;
}

/** 分钟级降水（未来 60 分钟，每 5 分钟一个点） */
export interface MinuteRain {
  /** 距当前分钟数：-60 ~ +60，负数为过去 */
  offsetMin: number;
  /** 降水强度 mm/h */
  mmPerHour: number;
}

export interface DailyOutlook {
  dayKey: string;
  lowC: number;
  highC: number;
  rainChance: number;
  /** 天气图标 key */
  condition: "heavyRain" | "rain" | "cloudy" | "sunny";
}

/** 空气质量（对标 AccuWeather / TWC） */
export interface AirQuality {
  /** AQI 数值（US EPA 标准） */
  aqi: number;
  /** PM2.5 微克/立方米 */
  pm25: number;
  /** PM10 微克/立方米 */
  pm10: number;
}

/** 日出日落与天象 */
export interface SunMoon {
  /** 日出 "HH:mm" */
  sunrise: string;
  /** 日落 "HH:mm" */
  sunset: string;
  /** 月相 0~1（0=新月，0.5=满月） */
  moonPhase: number;
}

/** 风场网格（用于绘制流线，对标 Windy） */
export interface WindField {
  /** 网格尺寸（rows x cols） */
  rows: number;
  cols: number;
  /** 每个格点的风向（度） */
  dirs: number[];
  /** 每个格点的风速（km/h） */
  speeds: number[];
}

/** 气象模型（对标 Windy 多模型切换） */
export type WeatherModel = "TMD" | "GFS" | "ECMWF" | "ICON";

export const CURRENT_WEATHER: CurrentWeather = {
  tempC: 28,
  feelsLikeC: 33,
  condition: "heavyRain",
  humidity: 88,
  rainChance: 92,
  windKmh: 24,
  windDeg: 215,
  rainMmLastHour: 18.4,
  pressureHpa: 1004,
  dewPointC: 25.6,
  uvIndex: 3,
  visibilityKm: 4.2,
  cloudCover: 94,
};

export const HOURLY_RAIN: HourlyRain[] = [
  { label: "15:00", intensity: 92, chance: 95 },
  { label: "16:00", intensity: 78, chance: 90 },
  { label: "17:00", intensity: 64, chance: 82 },
  { label: "18:00", intensity: 45, chance: 70 },
  { label: "19:00", intensity: 30, chance: 55 },
  { label: "20:00", intensity: 18, chance: 40 },
];

/**
 * 分钟级降水序列（对标 Apple Weather / Dark Sky 的 Next Hour）。
 * 过去 30 分钟实测 + 未来 60 分钟预测，形成「雨势拐点」曲线。
 */
export const MINUTE_RAIN: MinuteRain[] = [
  { offsetMin: -30, mmPerHour: 6.2 },
  { offsetMin: -25, mmPerHour: 7.8 },
  { offsetMin: -20, mmPerHour: 9.4 },
  { offsetMin: -15, mmPerHour: 12.1 },
  { offsetMin: -10, mmPerHour: 15.6 },
  { offsetMin: -5, mmPerHour: 19.2 },
  { offsetMin: 0, mmPerHour: 22.4 },
  { offsetMin: 5, mmPerHour: 24.8 },
  { offsetMin: 10, mmPerHour: 26.1 },
  { offsetMin: 15, mmPerHour: 25.3 },
  { offsetMin: 20, mmPerHour: 22.7 },
  { offsetMin: 25, mmPerHour: 18.9 },
  { offsetMin: 30, mmPerHour: 14.2 },
  { offsetMin: 35, mmPerHour: 10.5 },
  { offsetMin: 40, mmPerHour: 7.3 },
  { offsetMin: 45, mmPerHour: 4.8 },
  { offsetMin: 50, mmPerHour: 2.9 },
  { offsetMin: 55, mmPerHour: 1.4 },
  { offsetMin: 60, mmPerHour: 0.6 },
];

export const DAILY_OUTLOOK: DailyOutlook[] = [
  { dayKey: "today", lowC: 26, highC: 31, rainChance: 92, condition: "heavyRain" },
  { dayKey: "tomorrow", lowC: 25, highC: 32, rainChance: 70, condition: "rain" },
  { dayKey: "d2", lowC: 26, highC: 33, rainChance: 45, condition: "cloudy" },
  { dayKey: "d3", lowC: 27, highC: 34, rainChance: 20, condition: "sunny" },
];

export interface CanalLevel {
  name: string;
  levelM: number;
  warningM: number;
}

export const CANAL_LEVELS: CanalLevel[] = [
  { name: "Khlong Saen Saep", levelM: 1.82, warningM: 2.0 },
  { name: "Khlong Bang Sue", levelM: 1.45, warningM: 1.8 },
];

export const AIR_QUALITY: AirQuality = {
  aqi: 78,
  pm25: 24.5,
  pm10: 41.2,
};

export const SUN_MOON: SunMoon = {
  sunrise: "06:08",
  sunset: "18:22",
  moonPhase: 0.42,
};

/**
 * 生成风场网格（演示）。
 *
 * 用平滑的三角函数叠加模拟曼谷雨季常见的西南季风 + 局地环流，
 * 保证渲染出连续的流线而非随机噪点。
 *
 * @param rows 行数
 * @param cols 列数
 * @param model 气象模型（不同模型给不同偏置，模拟模型差异）
 */
export function buildWindField(
  rows = 7,
  cols = 9,
  model: WeatherModel = "TMD",
): WindField {
  // 各模型对同一区域的解读差异（风向偏置、风速系数）
  const bias: Record<WeatherModel, { deg: number; speed: number }> = {
    TMD: { deg: 0, speed: 1.0 },
    GFS: { deg: -8, speed: 1.15 },
    ECMWF: { deg: 4, speed: 0.92 },
    ICON: { deg: -3, speed: 1.06 },
  };
  const { deg, speed } = bias[model];

  const dirs: number[] = [];
  const speeds: number[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const v = r / (rows - 1);
      // 基础西南向季风 215°，叠加两个尺度的扰动形成弯曲流线
      const wave =
        Math.sin(u * Math.PI * 1.6 + v * 0.9) * 18 +
        Math.cos(v * Math.PI * 1.2 - u * 0.7) * 11;
      dirs.push((215 + wave + deg + 360) % 360);

      const gust = 0.72 + 0.28 * Math.sin(u * Math.PI * 2.1) * Math.cos(v * Math.PI * 1.4);
      speeds.push(Math.max(2, 24 * gust * speed));
    }
  }

  return { rows, cols, dirs, speeds };
}

/* ------------------------------------------------------------------ */
/* 派生函数                                                            */
/* ------------------------------------------------------------------ */

/** AQI 分级（US EPA）：用于配色与文案 */
export type AqiLevel = "good" | "moderate" | "unhealthySensitive" | "unhealthy" | "veryUnhealthy" | "hazardous";

export function aqiLevel(aqi: number): AqiLevel {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "unhealthySensitive";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "veryUnhealthy";
  return "hazardous";
}

/** 紫外线分级（WHO 标准） */
export type UvLevel = "low" | "moderate" | "high" | "veryHigh" | "extreme";

export function uvLevel(uv: number): UvLevel {
  if (uv < 3) return "low";
  if (uv < 6) return "moderate";
  if (uv < 8) return "high";
  if (uv < 11) return "veryHigh";
  return "extreme";
}

/** 风向度数 -> 八方位 key */
export function windDirectionKey(deg: number): "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" {
  const keys = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return keys[idx];
}

/** 月相 -> i18n key */
export function moonPhaseKey(phase: number): "new" | "waxingCrescent" | "firstQuarter" | "waxingGibbous" | "full" | "waningGibbous" | "lastQuarter" | "waningCrescent" {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.0625 || p >= 0.9375) return "new";
  if (p < 0.1875) return "waxingCrescent";
  if (p < 0.3125) return "firstQuarter";
  if (p < 0.4375) return "waxingGibbous";
  if (p < 0.5625) return "full";
  if (p < 0.6875) return "waningGibbous";
  if (p < 0.8125) return "lastQuarter";
  return "waningCrescent";
}

/**
 * 从分钟级序列中提取「雨势拐点」文案关键词。
 * 对标 Apple Weather 的 "Rain stopping in 25 min"。
 *
 * @returns 拐点描述类型 + 分钟数
 */
export function findRainTurningPoint(
  series: MinuteRain[],
): { kind: "stopping" | "starting" | "peaking" | "steady"; inMinutes: number } {
  if (series.length < 2) return { kind: "steady", inMinutes: 0 };

  const future = series.filter((s) => s.offsetMin >= 0);
  if (future.length < 2) return { kind: "steady", inMinutes: 0 };

  const now = future[0].mmPerHour;
  const peak = future.reduce((m, s) => (s.mmPerHour > m.mmPerHour ? s : m), future[0]);
  const last = future[future.length - 1];

  // 已在降雨且末尾显著低于当前 -> 雨将停
  if (now >= 1 && last.mmPerHour < now * 0.25) {
    // 找到首次降到当前 25% 以下的时间点
    const stop = future.find((s) => s.mmPerHour < now * 0.25);
    return { kind: "stopping", inMinutes: stop ? stop.offsetMin : last.offsetMin };
  }

  // 当前无雨但未来会下 -> 雨将开始
  if (now < 1 && peak.mmPerHour >= 1) {
    const start = future.find((s) => s.mmPerHour >= 1);
    return { kind: "starting", inMinutes: start ? start.offsetMin : peak.offsetMin };
  }

  // 未来会明显增强 -> 峰值
  if (peak.mmPerHour > now * 1.15) {
    return { kind: "peaking", inMinutes: peak.offsetMin };
  }

  return { kind: "steady", inMinutes: 0 };
}

/** 天气状况 -> 图标 key（供 UI 选择图标，避免 UI 层硬编码判断） */
export function conditionIconKey(
  c: CurrentWeather["condition"] | DailyOutlook["condition"],
): "heavyRain" | "rain" | "cloudy" | "sunny" {
  return c;
}
