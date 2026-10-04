import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * base 策略：
 *   - 默认 "/"（Vercel / 自有域名 / 本地）
 *   - GitHub Pages 项目页部署在 /<repo>/ 子路径，通过环境变量 VITE_BASE 注入，
 *     由 .github/workflows/deploy.yml 设置为 /<repo>/
 *   - 自定义域名或用户页(username.github.io) 仍用 "/"
 */
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
