# DEPLOY.md — 部署与 CI/CD 指南

本文件说明如何把 Bangkok FloodNav 发布到公网，以及 GitHub Actions 自动构建的配置。

---

## 一、部署方案（二选一）

### 方案 A：Vercel（推荐，最快）

已在根目录提供 `vercel.json`，包含 SPA 路由重写与 Service Worker 缓存头。

```bash
# 方式 1：CLI 一键部署
npm i -g vercel
vercel            # 首次会引导登录并关联项目，按提示回车即可
vercel --prod     # 部署到生产环境，返回可访问的公网 URL
```

```bash
# 方式 2：Git 关联（推送自动部署）
# 在 vercel.com 用 GitHub 账号导入本仓库，之后每次 push 自动部署
```

`vercel.json` 已配置：
- 构建命令 `npm run build:pwa`、输出目录 `dist`
- SPA 重写（排除 `sw.js` / `manifest.json` / `icons/` / `assets/`，避免静态资源被错误重写）
- `sw.js` 强制 `max-age=0` 以便及时更新；`assets/` 与 `icons/` 长缓存

> **注意**：Vercel 上 `base` 保持默认 `/`，无需设置 `VITE_BASE`。

---

### 方案 B：GitHub Pages

已提供 `.github/workflows/deploy.yml`，推送 `main` / `master` 分支即自动：
类型检查 → 单测 → 构建（自动注入 `base=/<repo>/`）→ 生成 `404.html` 兜底 SPA 路由 → 发布。

**首次需在 GitHub 仓库开启 Pages：**

1. 打开仓库 → `Settings` → `Pages`
2. `Build and deployment` → `Source` 选择 **GitHub Actions**
3. 推送代码后，Actions 自动部署，URL 形如 `https://<用户名>.github.io/<repo>/`

> 子路径部署由工作流自动处理（`VITE_BASE=/<repo>/`），无需手动改配置。

---

## 二、GitHub Actions 工作流

| 工作流 | 触发 | 作用 |
|---|---|---|
| `deploy.yml` | push main/master | 跑测试 → 构建 → 发布到 GitHub Pages |
| `build-apps.yml` | push / PR / 手动 | 质量门禁 + Android APK 出包 + iOS 编译校验 |

### build-apps.yml 三个阶段

1. **quality（ubuntu）**：`npm run typecheck` + `npm run test`
2. **android（ubuntu）**：配置 JDK 17 + Android SDK → `npx cap sync android` → `./gradlew assembleDebug`
   - 产物 `bangkok-floodnav-debug-apk`（含 `app-debug.apk`），在 Actions 运行页 `Artifacts` 区下载
3. **ios（macos-14）**：`npx cap sync ios` → `xcodebuild -scheme App -sdk iphonesimulator`（禁用签名，仅验证可编译）

> 也可在 Actions 页面点击 `Run workflow` 手动触发。

---

## 三、推送到 GitHub 的标准命令

```bash
cd C:\Users\rain\Projects\avoid-flood

# 1. 确认分支与状态
git status
git branch --show-current

# 2. 提交部署配置
git add .
git commit -m "chore: add deployment config, CI/CD workflows and GitHub Pages support"

# 3. 关联远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/<你的用户名>/<仓库名>.git

# 4. 推送（本地分支为 master 时）
git push -u origin master

# 若希望主分支名为 main（工作流两者都支持，但 GitHub 默认 main）：
#   git branch -M main
#   git push -u origin main
```

---

## 四、部署后验证清单

- [ ] 打开部署 URL，页面正常渲染（深色 UI）
- [ ] 语言切换 TH / EN / CN 均可用，刷新后保持
- [ ] 浏览器 DevTools → `Application` → `Manifest` 无报错
- [ ] `Application` → `Service Workers` 显示已激活
- [ ] 手机浏览器「添加到主屏幕」后全屏运行
- [ ] 点击「一键调起 Google Maps」能正确打开带途经点的链接

---

## 五、常见问题

| 问题 | 原因与解决 |
|---|---|
| GitHub Pages 白屏 / 资源 404 | `base` 未设置。工作流已注入 `VITE_BASE`；手动构建时需 `VITE_BASE=/<repo>/ npm run build:pwa` |
| Pages 显示 404 但仓库有文件 | 未开启 Pages（Settings → Pages → Source 选 GitHub Actions），或未生成 `dist/.nojekyll` |
| Vercel 上 `sw.js` 返回 HTML | 重写规则未排除静态资源。本项目 `vercel.json` 已用负向断言排除 |
| Android 构建报 SDK 未找到 | 本地需配置 `ANDROID_HOME`；CI 中由 `android-actions/setup-android@v3` 自动提供 |
| iOS 构建失败提示签名 | 本工作流用 `CODE_SIGNING_ALLOWED=NO` 仅做编译校验；正式出包需 Mac + 签名证书 |
| Service Worker 不更新 | `sw.js` 缓存头已是 `must-revalidate`；如仍缓存，改 `CACHE_VERSION` 常量 |
