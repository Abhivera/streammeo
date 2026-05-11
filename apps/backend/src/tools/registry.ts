import pino from "pino";

const log = pino({ name: "tool", level: "info" });

export type ToolContext = Readonly<{
  workspaceId: string;
}>;

export type LlmTool = Readonly<{
  type: "function";
  function: Readonly<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}>;

export interface RegisteredTool {
  tool: LlmTool;
  execute: (
    input: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<string>;
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool): void {
    this.tools.set(tool.tool.function.name, tool);
    log.info({ tool: tool.tool.function.name }, "Registered tool");
  }

  getTools(): LlmTool[] {
    return [...this.tools.values()].map((t) => t.tool);
  }

  async execute(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) {
      return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
    log.info({ tool: name, workspaceId: ctx.workspaceId }, "Executing tool");
    return tool.execute(input, ctx);
  }
}
