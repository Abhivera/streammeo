import type { Database } from "better-sqlite3";
import type { WorkspaceDTO } from "../entities";
import { toWorkspaceDTO } from "../mappers";

export type WorkspacePatch = Partial<
  Pick<
    WorkspaceDTO,
    | "name"
    | "language"
    | "agentName"
    | "systemPrompt"
    | "plan"
    | "minutesLimit"
    | "minutesUsed"
    | "shopifyShopDomain"
    | "shopifyAccessToken"
  >
>;

const workspaceSelect = `
  SELECT
    id,
    name,
    api_key AS apiKey,
    language,
    agent_name AS agentName,
    system_prompt AS systemPrompt,
    plan,
    minutes_used AS minutesUsed,
    minutes_limit AS minutesLimit,
    owner_id AS ownerId,
    shopify_shop_domain AS shopifyShopDomain,
    shopify_access_token AS shopifyAccessToken,
    session_count AS sessionCount,
    created_at AS createdAt
  FROM workspaces
`;

export class WorkspacesRepo {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<WorkspaceDTO | null> {
    const row = this.db.prepare(`${workspaceSelect} WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? toWorkspaceDTO(row) : null;
  }

  async findByApiKey(apiKey: string): Promise<WorkspaceDTO | null> {
    const row = this.db.prepare(`${workspaceSelect} WHERE api_key = ?`).get(apiKey) as
      | Record<string, unknown>
      | undefined;
    return row ? toWorkspaceDTO(row) : null;
  }

  async listByOwner(ownerId: string): Promise<WorkspaceDTO[]> {
    const rows = this.db
      .prepare(`${workspaceSelect} WHERE owner_id = ? ORDER BY created_at ASC`)
      .all(ownerId) as Record<string, unknown>[];
    return rows.map((r) => toWorkspaceDTO(r));
  }

  async put(ws: Readonly<Omit<WorkspaceDTO, "createdAt">> & { createdAt: string }): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO workspaces (
        id, name, api_key, language, agent_name, system_prompt, plan,
        minutes_used, minutes_limit, owner_id, shopify_shop_domain, shopify_access_token,
        session_count, created_at
      ) VALUES (
        @id, @name, @apiKey, @language, @agentName, @systemPrompt, @plan,
        @minutesUsed, @minutesLimit, @ownerId, @shopifyShopDomain, @shopifyAccessToken,
        0, @createdAt
      )
    `,
      )
      .run({
        id: ws.id,
        name: ws.name,
        apiKey: ws.apiKey,
        language: ws.language,
        agentName: ws.agentName,
        systemPrompt: ws.systemPrompt,
        plan: ws.plan,
        minutesUsed: ws.minutesUsed,
        minutesLimit: ws.minutesLimit,
        ownerId: ws.ownerId,
        shopifyShopDomain: ws.shopifyShopDomain,
        shopifyAccessToken: ws.shopifyAccessToken,
        createdAt: ws.createdAt,
      });
  }

  async update(id: string, patch: WorkspacePatch): Promise<WorkspaceDTO | null> {
    const colMap: Record<keyof WorkspacePatch, string> = {
      name: "name",
      language: "language",
      agentName: "agent_name",
      systemPrompt: "system_prompt",
      plan: "plan",
      minutesLimit: "minutes_limit",
      minutesUsed: "minutes_used",
      shopifyShopDomain: "shopify_shop_domain",
      shopifyAccessToken: "shopify_access_token",
    };

    const keys = Object.keys(patch).filter(
      (k) => patch[k as keyof WorkspacePatch] !== undefined,
    ) as (keyof WorkspacePatch)[];
    if (keys.length === 0) return this.findById(id);

    const sets = keys.map((k) => `${colMap[k]} = @${String(k)}`).join(", ");
    const params: Record<string, unknown> = { id };
    for (const k of keys) {
      params[String(k)] = patch[k];
    }

    this.db.prepare(`UPDATE workspaces SET ${sets} WHERE id = @id`).run(params);
    return this.findById(id);
  }
}
