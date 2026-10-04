const { chromium } = require("playwright");
(async () => {
  const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = b.contexts()[0];
  const p = ctx.pages().find(pg => pg.url().includes("github.com/new"));

  // 再次核对表单状态（自定义组件下用文本+class 判断）
  const state = await p.evaluate(() => {
    const nameEl = document.querySelector("#repository-name-input");
    // 找 Public 选中态
    const quizTexts = Array.from(document.querySelectorAll("button,label,div")).map(e => e.textContent?.trim()).filter(Boolean);
    return { name: nameEl ? nameEl.value : null };
  });
  console.log("repo name:", state.name);

  // 点击 Create repository
  const btn = p.getByRole("button", { name: "Create repository" });
  console.log("create btn count:", await btn.count());
  await btn.first().click();
  await p.waitForTimeout(8000);
  console.log("AFTER CREATE URL:", p.url());
  await p.screenshot({ path: "gh-created.png" });
  await b.close();
})().catch(e => console.log("ERR:", e.message));
