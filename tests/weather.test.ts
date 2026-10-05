/**
 * weather.test.ts —— 天气数据层与时间轴水位模型
 */
import { describe, it, expect } from "vitest";
import {
  aqiLevel,
  uvLevel,
  windDirectionKey,
  moonPhaseKey,
  findRainTurningPoint,
  buildWindField,
  MINUTE_RAIN,
  CURRENT_WEATHER,
  AIR_QUALITY,
  SUN_MOON,
  DAILY_OUTLOOK,
  type WeatherModel,
} from "../src/mock/weatherData.js";
import { waterScaleAt, scaleDepth, rainScaleAt } from "../src/engine/timelineWater.js";

describe("1) AQI 分级（US EPA）", () => {
  it("各区间边界正确", () => {
    expect(aqiLevel(0)).toBe("good");
    expect(aqiLevel(50)).toBe("good");
    expect(aqiLevel(51)).toBe("moderate");
    expect(aqiLevel(100)).toBe("moderate");
    expect(aqiLevel(101)).toBe("unhealthySensitive");
    expect(aqiLevel(150)).toBe("unhealthySensitive");
    expect(aqiLevel(151)).toBe("unhealthy");
    expect(aqiLevel(200)).toBe("unhealthy");
    expect(aqiLevel(201)).toBe("veryUnhealthy");
    expect(aqiLevel(300)).toBe("veryUnhealthy");
    expect(aqiLevel(301)).toBe("hazardous");
  });

  it("当前空气质量落在 moderate 区间", () => {
    expect(aqiLevel(AIR_QUALITY.aqi)).toBe("moderate");
  });
});

describe("2) 紫外线分级（WHO）", () => {
  it("各档位边界正确", () => {
    expect(uvLevel(0)).toBe("low");
    expect(uvLevel(2.9)).toBe("low");
    expect(uvLevel(3)).toBe("moderate");
    expect(uvLevel(5.9)).toBe("moderate");
    expect(uvLevel(6)).toBe("high");
    expect(uvLevel(7.9)).toBe("high");
    expect(uvLevel(8)).toBe("veryHigh");
    expect(uvLevel(10.9)).toBe("veryHigh");
    expect(uvLevel(11)).toBe("extreme");
  });
});

describe("3) 风向八方位", () => {
  it("方位换算正确", () => {
    expect(windDirectionKey(0)).toBe("N");
    expect(windDirectionKey(45)).toBe("NE");
    expect(windDirectionKey(90)).toBe("E");
    expect(windDirectionKey(180)).toBe("S");
    expect(windDirectionKey(215)).toBe("SW");
    expect(windDirectionKey(270)).toBe("W");
    expect(windDirectionKey(315)).toBe("NW");
  });

  it("越界角度被归一化（负数 / >360）", () => {
    expect(windDirectionKey(-45)).toBe("NW");
    expect(windDirectionKey(405)).toBe("NE");
    expect(windDirectionKey(720)).toBe("N");
  });
});

describe("4) 月相换算", () => {
  it("新月 / 满月 / 上下弦", () => {
    expect(moonPhaseKey(0)).toBe("new");
    expect(moonPhaseKey(0.5)).toBe("full");
    expect(moonPhaseKey(0.25)).toBe("firstQuarter");
    expect(moonPhaseKey(0.75)).toBe("lastQuarter");
  });

  it("越界相位被归一化", () => {
    expect(moonPhaseKey(1.5)).toBe("full");
    expect(moonPhaseKey(-0.5)).toBe("full");
  });

  it("当前月相返回合法档位", () => {
    const valid = ["new","waxingCrescent","firstQuarter","waxingGibbous","full","waningGibbous","lastQuarter","waningCrescent"];
    expect(valid).toContain(moonPhaseKey(SUN_MOON.moonPhase));
  });
});

describe("5) 雨势拐点识别（对标 Apple Weather）", () => {
  it("当前有雨、末尾转晴 -> stopping", () => {
    const r = findRainTurningPoint(MINUTE_RAIN);
    expect(r.kind).toBe("stopping");
    expect(r.inMinutes).toBeGreaterThan(0);
    expect(r.inMinutes).toBeLessThanOrEqual(60);
  });

  it("当前无雨、未来转雨 -> starting", () => {
    const series = [
      { offsetMin: 0, mmPerHour: 0.2 },
      { offsetMin: 10, mmPerHour: 0.4 },
      { offsetMin: 20, mmPerHour: 3.2 },
      { offsetMin: 30, mmPerHour: 6.8 },
    ];
    expect(findRainTurningPoint(series).kind).toBe("starting");
  });

  it("未来显著增强 -> peaking", () => {
    const series = [
      { offsetMin: 0, mmPerHour: 4 },
      { offsetMin: 10, mmPerHour: 6 },
      { offsetMin: 20, mmPerHour: 9 },
      { offsetMin: 30, mmPerHour: 7 },
    ];
    expect(findRainTurningPoint(series).kind).toBe("peaking");
  });

  it("强度平稳 -> steady", () => {
    const series = [
      { offsetMin: 0, mmPerHour: 5 },
      { offsetMin: 10, mmPerHour: 5.1 },
      { offsetMin: 20, mmPerHour: 4.9 },
      { offsetMin: 30, mmPerHour: 5.0 },
    ];
    expect(findRainTurningPoint(series).kind).toBe("steady");
  });

  it("空序列不抛异常", () => {
    expect(findRainTurningPoint([]).kind).toBe("steady");
    expect(findRainTurningPoint([{ offsetMin: 0, mmPerHour: 1 }]).kind).toBe("steady");
  });
});

