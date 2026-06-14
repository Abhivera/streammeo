import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
export const infraDir = resolve(scriptsDir, "..");
export const repoRoot = resolve(infraDir, "../..");
export const envFilePath = resolve(repoRoot, ".env");

export function loadEnvFile() {
  if (!existsSync(envFilePath)) {
    return false;
  }

  const content = readFileSync(envFilePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    if (!key || key in process.env) continue;

    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }

  return true;
}

export function applyAwsDefaults() {
  const region =
    process.env.AWS_REGION ??
    process.env.CDK_DEFAULT_REGION ??
    "ap-south-1";

  process.env.AWS_REGION = region;
  process.env.CDK_DEFAULT_REGION = region;
}

export function validateDeployEnv() {
  if (!existsSync(envFilePath)) {
    console.warn(`[cdk] No ${envFilePath} — use shell env or: cp .env.example .env`);
  }

  const required = ["JWT_SECRET", "FRONTEND_URL"];
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    console.error(`[cdk] Missing required: ${missing.join(", ")}`);
    console.error(`[cdk] Set in ${envFilePath} or export before deploy.\n`);
    process.exit(1);
  }

  if ((process.env.JWT_SECRET ?? "").length < 16) {
    console.error("[cdk] JWT_SECRET must be at least 16 characters.\n");
    process.exit(1);
  }

  try {
    new URL(process.env.FRONTEND_URL);
  } catch {
    console.error("[cdk] FRONTEND_URL must be a valid URL.\n");
    process.exit(1);
  }
}
