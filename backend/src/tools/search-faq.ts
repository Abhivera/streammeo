import type { RegisteredTool } from "./registry";
import { getStore } from "../db";

export const searchFaqTool: RegisteredTool = {
  tool: {
    type: "function",
    function: {
      name: "search_faq",
      description:
        "Search the merchant's FAQ knowledge base for answers to common customer questions",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What the customer is asking (keywords or paraphrase)",
          },
        },
        required: ["query"],
      },
    },
  },

  async execute(input, ctx) {
    const query = String(input.query ?? "").trim();
    if (!query) {
      return JSON.stringify({ matches: [] });
    }

    const words = query
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]+/gu, ""))
      .filter((w) => w.length > 2)
      .slice(0, 8);

    const faqs = await getStore().faqs.listByWorkspaceDescending(ctx.workspaceId);

    const scored = faqs
      .map((f) => {
        const hay = `${f.question}\n${f.answer}`.toLowerCase();
        let score = 0;
        for (const w of words) {
          if (hay.includes(w)) score += 1;
        }
        return { f, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => ({
        question: x.f.question,
        answer: x.f.answer,
      }));

    return JSON.stringify({ matches: scored });
  },
};
