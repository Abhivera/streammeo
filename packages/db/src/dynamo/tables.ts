export type DynamoTableNames = Readonly<{
  users: string;
  workspaces: string;
  sessions: string;
  messages: string;
  toolCalls: string;
  faqs: string;
}>;

export function tablesFromPrefix(prefix: string): DynamoTableNames {
  const p = prefix.replace(/-+$/u, "").replace(/^-+/u, "");
  return {
    users: `${p}Users`,
    workspaces: `${p}Workspaces`,
    sessions: `${p}Sessions`,
    messages: `${p}Messages`,
    toolCalls: `${p}ToolCalls`,
    faqs: `${p}Faqs`,
  };
}
