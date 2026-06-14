import { spawnSync } from "node:child_process";
import {
  applyAwsDefaults,
  envFilePath,
  infraDir,
  loadEnvFile,
  validateDeployEnv,
} from "./load-env.mjs";

const STACK_NAME = "StreammeoApi";

const [command, ...extraArgs] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/run-cdk.mjs <deploy|destroy|synth|diff|bootstrap> [cdk args...]");
  process.exit(1);
}

const envLoaded = loadEnvFile();
applyAwsDefaults();

if (envLoaded) {
  console.log(`[cdk] Env: ${envFilePath}`);
} else {
  console.warn(`[cdk] No ${envFilePath}`);
}

console.log(`[cdk] Region: ${process.env.AWS_REGION}`);

if (command === "deploy" || command === "synth" || command === "diff") {
  validateDeployEnv();
}

const cdkArgs = buildCdkArgs(command, extraArgs);
console.log(`[cdk] Running: cdk ${cdkArgs.join(" ")}\n`);

const result = spawnSync("npx", ["cdk", ...cdkArgs], {
  cwd: infraDir,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

process.exit(result.status ?? 1);

function buildCdkArgs(cmd, args) {
  switch (cmd) {
    case "deploy":
      return [
        "deploy",
        STACK_NAME,
        "--require-approval",
        "never",
        "--outputs-file",
        "cdk-outputs.json",
        ...args,
      ];
    case "destroy":
      return ["destroy", STACK_NAME, ...args];
    case "synth":
      return ["synth", STACK_NAME, ...args];
    case "diff":
      return ["diff", STACK_NAME, ...args];
    case "bootstrap":
      return ["bootstrap", ...args];
    default:
      console.error(`[cdk] Unknown command: ${cmd}`);
      process.exit(1);
  }
}
