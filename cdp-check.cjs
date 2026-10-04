const { chromium } = require("playwright");
(async () => {
  const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = b.contexts()[0];
  const pages = ctx.pages();
  console.log("connected. pages:", pages.length);
  for (const p of pages) console.log(" -", (await p.title()).slice(0,40), "|", p.url().slice(0,60));
  await b.close();
})().catch(e => console.log("ERR:", e.message));
