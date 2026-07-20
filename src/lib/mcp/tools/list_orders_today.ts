import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supa(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_orders_today",
  title: "List today's orders",
  description: "List orders placed today at the signed-in user's restaurant. Optionally filter by status.",
  inputSchema: {
    status: z.enum(["pending", "preparing", "ready", "served", "paid", "cancelled"]).optional().describe("Filter by order status."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    let q = supa(ctx)
      .from("orders")
      .select("id,created_at,status,order_type,subtotal,tax,total,table_id,waiter_name,items,note")
      .gte("created_at", startOfDay.toISOString());
    if (status) q = q.eq("status", status);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const totalRevenue = (data ?? []).filter(o => o.status === "paid").reduce((s, o) => s + Number(o.total ?? 0), 0);
    return {
      content: [{ type: "text", text: JSON.stringify({ count: data?.length ?? 0, paid_revenue: totalRevenue, orders: data }) }],
      structuredContent: { count: data?.length ?? 0, paid_revenue: totalRevenue, orders: data ?? [] },
    };
  },
});