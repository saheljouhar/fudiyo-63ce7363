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
  name: "list_tables",
  title: "List tables",
  description: "List every table in the signed-in user's restaurant with its current status, floor, seats and occupied-since timestamp.",
  inputSchema: {
    floor: z.string().optional().describe("Filter by floor name (e.g. 'Ground', 'First')."),
    status: z.enum(["available", "occupied", "reserved", "bill_requested"]).optional().describe("Filter by table status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ floor, status }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supa(ctx).from("tables").select("id,number,floor,seats,status,occupied_since");
    if (floor) q = q.eq("floor", floor);
    if (status) q = q.eq("status", status);
    const { data, error } = await q.order("floor").order("number");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { tables: data ?? [] },
    };
  },
});