# RELEASE.md — Bangkok FloodNav 发布与打包指南

> 泰国暴雨避水路线规划 App · 一套代码 → PWA / Android APK / iOS

---

## 一、环境要求

| 目标 | 必需环境 |
|---|---|
| **PWA（任意设备）** | Node.js ≥ 20 |
| **Android APK** | Node.js + JDK 17 + Android SDK（或 Android Studio） |
| **iOS 包** | **macOS + Xcode 15+**（Windows 无法编译 iOS） |

---

## 二、一键本地运行 PWA

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:5173/`。
手机同局域网访问 `http://<你的电脑IP>:5173/` 即可在手机浏览器测试。
Android / iOS 浏览器中打开后，通过「添加到主屏幕」可全屏运行（PWA 已配置 manifest + Service Worker 离线缓存）。

**产线预览（含离线能力）：**

```bash
npm run build:pwa     # 产出 dist/
npm run preview       # 本地起静态服务器预览 dist（Service Worker 生效）
```

> ⚠️ Service Worker 仅在 `http(s)` 且为产线构建时生效，`npm run dev` 不注册。

---

## 三、Android：产出 APK

### 1. 生成 / 同步原生工程

```bash
npm run build:pwa     # 构建 Web 资源到 dist/
npx cap sync android  # 同步到 android/ 原生工程
```

（或一条命令：`npm run cap:sync`）

### 2. 真机运行 / 调试

```bash
npx cap run android
```

### 3. 打包 APK

方式 A — 图形化（推荐）：

```bash
npx cap open android   # 用 Android Studio 打开
```

在 Android Studio 中：`Build > Build Bundle(s) / APK(s) > Build APK(s)`。

方式 B — 命令行（需 Android SDK，`ANDROID_HOME` 已配置）：

```bash
cd android
./gradlew assembleDebug      # 调试包，产物在 app/build/outputs/apk/debug/
./gradlew assembleRelease    # 正式包（需配置签名）
```

### 4. Android Intent 穿透（已配置）

`android/app/src/main/AndroidManifest.xml` 已加入 `<queries>` 白名单，
允许 App 唤起以下原生地图应用：

- `com.google.android.apps.maps`（Google Maps）
- `com.waze`（Waze）
- 以及 Baidu / Amap / Tencent 地图
- 通用 `https` / `geo` / `google.navigation` / `waze` scheme

> Android 11 (API 30) 起，未声明的包不可见；缺少 `<queries>` 会导致 `启动外部地图失败`。

---

## 四、iOS：在 Mac 上打包

iOS 工程结构**已生成**（`ios/App/App.xcodeproj`，Swift Package Manager），
且 `Info.plist` 已配置 `LSApplicationQueriesSchemes` 地图应用白名单。

**Windows 无法编译 iOS**，需在 Mac 上执行：

```bash
# 1. 拉取代码
git clone <你的仓库地址>
cd avoid-flood

# 2. 安装依赖并同步 Web 资源
npm install
npm run cap:sync

# 3. 用 Xcode 打开
npx cap open ios
```

在 Xcode 中：

1. 选择签名 Team（Apple Developer 账号，$99/年）；
2. 选择目标设备 / 模拟器；
3. `Product > Archive` → `Distribute App` 上传 App Store 或导出 Ad-Hoc 包。

### 推送到 GitHub 供 Mac 打包

```bash
git add .
git commit -m "chore: prepare iOS/Android release"
git remote add origin <你的仓库地址>
git push -u origin main
```

Mac 端只需 `git clone` → `npm install` → `npm run cap:sync` → `npx cap open ios`。

---

## 五、版本更新流程（每次改代码后）

```bash
npm run test          # 单元测试必须全绿
npm run build:pwa     # 构建 Web
npx cap sync          # 同步到 Android + iOS 工程
```

---

## 六、产物结构说明

```
avoid-flood/
├── dist/                     # PWA 构建产物（部署此目录即可上线网页版）
│   ├── index.html
│   ├── manifest.json         # PWA 清单
│   ├── sw.js                 # Service Worker（离线缓存）
│   ├── icons/                # 应用图标
│   └── assets/               # JS / CSS
├── android/                  # Android 原生工程（Capacitor 生成）
│   └── app/src/main/
│       ├── AndroidManifest.xml   # 含 <queries> 地图白名单
│       └── assets/public/        # 同步进来的 Web 资源
└── ios/                      # iOS 原生工程（Capacitor 生成）
    └── App/App/
        ├── Info.plist            # 含 LSApplicationQueriesSchemes
        └── public/               # 同步进来的 Web 资源
```

---

## 七、常见问题

| 问题 | 解决 |
|---|---|
| 唤起地图 App 失败 | 检查 `<queries>`（Android）/ `LSApplicationQueriesSchemes`（iOS）是否包含目标包名 |
| `npx cap sync` 报找不到 webDir | 先执行 `npm run build:pwa` 生成 `dist/` |
| iOS 打不开 | 必须在 macOS + Xcode 环境，Windows 无法编译 |
| 离线打不开 | Service Worker 只在产线构建 + http(s) 下生效，用 `npm run preview` 验证 |
