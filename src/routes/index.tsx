import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { landingForRole, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const { data: r } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id)
      .maybeSingle();
    throw redirect({ to: landingForRole((r?.role as AppRole) ?? null) });
  },
  component: () => null,
});