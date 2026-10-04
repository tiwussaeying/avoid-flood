const { chromium } = require("playwright");
(async () => {
  const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const ctx = b.contexts()[0];
  let p = ctx.pages().find(pg => pg.url().includes("github.com/new"));
  if (!p) { p = await ctx.newPage(); await p.goto("https://github.com/new", { waitUntil: "domcontentloaded" }); }
  await p.bringToFront();
  await p.waitForSelector("#repository-name-input", { timeout: 30000 });
  await p.waitForTimeout(3000);

  // 重新填写（用键盘输入触发 React 受控更新）
  const nameInput = p.locator("#repository-name-input");
  await nameInput.click();
  await nameInput.press("Control+a");
  await nameInput.pressSequentially("avoid-flood", { delay: 50 });
  await p.waitForTimeout(2500);

  const val = await nameInput.inputValue();
  console.log("name after typing:", JSON.stringify(val));

  // 校验可用性提示（GitHub 会异步校验并显示 available）
  const hint = await p.evaluate(() => {
    const el = document.querySelector('[class*="availability"], .FormControl-hint, [aria-live]');
    return el ? el.textContent.trim().slice(0, 120) : "(no hint)";
  });
  console.log("hint:", hint);
  await p.screenshot({ path: "gh-final-check.png" });

  // 只在名字真的存在时才点
  if (val && val.trim() === "avoid-flood") {
    const btn = p.getByRole("button", { name: "Create repository" });
    await btn.first().click();
    await p.waitForTimeout(9000);
    console.log("AFTER CREATE URL:", p.url());
    await p.screenshot({ path: "gh-created.png" });
  } else {
    console.log("ABORT: name not set, not clicking");
  }
  await b.close();
})().catch(e => console.log("ERR:", e.message));
