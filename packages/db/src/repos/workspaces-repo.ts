import type { Collection, Db } from "mongodb";
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

type WorkspaceDoc = Readonly<{
  _id: string;
  name: string;
  apiKey: string;
  language: string;
  agentName: string;
  systemPrompt: string;
  plan: string;
  minutesUsed: number;
  minutesLimit: number;
  ownerId: string;
  shopifyShopDomain: string | null;
  shopifyAccessToken: string | null;
  sessionCount: number;
  createdAt: string;
}>;

function docToRow(doc: WorkspaceDoc): Record<string, unknown> {
  return {
    id: doc._id,
    name: doc.name,
    apiKey: doc.apiKey,
    language: doc.language,
    agentName: doc.agentName,
    systemPrompt: doc.systemPrompt,
    plan: doc.plan,
    minutesUsed: doc.minutesUsed,
    minutesLimit: doc.minutesLimit,
    ownerId: doc.ownerId,
    shopifyShopDomain: doc.shopifyShopDomain,
    shopifyAccessToken: doc.shopifyAccessToken,
    sessionCount: doc.sessionCount,
    createdAt: doc.createdAt,
  };
}

export class WorkspacesRepo {
  private readonly coll: Collection<WorkspaceDoc>;

  constructor(db: Db) {
    this.coll = db.collection<WorkspaceDoc>("workspaces");
  }

  async findById(id: string): Promise<WorkspaceDTO | null> {
    const doc = await this.coll.findOne({ _id: id });
    return doc ? toWorkspaceDTO(docToRow(doc)) : null;
  }

  async findByApiKey(apiKey: string): Promise<WorkspaceDTO | null> {
    const doc = await this.coll.findOne({ apiKey });
    return doc ? toWorkspaceDTO(docToRow(doc)) : null;
  }

  async listByOwner(ownerId: string): Promise<WorkspaceDTO[]> {
    const cursor = this.coll.find({ ownerId }).sort({ createdAt: 1 });
    const docs = await cursor.toArray();
    return docs.map((d) => toWorkspaceDTO(docToRow(d)));
  }

  async put(
    ws: Readonly<Omit<WorkspaceDTO, "createdAt">> & { createdAt: string },
  ): Promise<void> {
    await this.coll.insertOne({
      _id: ws.id,
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
      sessionCount: 0,
      createdAt: ws.createdAt,
    });
  }

  async update(id: string, patch: WorkspacePatch): Promise<WorkspaceDTO | null> {
    const keys = Object.keys(patch).filter(
      (k) => patch[k as keyof WorkspacePatch] !== undefined,
    ) as (keyof WorkspacePatch)[];
    if (keys.length === 0) return this.findById(id);

    const keyMap: Record<keyof WorkspacePatch, keyof WorkspaceDoc> = {
      name: "name",
      language: "language",
      agentName: "agentName",
      systemPrompt: "systemPrompt",
      plan: "plan",
      minutesLimit: "minutesLimit",
      minutesUsed: "minutesUsed",
      shopifyShopDomain: "shopifyShopDomain",
      shopifyAccessToken: "shopifyAccessToken",
    };

    const $set: Record<string, unknown> = {};
    for (const k of keys) {
      const field = keyMap[k];
      $set[String(field)] = patch[k];
    }

    await this.coll.updateOne({ _id: id }, { $set });
    return this.findById(id);
  }
}
