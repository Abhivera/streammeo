import { createHash } from "node:crypto";

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionWorkspace(workspace: {
  id: string;
  name: string;
  slug: string;
  plan: string;
  apiKey: string;
}) {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    plan: workspace.plan,
    apiKey: workspace.apiKey,
  };
}
