/**
 * adapters.test.ts —— 数据接入层与退水机制测试
 */
import { describe, it, expect } from "vitest";
import {
  parseTweetText,
  parseJs100Tweets,
  JS100_BASE_CONFIDENCE,
  BLOCKING_MIN_DEPTH_CM,
} from "../src/services/adapters/js100Adapter.js";
import {
  parseBmaTicket,
  parseBmaTickets,
  BMA_DEFAULT_DEPTH_CM,
  BmaTicket,
} from "../src/services/adapters/bmaAdapter.js";
import {
  applyClearedVote,
  pruneClearedFloods,
} from "../src/store/floodStore.js";
import { createFloodEvent } from "../src/domain/floodEvent.js";

const NOW = new Date("2026-10-04T15:30:00Z");

describe("1) JS100 泰语推文解析 (js100Adapter)", () => {
  it("匹配 ซม. 公分：'น้ำท่วมสูง 20 ซม.'", () => {
    const p = parseTweetText("น้ำท่วมสูง 20 ซม. ที่อโศก");
    expect(p.depthCm).toBe(20);
    expect(p.area).toBe("อโศก"); // Asok
  });

  it("匹配 cm 英文单位：'flood 30 cm at Sukhumvit'", () => {
    const p = parseTweetText("flood 30 cm at Sukhumvit");
    expect(p.depthCm).toBe(30);
  });

  it("米单位换算：'ท่วม 0.5 ม.' -> 50cm", () => {
    const p = parseTweetText("ท่วม 0.5 ม. บางนา");
    expect(p.depthCm).toBe(50);
    expect(p.area).toBe("บางนา");
  });

  it("阻断语义 'รถเล็กผ่านไม่ได้' 抬升到 >=30cm 且标记 isBlocking", () => {
    const p = parseTweetText("อโศก รถเล็กผ่านไม่ได้ น้ำท่วม");
    expect(p.isBlocking).toBe(true);
    expect(p.depthCm).toBeGreaterThanOrEqual(BLOCKING_MIN_DEPTH_CM);
  });

  it("明确水深优先于阻断语义：'10 ซม. แต่รถเล็กผ่านไม่ได้' 仍取 10cm", () => {
    const p = parseTweetText("10 ซม. แต่รถเล็กผ่านไม่ได้");
    // 用户已给出明确数字，尊重明确值；但仍标记为阻断语义
    expect(p.depthCm).toBe(10);
    expect(p.isBlocking).toBe(true);
  });

  it("阻断语义但无明确水深（'ท่วมสูง' 无数字）-> 抬升到 30cm", () => {
    const p = parseTweetText("อโศก น้ำท่วมสูง ผ่านไม่ได้");
    expect(p.isBlocking).toBe(true);
    expect(p.depthCm).toBe(BLOCKING_MIN_DEPTH_CM);
  });

  it("无水深无阻断 -> 保守默认值", () => {
    const p = parseTweetText("มีน้ำขังที่ถนน");
    expect(p.depthCm).toBe(20);
    expect(p.isBlocking).toBe(false);
  });

  it("parseJs100Tweets：带坐标推文转为 FloodEvent，置信度 0.85", () => {
    const events = parseJs100Tweets([
      {
        id: "123",
        text: "น้ำท่วม 25 ซม. สุขุมวิท",
        createdAt: NOW,
        coords: [13.737, 100.56],
        url: "https://x.com/js100radio/status/123",
      },
    ]);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.source).toBe("JS100");
    expect(e.waterDepthCm).toBe(25);
    expect(e.confidence).toBe(JS100_BASE_CONFIDENCE);
    expect(e.sourceUrl).toBe("https://x.com/js100radio/status/123");
    expect(e.id).toBe("js100-123");
  });

  it("parseJs100Tweets：无坐标推文被跳过", () => {
    const events = parseJs100Tweets([
      { id: "x", text: "น้ำท่วม 20 ซม.", createdAt: NOW },
    ]);
    expect(events).toHaveLength(0);
  });
});

describe("2) BMA 工单适配器 (bmaAdapter)", () => {
  const base: BmaTicket = {
    ticketId: "TRF-001",
    coords: { lat: 13.73, lng: 100.56 },
    title: "น้ำท่วมถนนสุขุมวิท",
    status: "in_progress",
    timestamp: NOW,
  };

  it("in_progress 工单转为 BMA FloodEvent，默认水深 20cm", () => {
    const e = parseBmaTicket(base);
    expect(e).not.toBeNull();
    expect(e!.source).toBe("BMA");
    expect(e!.waterDepthCm).toBe(BMA_DEFAULT_DEPTH_CM);
    expect(e!.id).toBe("bma-TRF-001");
  });

  it("resolved 工单被忽略 -> null", () => {
    expect(parseBmaTicket({ ...base, status: "resolved" })).toBeNull();
  });

  it("明确水深优先于标签推断", () => {
    const e = parseBmaTicket({ ...base, waterDepthCm: 45, tags: ["ท่วมขัง"] });
    expect(e!.waterDepthCm).toBe(45);
  });

  it("高风险标签抬升水深：'ท่วมสูง' -> 40cm", () => {
    const e = parseBmaTicket({ ...base, tags: ["น้ำท่วมสูง"] });
    expect(e!.waterDepthCm).toBe(40);
  });

  it("坐标数组形式 [lat,lng] 正常解析", () => {
    const e = parseBmaTicket({ ...base, coords: [13.7, 100.5] });
    expect(e!.latitude).toBe(13.7);
    expect(e!.longitude).toBe(100.5);
  });

  it("批量解析过滤已解决工单", () => {
    const list = parseBmaTickets([
      base,
      { ...base, ticketId: "TRF-002", status: "resolved" },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("bma-TRF-001");
  });
});

describe("3) 反向退水机制 (floodStore 纯函数)", () => {
  const flood = createFloodEvent({
    id: "f1",
    latitude: 13.73,
    longitude: 100.56,
    waterDepthCm: 50,
    source: "CROWD",
    reportedAt: NOW,
  });

  it("applyClearedVote 累加票数但不清除", () => {
    const after1 = applyClearedVote([flood], "f1");
    expect(after1[0].clearedVotes).toBe(1);
    // 1 票不足以解除
    expect(pruneClearedFloods(after1, NOW)).toHaveLength(1);
  });

  it("达到 2 票后 CLEARED，prune 立即剔除", () => {
    let list = applyClearedVote([flood], "f1");
    list = applyClearedVote(list, "f1");
    expect(list[0].clearedVotes).toBe(2);
    expect(pruneClearedFloods(list, NOW)).toHaveLength(0);
  });

  it("过期的积水也会被 prune 剔除", () => {
    const old = createFloodEvent({
      id: "old",
      latitude: 13.7,
      longitude: 100.5,
      waterDepthCm: 30,
      source: "BMA",
      reportedAt: new Date(NOW.getTime() - 200 * 60_000), // 200 分钟前
    });
    expect(pruneClearedFloods([old], NOW)).toHaveLength(0);
  });

  it("投票作用于正确目标，其他积水不受影响", () => {
    const other = createFloodEvent({
      id: "f2",
      latitude: 13.9,
      longitude: 100.9,
      waterDepthCm: 30,
      source: "BMA",
      reportedAt: NOW,
    });
    const after = applyClearedVote([flood, other], "f1");
    expect(after.find((f) => f.id === "f2")!.clearedVotes).toBe(0);
    expect(after.find((f) => f.id === "f1")!.clearedVotes).toBe(1);
  });
});

