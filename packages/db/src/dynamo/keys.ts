/** GSI names — create tables matching `docs/dynamodb-tables.md` */
export const GSI = {
  /** Users: PK=`email`; lookup by stable `id` (JWT subject) */
  userByStableId: "UserIdIndex",
  workspaceApiKey: "ApiKeyIndex",
  workspaceOwner: "OwnerIndex",
  sessionWorkspaceTime: "WorkspaceTimeIndex",
  messageWorkspaceTime: "WorkspaceTimeIndex",
} as const;
