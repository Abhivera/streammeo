import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": "http://127.0.0.1:3001",
      "/workspace": "http://127.0.0.1:3001",
      "/billing": "http://127.0.0.1:3001",
      "/health": "http://127.0.0.1:3001",
      // Voice widget testing: serve widget from localhost:5173 with data-backend-url "" (omit) still needs API — use backend port.
      "/socket.io": {
        target: "http://127.0.0.1:3001",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
