export type SessionCursor = Readonly<{
  startedAt: number;
  id: string;
}>;

export type WorkspacePatch = Partial<
  {
    name: string;
    language: string;
    agentName: string;
    systemPrompt: string;
    plan: string;
    minutesLimit: number;
    minutesUsed: number;
    shopifyShopDomain: string | null;
    shopifyAccessToken: string | null;
  }
>;
