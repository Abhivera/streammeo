import type { Collection, Db } from "mongodb";
import type { FaqDTO } from "../entities";
import { toFaqDTO } from "../mappers";

type FaqDoc = Readonly<{
  _id: string;
  id: string;
  workspaceId: string;
  question: string;
  answer: string;
  embedding: number[];
  createdAt: number;
}>;

export class FaqsRepo {
  private readonly coll: Collection<FaqDoc>;

  constructor(db: Db) {
    this.coll = db.collection<FaqDoc>("faqs");
  }

  async put(
    f: Readonly<Omit<FaqDTO, "embedding" | "createdAt">> & {
      embedding?: number[];
      createdAtMs: number;
    },
  ): Promise<FaqDTO> {
    const _id = `${f.workspaceId}::${f.id}`;
    const embedding = f.embedding ?? [];
    await this.coll.insertOne({
      _id,
      id: f.id,
      workspaceId: f.workspaceId,
      question: f.question,
      answer: f.answer,
      embedding,
      createdAt: f.createdAtMs,
    });
    const doc = await this.coll.findOne({ _id });
    if (!doc) throw new Error("FAQ insert failed unexpectedly");
    return toFaqDTO({
      id: doc.id,
      workspaceId: doc.workspaceId,
      question: doc.question,
      answer: doc.answer,
      embedding: doc.embedding,
      createdAt: doc.createdAt,
    });
  }

  async listByWorkspaceDescending(workspaceId: string): Promise<FaqDTO[]> {
    const docs = await this.coll
      .find({ workspaceId })
      .sort({ createdAt: -1, id: -1 })
      .toArray();
    return docs.map((d) =>
      toFaqDTO({
        id: d.id,
        workspaceId: d.workspaceId,
        question: d.question,
        answer: d.answer,
        embedding: d.embedding,
        createdAt: d.createdAt,
      }),
    );
  }

  async delete(workspaceId: string, id: string): Promise<boolean> {
    const _id = `${workspaceId}::${id}`;
    const r = await this.coll.deleteOne({ _id, workspaceId });
    return r.deletedCount > 0;
  }

  async update(
    workspaceId: string,
    id: string,
    patch: Pick<FaqDTO, "question" | "answer">,
  ): Promise<FaqDTO | null> {
    const _id = `${workspaceId}::${id}`;
    const r = await this.coll.updateOne(
      { _id, workspaceId },
      { $set: { question: patch.question, answer: patch.answer } },
    );
    if (r.matchedCount === 0) return null;
    const doc = await this.coll.findOne({ _id });
    return doc
      ? toFaqDTO({
          id: doc.id,
          workspaceId: doc.workspaceId,
          question: doc.question,
          answer: doc.answer,
          embedding: doc.embedding,
          createdAt: doc.createdAt,
        })
      : null;
  }
}
