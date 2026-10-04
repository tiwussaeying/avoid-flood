/**
 * registerSW.ts —— 注册 Service Worker（仅在产线构建/支持时启用）
 */
export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* 注册失败不影响主功能 */
    });
  });
}
