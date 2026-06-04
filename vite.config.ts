import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.API_TARGET ?? "http://localhost:8060";
const orchTarget = process.env.ORCH_TARGET ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/orch": {
        target: orchTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/orch/, ""),
      },
    },
  },
  build: {
    outDir: "../static",
    emptyOutDir: true,
  },
});