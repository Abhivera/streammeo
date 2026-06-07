import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // The frontend is its own project; VITE_* vars are read from the shared root .env.
  // Files in public/ (e.g. chat-widget.js) are served at the site root automatically.
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
