import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { infraDir } from "./load-env.mjs";

const backendRoot = resolve(infraDir, "..");

function run(label, command, args, cwd) {
  console.log(`[cdk] ${label}...`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`[cdk] ${label} failed.`);
    process.exit(result.status ?? 1);
  }
}

run("Compiling CDK app", "npm", ["run", "build"], infraDir);
run("Compiling backend", "npm", ["run", "build"], backendRoot);
run("Bundling Lambda functions", "node", ["scripts/bundle-lambdas.mjs"], infraDir);
