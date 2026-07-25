import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "waiter" | "kitchen" | "accountant" | "manager" | "super_admin";

export interface AuthState {
  user: User | null;
  role: AppRole | null;
  name: string;
  loading: boolean;
}

const Ctx = createContext<AuthState>({ user: null, role: null, name: "", loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, role: null, name: "", loading: true });

  useEffect(() => {
    let mounted = true;
    const loadRole = async (user: User | null) => {
      if (!user) {
        if (mounted) setState({ user: null, role: null, name: "", loading: false });
        return;
      }
      const [{ data: roleRow }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
      ]);
      if (mounted) {
        setState({
          user,
          role: (roleRow?.role as AppRole) ?? null,
          name: profile?.name ?? user.email?.split("@")[0] ?? "",
          loading: false,
        });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      void loadRole(session?.user ?? null);
    });
    void supabase.auth.getSession().then(({ data }) => loadRole(data.session?.user ?? null));

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export function landingForRole(role: AppRole | null): string {
  switch (role) {
    case "super_admin": return "/dashboard";
    case "waiter": return "/tables";
    case "kitchen": return "/kitchen";
    case "accountant": return "/history";
    case "manager": return "/dashboard";
    default: return "/login";
  }
}