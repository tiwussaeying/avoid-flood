const { chromium } = require("playwright");
(async () => {
  const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = b.contexts()[0];
  const p = await ctx.newPage();
  await p.goto("https://github.com/tiwussaeying/avoid-flood/settings/pages", { waitUntil: "domcontentloaded", timeout: 45000 });
  await p.waitForTimeout(5000);
  console.log("URL:", p.url());
  const info = await p.evaluate(() => {
    const txt = document.body.innerText.replace(/\s+/g, " ");
    return { hasBuildDeployment: txt.includes("Build and deployment"), snippet: txt.slice(0, 400) };
  });
  console.log(JSON.stringify(info, null, 1));
  // 找 Source 下拉
  const selects = await p.$$eval("select", els => els.map(e => ({ name: e.name, id: e.id, value: e.value, options: Array.from(e.options).map(o => o.value + "=" + o.text) })));
  console.log("SELECTS:", JSON.stringify(selects));
  await p.screenshot({ path: "gh-pages-settings.png", fullPage: true });
  await b.close();
})().catch(e => console.log("ERR:", e.message));
