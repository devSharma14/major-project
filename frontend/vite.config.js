import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Flask runs on :5000 and exposes /api/*. During `npm run dev` Vite serves
// on :5173 and proxies /api to Flask so the React app can use same-origin fetches.
// `npm run build` emits static assets into `dist/`, which Flask can serve if
// you update backend/app.py's FRONTEND_DIR to point there.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
