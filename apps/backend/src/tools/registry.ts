import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import pino from "pino";

const log = pino({ name: "tool", level: "info" });

export type ToolContext = Readonly<{
  workspaceId: string;
}>;

export interface RegisteredTool {
  anthropic: Tool;
  execute: (
    input: Record<string, unknown>,
    ctx: ToolContext,
  ) => Promise<string>;
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool): void {
    this.tools.set(tool.anthropic.name, tool);
    log.info({ tool: tool.anthropic.name }, "Registered tool");
  }

  getAnthropicTools(): Tool[] {
    return [...this.tools.values()].map((t) => t.anthropic);
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
