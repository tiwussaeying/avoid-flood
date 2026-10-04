/**
 * launch.ts —— 统一的「打开外部链接」实现
 *
 * 环境自适应：
 *   - 在 Capacitor 原生容器（Android WebView）中，window.open / location 跳转
 *     会被原生层拦截，从而按 AndroidManifest <queries> 白名单唤起对应原生 App
 *     （Google Maps / Waze 等）；
 *   - 在普通浏览器 (PWA) 中则打开 Universal Link 网页版。
 *
 * 说明：@capacitor/app 在 v8 中未提供 openUrl API，因此这里统一走
 * window.open —— Capacitor WebView 会正确处理外链与外链 Intent。
 */

/** 是否运行在 Capacitor 原生容器中 */
export function isNativePlatform(): boolean {
  const cap = (
    globalThis as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean };
    }
  ).Capacitor;
  return typeof cap?.isNativePlatform === "function"
    ? cap.isNativePlatform()
    : false;
}

/**
 * 打开外部链接（环境自适应）。
 * 返回 Promise 以便调用方统一 await（当前实现为同步打开）。
 */
export async function openExternal(url: string): Promise<void> {
  // Capacitor 原生 WebView 会拦截 window.open 并转交原生处理
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    // 弹窗被拦截时回退到同窗口跳转
    window.location.href = url;
  }
}
