import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const widgetDist = path.resolve(__dirname, "../widget/dist/widget.js");

/** Dev-only: same-origin `/widget.js` for the embed playground iframe. */
function serveWidgetJs(): import("vite").Plugin {
  return {
    name: "streammeo-serve-widget-js",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (url !== "/widget.js" && !url.startsWith("/widget.js?")) {
          next();
          return;
        }
        try {
          const buf = fs.readFileSync(widgetDist);
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          res.end(buf);
        } catch {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(
            "Widget bundle not found. From repo root: npm run -w @streammeo/widget build",
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveWidgetJs()],
  server: {
    // Dev-only: forward REST and Socket.IO to the backend (MongoDB is used only on the server).
    proxy: {
      "/auth": "http://127.0.0.1:3001",
      "/workspace": "http://127.0.0.1:3001",
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
