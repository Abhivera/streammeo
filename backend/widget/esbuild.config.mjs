import * as esbuild from "esbuild";
import { mkdir } from "node:fs/promises";

const watch = process.argv.includes("--watch");

await mkdir("dist", { recursive: true });

const ctx = await esbuild.context({
  entryPoints: ["src/index.ts"],
  outfile: "dist/widget.js",
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  minify: !watch,
  sourcemap: watch,
});

if (watch) {
  await ctx.watch();
  console.info("widget: watching…");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.info("widget: built dist/widget.js");
}
