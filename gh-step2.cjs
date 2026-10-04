const { chromium } = require("playwright");
(async () => {
  const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = b.contexts()[0];
  const pages = ctx.pages();
  let p = pages.find(pg => pg.url().includes("github.com/new"));
  if (!p) { p = await ctx.newPage(); await p.goto("https://github.com/new", { waitUntil: "domcontentloaded" }); }
  await p.bringToFront();
  await p.waitForTimeout(1500);

  // 1. 填仓库名
  const nameInput = p.locator("#repository-name-input");
  await nameInput.fill("");
  await nameInput.type("avoid-flood", { delay: 40 });
  await p.waitForTimeout(1200);

  // 2. 确认 Public 选中
  const publicRadio = p.locator('input[type="radio"][value="public"]');
  if (await publicRadio.count() > 0) { await publicRadio.check(); console.log("Public radio checked"); }
  else { console.log("WARN: public radio not found"); }

  // 3. 确认三个初始化复选框都未勾选
  const checks = await p.$$eval('input[type="checkbox"]', els => els.map(e => ({ name: e.name, checked: e.checked })));
  console.log("checkboxes:", JSON.stringify(checks));
  for (const c of checks) {
    if (c.checked && c.name) {
      await p.uncheck(`input[name="${c.name}"]`);
      console.log("unchecked:", c.name);
    }
  }
  await p.waitForTimeout(800);
  await p.screenshot({ path: "gh-filled.png" });

  // 4. 输出最终将要提交的状态供确认
  const finalName = await nameInput.inputValue();
  const isPublic = await p.locator('input[type="radio"][value="public"]').isChecked().catch(() => null);
  console.log("FINAL name:", finalName, "| public:", isPublic);
  console.log("formActionHint:", await p.locator('form[action*="repositories"]').count());
  await b.close();
})().catch(e => console.log("ERR:", e.message));
