import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createDocumentClient, type DocClientDeps } from "./dynamo/client";
import type { DynamoTableNames } from "./dynamo/tables";
import { tablesFromPrefix } from "./dynamo/tables";
import type { MessageDTO, WorkspaceDTO } from "./entities";
import { FaqsRepo } from "./repos/faqs-repo";
import { MessagesRepo } from "./repos/messages-repo";
import { SessionsRepo } from "./repos/sessions-repo";
import { ToolCallsRepo } from "./repos/tool-calls-repo";
import { UsersRepo } from "./repos/users-repo";
import { WorkspacesRepo } from "./repos/workspaces-repo";

export type VoiceWidgetStoreInit = DocClientDeps &
  Readonly<{
    tablePrefix?: string | undefined;
    tables?: DynamoTableNames | undefined;
  }>;

export class VoiceWidgetStore {
  readonly users: UsersRepo;
  readonly workspaces: WorkspacesRepo;
  readonly sessions: SessionsRepo;
  readonly messages: MessagesRepo;
  readonly toolCalls: ToolCallsRepo;
  readonly faqs: FaqsRepo;

  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly t: DynamoTableNames,
  ) {
    this.users = new UsersRepo(doc, t.users);
    this.workspaces = new WorkspacesRepo(doc, t.workspaces);
    this.sessions = new SessionsRepo(doc, t.sessions, t.workspaces);
    this.messages = new MessagesRepo(doc, t.messages);
    this.toolCalls = new ToolCallsRepo(doc, t.toolCalls);
    this.faqs = new FaqsRepo(doc, t.faqs);
  }

  listMessagesForSessionAsc(sessionId: string): Promise<MessageDTO[]> {
    return this.messages.listForSessionAscending(sessionId);
  }

  recentMessagesForWorkspace(workspaceId: string, limit: number): Promise<MessageDTO[]> {
    return this.messages.recentForWorkspace(workspaceId, limit);
  }

  /**
   * After a completed voice pipeline: finalize session timings and bill minutes.
   */
  async finalizeVoiceTurn(params: Readonly<{
    sessionId: string;
    workspaceId: string;
    endedAt: string;
    durationSec: number;
    minuteDelta: number;
  }>): Promise<WorkspaceDTO | null> {
    const md = Math.max(0, params.minuteDelta);
    const items =
      md > 0
        ? ([
          {
            Update: {
              TableName: this.t.sessions,
              Key: { id: params.sessionId },
              UpdateExpression: "SET endedAt = :e, durationSec = :d",
              ConditionExpression: "workspaceId = :w",
              ExpressionAttributeValues: {
                ":e": params.endedAt,
                ":d": params.durationSec,
                ":w": params.workspaceId,
              },
            },
          },
          {
            Update: {
              TableName: this.t.workspaces,
              Key: { id: params.workspaceId },
              UpdateExpression: "ADD minutesUsed :m",
              ExpressionAttributeValues: { ":m": md },
              ConditionExpression: "attribute_exists(id)",
            },
          },
        ] as const)
        : ([
          {
            Update: {
              TableName: this.t.sessions,
              Key: { id: params.sessionId },
              UpdateExpression: "SET endedAt = :e, durationSec = :d",
              ConditionExpression: "workspaceId = :w",
              ExpressionAttributeValues: {
                ":e": params.endedAt,
                ":d": params.durationSec,
                ":w": params.workspaceId,
              },
            },
          },
        ] as const);

    await this.doc.send(
      new TransactWriteCommand({ TransactItems: [...items] as never }),
    );
    return this.workspaces.findById(params.workspaceId);
  }
}

export function createVoiceWidgetStore(init: VoiceWidgetStoreInit): VoiceWidgetStore {
  const doc = createDocumentClient(init);
  const t = init.tables ?? tablesFromPrefix(init.tablePrefix ?? "VoiceWidget");
  return new VoiceWidgetStore(doc, t);
}
