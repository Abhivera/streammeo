import type { Collection, Db } from "mongodb";
import type { ToolCallDTO } from "../entities";
import { toToolCallDTO } from "../mappers";

type ToolCallDoc = Readonly<{
  _id: string;
  id: string;
  sessionId: string;
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  createdAt: number;
}>;

export class ToolCallsRepo {
  private readonly coll: Collection<ToolCallDoc>;

  constructor(db: Db) {
    this.coll = db.collection<ToolCallDoc>("toolCalls");
  }

  async put(
    tc: Readonly<Omit<ToolCallDTO, "createdAt">> & { createdAtMs: number },
  ): Promise<void> {
    const _id = `${tc.sessionId}::${tc.id}`;
    await this.coll.insertOne({
      _id,
      id: tc.id,
      sessionId: tc.sessionId,
      toolName: tc.toolName,
      input: tc.input,
      output: tc.output,
      createdAt: tc.createdAtMs,
    });
  }

  async listForSessionAscending(sessionId: string): Promise<ToolCallDTO[]> {
    const docs = await this.coll
      .find({ sessionId })
      .sort({ createdAt: 1, id: 1 })
      .toArray();
    return docs.map((d) =>
      toToolCallDTO({
        id: d.id,
        sessionId: d.sessionId,
        toolName: d.toolName,
        input: d.input,
        output: d.output,
        createdAt: d.createdAt,
      }),
    );
  }
}
