const { chromium } = require("playwright");
(async () => {
  const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = b.contexts()[0];
  const p = await ctx.newPage();
  await p.goto("https://github.com/new", { waitUntil: "domcontentloaded", timeout: 45000 });
  await p.waitForTimeout(3000);
  console.log("URL:", p.url());
  console.log("TITLE:", await p.title());
  // 判断是否在登录态
  const body = await p.evaluate(() => document.body.innerText.slice(0, 300));
  console.log("BODY HEAD:", body.replace(/\s+/g, " ").slice(0, 200));
  // 找仓库名输入框
  const inputs = await p.$$eval("input", els => els.map(e => ({ name: e.name, id: e.id, ph: e.placeholder, type: e.type })));
  console.log("INPUTS:", JSON.stringify(inputs.slice(0, 10)));
  await p.screenshot({ path: "gh-new.png", fullPage: false });
  await b.close();
})().catch(e => console.log("ERR:", e.message));
