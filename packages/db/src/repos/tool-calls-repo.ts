import type { Database } from "better-sqlite3";
import type { ToolCallDTO } from "../entities";
import { toToolCallDTO } from "../mappers";

export class ToolCallsRepo {
  constructor(private readonly db: Database) {}

  async put(
    tc: Readonly<Omit<ToolCallDTO, "createdAt">> & { createdAtMs: number },
  ): Promise<void> {
    this.db
      .prepare(
        `
      INSERT INTO tool_calls (id, session_id, tool_name, input_json, output_json, created_at)
      VALUES (@id, @sessionId, @toolName, @inputJson, @outputJson, @createdAt)
    `,
      )
      .run({
        id: tc.id,
        sessionId: tc.sessionId,
        toolName: tc.toolName,
        inputJson: JSON.stringify(tc.input),
        outputJson: JSON.stringify(tc.output),
        createdAt: tc.createdAtMs,
      });
  }

  async listForSessionAscending(sessionId: string): Promise<ToolCallDTO[]> {
    const rows = this.db
      .prepare(
        `
      SELECT
        id,
        session_id AS sessionId,
        tool_name AS toolName,
        input_json AS inputJson,
        output_json AS outputJson,
        created_at AS createdAt
      FROM tool_calls
      WHERE session_id = ?
      ORDER BY created_at ASC, id ASC
    `,
      )
      .all(sessionId) as Record<string, unknown>[];
    return rows.map((it) => {
      const input = JSON.parse(String(it.inputJson ?? "{}")) as Record<string, unknown>;
      const output = JSON.parse(String(it.outputJson ?? "{}")) as Record<string, unknown>;
      return toToolCallDTO({
        id: it.id,
        sessionId: it.sessionId,
        toolName: it.toolName,
        input,
        output,
        createdAt: it.createdAt,
      });
    });
  }
}
