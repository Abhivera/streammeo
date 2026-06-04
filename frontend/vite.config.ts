import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // The frontend is its own project; VITE_* vars are read from the shared root .env.
  // A file in public/ (e.g. public/widget.js) is still served at the site root automatically.
  envDir: path.resolve(__dirname, ".."),
  server: {
    // Dev-only: forward REST (auth/workspace) and the voice HTTP endpoints to the backend.
    proxy: {
      "/api/v1": "http://127.0.0.1:3001",
    },
  },
});
