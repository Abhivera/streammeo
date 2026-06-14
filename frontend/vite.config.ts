import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // VITE_* vars are read from the shared repo-root `.env`.
  // Local dev: leave VITE_API_URL empty → proxy below forwards /api/v1 to Fastify.
  // Production: set VITE_API_URL to the API Gateway URL from `npm run cdk:deploy`.
  envDir: path.resolve(__dirname, ".."),
  server: {
    proxy: {
      "/api/v1": "http://127.0.0.1:3001",
      "/socket.io": {
        target: "http://127.0.0.1:3001",
        ws: true,
      },
    },
  },
});
