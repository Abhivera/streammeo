import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "public",
    emptyOutDir: false,
    minify: "esbuild",
    lib: {
      entry: path.resolve(__dirname, "src/chat-widget/index.ts"),
      formats: ["iife"],
      name: "StreammeoChatWidget",
      fileName: () => "chat-widget",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: "chat-widget.js",
      },
    },
  },
});
