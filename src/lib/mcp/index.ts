import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMenu from "./tools/list_menu";
import listTables from "./tools/list_tables";
import listOrdersToday from "./tools/list_orders_today";
import whoami from "./tools/whoami";

// The OAuth issuer must be the direct Supabase host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fudiyo-mcp",
  title: "Fudiyo",
  version: "0.1.0",
  instructions:
    "Tools for a Fudiyo restaurant account. Every call runs as the signed-in Fudiyo user under row-level security, so results are scoped to that user's restaurant. Use `whoami` to identify the user, `list_menu` for dishes, `list_tables` for floor status, and `list_orders_today` for today's orders and revenue.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listMenu, listTables, listOrdersToday],
});