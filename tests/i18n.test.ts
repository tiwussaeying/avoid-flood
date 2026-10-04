/**
 * i18n.test.ts —— 多语言完整性测试
 *
 * 核心保障：三种语言的键必须完全一致（强类型之外再加运行时校验），
 * 防止新增文案时漏翻某种语言。
 */
import { describe, it, expect } from "vitest";
import { DICTS } from "../src/i18n/i18n.js";
import { th } from "../src/i18n/th.js";
import { en } from "../src/i18n/en.js";
import { zh } from "../src/i18n/zh.js";

describe("i18n 多语言完整性", () => {
  it("th/en/zh 三语键集合完全一致", () => {
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(en)).toEqual(keys(th));
    expect(keys(zh)).toEqual(keys(th));
  });

  it("所有字符串型文案非空", () => {
    for (const [code, dict] of Object.entries(DICTS)) {
      for (const [key, value] of Object.entries(dict)) {
        if (typeof value === "string") {
          expect(value.length, `${code}.${key} 不应为空`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("函数型文案（复数/插值）在三语下均可调用且返回非空", () => {
    expect(th.floodCount(3)).toContain("3");
    expect(en.floodCount(1)).toContain("1");
    expect(zh.floodCount(2)).toContain("2");
    expect(zh.currentDepth(25)).toContain("25");
    expect(zh.detourPoint(1)).toContain("1");
    expect(en.minutesAgo(15)).toContain("15");
  });

  it("泰语默认语言不被误标", () => {
    expect(DICTS.th.appTagline).toContain("น้ำท่วม");
  });
});
