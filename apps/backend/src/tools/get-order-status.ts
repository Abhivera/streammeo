import type { ToolExecutor } from "./registry.ts";

export const getOrderStatusTool: ToolExecutor = {
  definition: {
    type: "function",
    function: {
      name: "get_order_status",
      description:
        "Get the current status of a customer's order by order ID",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "The order ID to look up, e.g. ORD-12345",
          },
        },
        required: ["order_id"],
      },
    },
  },

  async execute(args) {
    const orderId = (args.order_id as string) || "unknown";
    return {
      result: JSON.stringify({
        order_id: orderId,
        status: "shipped",
        estimated_delivery: "2026-03-27",
        items: ["Wireless Headphones", "USB-C Cable"],
        tracking_id: "TRK-98765",
      }),
    };
  },
};
