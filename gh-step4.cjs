const { chromium } = require("playwright");
(async () => {
  const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = b.contexts()[0];
  const p = ctx.pages().find(pg => pg.url().includes("github.com/new"));
  await p.bringToFront();
  await p.reload({ waitUntil: "networkidle", timeout: 60000 });
  await p.waitForTimeout(4000);
  const info = await p.evaluate(() => ({
    url: location.href,
    title: document.title,
    inputs: document.querySelectorAll("input").length,
    radios: document.querySelectorAll('input[type=radio]').length,
    checks: document.querySelectorAll('input[type=checkbox]').length,
    buttons: Array.from(document.querySelectorAll("button")).map(b => b.textContent.trim()).filter(Boolean).slice(0,8),
  }));
  console.log(JSON.stringify(info, null, 1));
  await p.screenshot({ path: "gh-reload.png" });
  await b.close();
})().catch(e => console.log("ERR:", e.message));
