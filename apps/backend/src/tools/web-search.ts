import type { RegisteredTool } from "./registry";

/** https://docs.tavily.com/docs/tavily-api/rest-api/api-reference **/
const TAVILY_SEARCH = "https://api.tavily.com/search";

type TavilyResult = Readonly<{
  title?: string;
  url?: string;
  content?: string;
}>;

type TavilyResponse = Readonly<{
  results?: TavilyResult[];
  answer?: string;
  error?: string;
}>;

export function createWebSearchTool(apiKey: string): RegisteredTool {
  const key = apiKey.trim();

  return {
    anthropic: {
      name: "web_search",
      description:
        "Search the public web for timely or external information (news, competitors, definitions, troubleshooting) when FAQs and order lookup are not enough. Prefer short factual queries.",
      input_schema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "What to look up (e.g. 'Delhiivery tracking status codes', 'Samsung Galaxy Buds pairing reset')",
          },
        },
        required: ["query"],
      },
    },

    async execute(input) {
      const query = String(input.query ?? "").trim();
      if (!query) {
        return JSON.stringify({ error: "Missing query", results: [] });
      }

      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 14_000);

      try {
        const res = await fetch(TAVILY_SEARCH, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            api_key: key,
            query,
            search_depth: "basic",
            include_answer: true,
            max_results: 5,
          }),
        });
        clearTimeout(t);

        const raw = await res.text();
        if (!res.ok) {
          return JSON.stringify({
            error: `Tavily HTTP ${res.status}`,
            detail: raw.slice(0, 800),
          });
        }

        let data: TavilyResponse = {};
        try {
          data = JSON.parse(raw) as TavilyResponse;
        } catch {
          return JSON.stringify({
            error: "Invalid JSON from Tavily",
            detail: raw.slice(0, 400),
          });
        }

        const answer =
          typeof data.answer === "string" && data.answer.trim().length > 0
            ? data.answer.trim()
            : undefined;

        const results = (data.results ?? []).slice(0, 5).map((r) => ({
          title: r.title ?? "",
          url: r.url ?? "",
          snippet: (r.content ?? "").trim().slice(0, 600),
        }));

        const payload: Record<string, unknown> = { results };
        if (answer) payload.summary = answer;
        return JSON.stringify(payload);
      } catch (err) {
        clearTimeout(t);
        const message = err instanceof Error ? err.message : "web_search failed";
        return JSON.stringify({ error: message, results: [] });
      }
    },
  };
}
