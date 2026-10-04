/**
 * registerSW.ts —— 注册 Service Worker（仅在产线构建/支持时启用）
 *
 * 使用基于当前页面地址解析的相对路径，兼容根域名与
 * GitHub Pages 子路径（/<repo>/）两种部署形态。
 */
export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const swUrl = new URL("sw.js", `${window.location.origin}${import.meta.env.BASE_URL}`);
    navigator.serviceWorker.register(swUrl.href).catch(() => {
      /* 注册失败不影响主功能 */
    });
  });
}
