const { chromium } = require("playwright");
(async () => {
  const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = b.contexts()[0];
  const p = ctx.pages().find(pg => pg.url().includes("github.com/new"));
  if (!p) { console.log("new page gone"); await b.close(); return; }
  await p.bringToFront();
  // 等待表单真正就绪：等 "Create repository" 按钮或 visibility radio 出现
  try {
    await p.waitForSelector('input[type="radio"][value="public"]', { timeout: 30000 });
    console.log("public radio appeared");
  } catch { console.log("public radio NEVER appeared"); }
  await p.waitForTimeout(2000);

  const inputs = await p.$$eval("input", els => els.map(e => ({ type: e.type, name: e.name, id: e.id, value: e.value })));
  console.log("ALL INPUTS:", JSON.stringify(inputs));
  await p.screenshot({ path: "gh-wait.png" });
  await b.close();
})().catch(e => console.log("ERR:", e.message));
