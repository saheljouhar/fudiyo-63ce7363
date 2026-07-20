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
  name: "list_menu",
  title: "List menu",
  description: "List dishes on the signed-in user's restaurant menu, optionally filtered by category or availability.",
  inputSchema: {
    category: z.string().optional().describe("Filter by category name (case-insensitive exact match)."),
    available_only: z.boolean().optional().describe("If true, return only dishes currently marked available."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, available_only }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = supa(ctx).from("dishes").select("id,name,category,price,is_available,is_featured,description").eq("is_archived", false);
    if (category) q = q.ilike("category", category);
    if (available_only) q = q.eq("is_available", true);
    const { data, error } = await q.order("category").order("display_order");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { dishes: data ?? [] },
    };
  },
});