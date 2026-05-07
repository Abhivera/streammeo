import type { ToolDefinition } from "../types/provider.ts";
import { createLogger } from "../logger.ts";

const log = createLogger("TOOL");

export interface ToolExecutor {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>) => Promise<{ result: string }>;
}

export class ToolRegistry {
  private executors = new Map<string, ToolExecutor>();

  register(executor: ToolExecutor): void {
    const name = executor.definition.function.name;
    this.executors.set(name, executor);
    log.info({ tool: name }, "Registered tool");
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.executors.values()).map((e) => e.definition);
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ result: string }> {
    const executor = this.executors.get(name);
    if (!executor) {
      log.error({ tool: name }, "Unknown tool");
      return { result: JSON.stringify({ error: `Unknown tool: ${name}` }) };
    }

    log.info({ tool: name, args }, "Executing tool");
    return executor.execute(args);
  }
}
