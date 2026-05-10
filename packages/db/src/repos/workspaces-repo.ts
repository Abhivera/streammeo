import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { WorkspaceDTO } from "../entities";
import { GSI } from "../dynamo/keys";
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

export class WorkspacesRepo {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly table: string,
  ) {}

  async findById(id: string): Promise<WorkspaceDTO | null> {
    const res = await this.doc.send(
      new GetCommand({ TableName: this.table, Key: { id } }),
    );
    const r = res.Item;
    return r ? toWorkspaceDTO(r as Record<string, unknown>) : null;
  }

  async findByApiKey(apiKey: string): Promise<WorkspaceDTO | null> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: GSI.workspaceApiKey,
        KeyConditionExpression: "apiKey = :k",
        ExpressionAttributeValues: { ":k": apiKey },
        Limit: 1,
      }),
    );
    const r = res.Items?.[0];
    return r ? toWorkspaceDTO(r as Record<string, unknown>) : null;
  }

  async listByOwner(ownerId: string): Promise<WorkspaceDTO[]> {
    const out: WorkspaceDTO[] = [];
    let startKey: Record<string, unknown> | undefined;
    do {
      const res = await this.doc.send(
        new QueryCommand({
          TableName: this.table,
          IndexName: GSI.workspaceOwner,
          KeyConditionExpression: "ownerId = :o",
          ExpressionAttributeValues: { ":o": ownerId },
          ExclusiveStartKey: startKey as never,
        }),
      );
      for (const item of res.Items ?? []) {
        out.push(toWorkspaceDTO(item as Record<string, unknown>));
      }
      startKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (startKey);
    return out;
  }

  async put(ws: Readonly<Omit<WorkspaceDTO, "createdAt">> & { createdAt: string }): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.table,
        Item: {
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
          sessionCount: 0,
        },
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );
  }

  async update(id: string, patch: WorkspacePatch): Promise<WorkspaceDTO | null> {
    const keys = Object.keys(patch).filter(
      (k) => patch[k as keyof WorkspacePatch] !== undefined,
    ) as (keyof WorkspacePatch)[];
    if (keys.length === 0) return this.findById(id);

    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    const parts: string[] = [];
    keys.forEach((k, i) => {
      const nk = `#f${i}`;
      const vk = `:v${i}`;
      names[nk] = k;
      parts.push(`${nk} = ${vk}`);
      values[vk] = patch[k];
    });

    const res = await this.doc.send(
      new UpdateCommand({
        TableName: this.table,
        Key: { id },
        UpdateExpression: `SET ${parts.join(", ")}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      }),
    );
    const r = res.Attributes;
    return r ? toWorkspaceDTO(r as Record<string, unknown>) : null;
  }
}
