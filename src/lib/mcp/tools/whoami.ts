import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supa(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "whoami",
  title: "Who am I",
  description: "Return the signed-in Fudiyo user's profile, role, and restaurant.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = supa(ctx);
    const userId = ctx.getUserId();
    const [{ data: profile }, { data: roleRow }] = await Promise.all([
      client.from("profiles").select("id,name,email,restaurant_id,language_preference").eq("id", userId!).maybeSingle(),
      client.from("user_roles").select("role").eq("user_id", userId!).maybeSingle(),
    ]);
    const payload = { user_id: userId, email: ctx.getUserEmail(), profile, role: roleRow?.role ?? null };
    return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  },
});