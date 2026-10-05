/**
 * weatherData.ts —— 曼谷天口气象数据（演示）
 *
 * 为界面提供「天气预报」质感所需的气象维度：
 * 当前天气、逐时降雨强度、未来数日概览、水位警戒。
 */

export interface CurrentWeather {
  /** 气温 ℃ */
  tempC: number;
  /** 体感温度 ℃ */
  feelsLikeC: number;
  /** 天气描述 key（由 i18n 解析） */
  condition: "heavyRain" | "rain" | "cloudy";
  /** 湿度 % */
  humidity: number;
  /** 降雨概率 % */
  rainChance: number;
  /** 风速 km/h */
  windKmh: number;
  /** 过去 1 小时降雨量 mm */
  rainMmLastHour: number;
}

export interface HourlyRain {
  /** 时刻标签，如 "15:00" */
  label: string;
  /** 降雨强度 0~100（用于条形高度） */
  intensity: number;
  /** 降雨概率 % */
  chance: number;
}

export interface DailyOutlook {
  /** 星期标签 key */
  dayKey: string;
  /** 最低温 */
  lowC: number;
  /** 最高温 */
  highC: number;
  /** 降雨概率 % */
  rainChance: number;
}

export const CURRENT_WEATHER: CurrentWeather = {
  tempC: 28,
  feelsLikeC: 33,
  condition: "heavyRain",
  humidity: 88,
  rainChance: 92,
  windKmh: 24,
  rainMmLastHour: 18.4,
};

/** 逐时降雨（未来 6 小时） */
export const HOURLY_RAIN: HourlyRain[] = [
  { label: "15:00", intensity: 92, chance: 95 },
  { label: "16:00", intensity: 78, chance: 90 },
  { label: "17:00", intensity: 64, chance: 82 },
  { label: "18:00", intensity: 45, chance: 70 },
  { label: "19:00", intensity: 30, chance: 55 },
  { label: "20:00", intensity: 18, chance: 40 },
];

/** 未来 4 天概览 */
export const DAILY_OUTLOOK: DailyOutlook[] = [
  { dayKey: "today", lowC: 26, highC: 31, rainChance: 92 },
  { dayKey: "tomorrow", lowC: 25, highC: 32, rainChance: 70 },
  { dayKey: "d2", lowC: 26, highC: 33, rainChance: 45 },
  { dayKey: "d3", lowC: 27, highC: 34, rainChance: 20 },
];

/** 曼谷主要排水河道水位警戒（演示） */
export interface CanalLevel {
  name: string;
  /** 当前水位（米） */
  levelM: number;
  /** 警戒水位（米） */
  warningM: number;
}

export const CANAL_LEVELS: CanalLevel[] = [
  { name: "Khlong Saen Saep", levelM: 1.82, warningM: 2.0 },
  { name: "Khlong Bang Sue", levelM: 1.45, warningM: 1.8 },
];
