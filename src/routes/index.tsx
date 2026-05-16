import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { landingForRole, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    // Synchronously read cached session; do NOT await network calls here,
    // otherwise an offline / slow Supabase request hangs the whole app.
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw redirect({ to: "/login" });
    } catch (e) {
      if ((e as { isRedirect?: boolean })?.isRedirect) throw e;
      throw redirect({ to: "/login" });
    }
  },
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (!cancelled) navigate({ to: "/login" });
          return;
        }
        const { data: r } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .maybeSingle();
        if (!cancelled) navigate({ to: landingForRole((r?.role as AppRole) ?? null) });
      } catch {
        if (!cancelled) navigate({ to: "/login" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);
  return null;
}