describe("6) 风场生成（对标 Windy）", () => {
  it("网格尺寸与数组长度一致", () => {
    const f = buildWindField(5, 7, "TMD");
    expect(f.rows).toBe(5);
    expect(f.cols).toBe(7);
    expect(f.dirs).toHaveLength(35);
    expect(f.speeds).toHaveLength(35);
  });

  it("风向全部落在 [0,360)", () => {
    for (const m of ["TMD", "GFS", "ECMWF", "ICON"] as WeatherModel[]) {
      const f = buildWindField(7, 9, m);
      for (const d of f.dirs) {
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThan(360);
      }
    }
  });

  it("风速全部为正且有限", () => {
    const f = buildWindField(7, 9, "TMD");
    for (const s of f.speeds) {
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThan(0);
    }
  });

  it("不同模型输出不同的风场（模型分歧可见）", () => {
    const tmd = buildWindField(7, 9, "TMD");
    const gfs = buildWindField(7, 9, "GFS");
    const same = tmd.dirs.every((d, i) => d === gfs.dirs[i]);
    expect(same).toBe(false);
  });

  it("确定性：同一参数两次调用结果一致（不会闪烁）", () => {
    const a = buildWindField(7, 9, "ECMWF");
    const b = buildWindField(7, 9, "ECMWF");
    expect(a.dirs).toEqual(b.dirs);
    expect(a.speeds).toEqual(b.speeds);
  });
});

describe("7) 时间轴水位演变", () => {
  it("t=0 时缩放系数为 1", () => {
    expect(waterScaleAt(0)).toBe(1);
  });

  it("未来固定退水：系数随小时单调下降", () => {
    const vals = [0, 1, 2, 3, 4, 5, 6].map((h) => waterScaleAt(h));
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeLessThanOrEqual(vals[i - 1]);
    }
  });

  it("过去固定涨水：系数随回溯单调下降（越往回雨越小）", () => {
    // 从 -6h 到 0h 单调递增：系数越接近现在越大
    const vals = [-6, -5, -4, -3, -2, -1, -0.5, 0].map((h) => waterScaleAt(h));
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]);
    }
  });

  it("时间轴在 t=0 处连续（无断崖跳变）", () => {
    const below = waterScaleAt(-0.001);
    const at = waterScaleAt(0);
    const above = waterScaleAt(0.001);
    expect(Math.abs(at - below)).toBeLessThan(0.01);
    expect(Math.abs(above - at)).toBeLessThan(0.01);
  });

  it("缩放系数始终为正（不会出现负水深）", () => {
    for (let h = -6; h <= 6; h += 0.5) {
      expect(waterScaleAt(h)).toBeGreaterThan(0);
    }
  });

  it("scaleDepth 在 +4h 时显著低于当前值", () => {
    expect(scaleDepth(40, 4)).toBeLessThan(40);
  });

  it("scaleDepth 在 -4h 时显著低于当前值（雨还没下大）", () => {
    expect(scaleDepth(40, -4)).toBeLessThan(40);
  });

  it("scaleDepth 结果非负", () => {
    expect(scaleDepth(0, 6)).toBe(0);
    for (let h = -6; h <= 6; h += 0.5) {
      expect(scaleDepth(38, h)).toBeGreaterThanOrEqual(0);
    }
  });

  it("众包数据波动幅度更大", () => {
    const crowd = scaleDepth(40, 4, true);
    const official = scaleDepth(40, 4, false);
    expect(Math.abs(40 - crowd)).toBeGreaterThan(Math.abs(40 - official));
  });

  it("rainScaleAt 落在合理区间", () => {
    for (let h = -6; h <= 6; h += 0.5) {
      const s = rainScaleAt(h);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(2.2);
    }
  });
});

describe("8) 静态数据完整性", () => {
  it("当前天气字段齐全且取值合法", () => {
    expect(CURRENT_WEATHER.humidity).toBeGreaterThan(0);
    expect(CURRENT_WEATHER.humidity).toBeLessThanOrEqual(100);
    expect(CURRENT_WEATHER.cloudCover).toBeGreaterThanOrEqual(0);
    expect(CURRENT_WEATHER.cloudCover).toBeLessThanOrEqual(100);
    expect(CURRENT_WEATHER.pressureHpa).toBeGreaterThan(900);
    expect(CURRENT_WEATHER.pressureHpa).toBeLessThan(1100);
    expect(CURRENT_WEATHER.windDeg).toBeGreaterThanOrEqual(0);
    expect(CURRENT_WEATHER.windDeg).toBeLessThan(360);
  });

  it("分钟级降水覆盖 -30 ~ +60 且按时间升序", () => {
    expect(MINUTE_RAIN[0].offsetMin).toBe(-30);
    expect(MINUTE_RAIN[MINUTE_RAIN.length - 1].offsetMin).toBe(60);
    for (let i = 1; i < MINUTE_RAIN.length; i++) {
      expect(MINUTE_RAIN[i].offsetMin).toBeGreaterThan(MINUTE_RAIN[i - 1].offsetMin);
    }
  });

  it("未来 4 天预报低温不高于高温", () => {
    for (const d of DAILY_OUTLOOK) {
      expect(d.lowC).toBeLessThanOrEqual(d.highC);
    }
  });

  it("日出早于日落", () => {
    expect(SUN_MOON.sunrise < SUN_MOON.sunset).toBe(true);
  });
});
