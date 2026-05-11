import type { Database } from "better-sqlite3";
import type { FaqDTO } from "../entities";
import { toFaqDTO } from "../mappers";

export class FaqsRepo {
  constructor(private readonly db: Database) {}

  async put(
    f: Readonly<Omit<FaqDTO, "embedding" | "createdAt">> & {
      embedding?: number[];
      createdAtMs: number;
    },
  ): Promise<FaqDTO> {
    const embeddingJson = JSON.stringify(f.embedding ?? []);
    this.db
      .prepare(
        `
      INSERT INTO faqs (id, workspace_id, question, answer, embedding_json, created_at)
      VALUES (@id, @workspaceId, @question, @answer, @embeddingJson, @createdAt)
    `,
      )
      .run({
        id: f.id,
        workspaceId: f.workspaceId,
        question: f.question,
        answer: f.answer,
        embeddingJson,
        createdAt: f.createdAtMs,
      });
    const row = this.db
      .prepare(
        `
      SELECT
        id,
        workspace_id AS workspaceId,
        question,
        answer,
        embedding_json AS embeddingJson,
        created_at AS createdAt
      FROM faqs WHERE workspace_id = ? AND id = ?
    `,
      )
      .get(f.workspaceId, f.id) as Record<string, unknown>;
    return toFaqDTO({
      ...row,
      embedding: JSON.parse(String(row.embeddingJson ?? "[]")),
    });
  }

  async listByWorkspaceDescending(workspaceId: string): Promise<FaqDTO[]> {
    const rows = this.db
      .prepare(
        `
      SELECT
        id,
        workspace_id AS workspaceId,
        question,
        answer,
        embedding_json AS embeddingJson,
        created_at AS createdAt
      FROM faqs
      WHERE workspace_id = ?
      ORDER BY created_at DESC, id DESC
    `,
      )
      .all(workspaceId) as Record<string, unknown>[];
    return rows.map((it) =>
      toFaqDTO({
        ...it,
        embedding: JSON.parse(String(it.embeddingJson ?? "[]")),
      }),
    );
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    const r = this.db
      .prepare(`DELETE FROM faqs WHERE workspace_id = ? AND id = ?`)
      .run(workspaceId, id);
    return r.changes > 0;
  }

  async update(
    workspaceId: string,
    id: string,
    patch: Pick<FaqDTO, "question" | "answer">,
  ): Promise<FaqDTO | null> {
    const r = this.db
      .prepare(
        `UPDATE faqs SET question = ?, answer = ? WHERE workspace_id = ? AND id = ?`,
      )
      .run(patch.question, patch.answer, workspaceId, id);
    if (r.changes === 0) return null;
    const row = this.db
      .prepare(
        `
      SELECT
        id,
        workspace_id AS workspaceId,
        question,
        answer,
        embedding_json AS embeddingJson,
        created_at AS createdAt
      FROM faqs WHERE workspace_id = ? AND id = ?
    `,
      )
      .get(workspaceId, id) as Record<string, unknown> | undefined;
    return row
      ? toFaqDTO({
          ...row,
          embedding: JSON.parse(String(row.embeddingJson ?? "[]")),
        })
      : null;
  }
}
