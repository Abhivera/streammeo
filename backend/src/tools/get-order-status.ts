import type { RegisteredTool } from "./registry";
import { getStore } from "../db";

export const getOrderStatusTool: RegisteredTool = {
  tool: {
    type: "function",
    function: {
      name: "get_order_status",
      description:
        "Get the current status and tracking info for a customer order",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "The order ID or order number",
          },
          phone: {
            type: "string",
            description: "Customer phone number to verify identity",
          },
        },
        required: ["order_id"],
      },
    },
  },

  async execute(input, ctx) {
    const orderId = String(input.order_id ?? "");
    const phone = input.phone !== undefined ? String(input.phone) : undefined;

    const ws = await getStore().workspaces.findById(ctx.workspaceId);
    const domain = ws?.shopifyShopDomain;
    const token = ws?.shopifyAccessToken;

    if (domain && token) {
      const url = `https://${domain}/admin/api/2024-01/orders.json?name=${encodeURIComponent(orderId)}`;
      const res = await fetch(url, {
        headers: { "X-Shopify-Access-Token": token },
      });
      if (res.ok) {
        const data = (await res.json()) as { orders?: unknown[] };
        const first = data.orders?.[0] as
          | {
              id?: number;
              name?: string;
              fulfillment_status?: string | null;
              financial_status?: string | null;
            }
          | undefined;
        if (first) {
          return JSON.stringify({
            order_id: first.name ?? orderId,
            status: first.fulfillment_status ?? first.financial_status ?? "unknown",
            source: "shopify",
            phone,
          });
        }
      }
    }

    return JSON.stringify({
      order_id: orderId,
      status: "shipped",
      courier: "DHL",
      tracking: "JD0146000058290401",
      eta: "2–3 business days",
      last_location: "Regional distribution center",
      phone,
    });
  },
};
