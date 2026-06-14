import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const infraDir = resolve(scriptsDir, "..");
const backendRoot = resolve(infraDir, "..");
const outRoot = resolve(infraDir, "dist", "lambda");

const handlers = [
  { name: "api-handler", entry: "src/lambda/api-handler.ts" },
  { name: "sla-checker", entry: "src/lambda/sla-checker.ts" },
  { name: "email-worker", entry: "src/lambda/email-worker.ts" },
];

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

for (const handler of handlers) {
  bundleHandler(handler.name, resolve(backendRoot, handler.entry));
}

console.log("[cdk] Lambda bundles written to infrastructure/dist/lambda/\n");

function bundleHandler(name, entry) {
  const outdir = resolve(outRoot, name);
  mkdirSync(outdir, { recursive: true });

  esbuild.buildSync({
    entryPoints: [entry],
    outfile: resolve(outdir, "index.js"),
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    minify: true,
    sourcemap: false,
    logLevel: "silent",
  });

  console.log(`[cdk] Bundled ${name}`);
}
