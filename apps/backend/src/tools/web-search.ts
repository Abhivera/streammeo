import type { ToolExecutor } from "./registry.ts";
import { createLogger } from "../logger.ts";

const log = createLogger("TOOL");

async function tavilySearch(
  query: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 3,
      include_answer: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const answer = data.answer || "";
  const results = (data.results || [])
    .map(
      (r: { title: string; content: string; url: string }) =>
        `${r.title}: ${r.content}`,
    )
    .join("\n");

  return answer
    ? `Answer: ${answer}\n\nSources:\n${results}`
    : results;
}

export function createWebSearchTool(tavilyApiKey: string): ToolExecutor {
  return {
    definition: {
      type: "function",
      function: {
        name: "web_search",
        description:
          "Search the web for current information. Use this when the user asks about recent events, news, real-time data, or anything you don't have knowledge about.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query",
            },
          },
          required: ["query"],
        },
      },
    },

    async execute(args) {
      const query = (args.query as string) || "";
      try {
        const searchResult = await tavilySearch(query, tavilyApiKey);
        log.info({ query }, "Web search completed");
        return { result: searchResult };
      } catch (err: any) {
        log.error({ err, query }, "Web search failed");
        return { result: JSON.stringify({ error: err.message }) };
      }
    },
  };
}
