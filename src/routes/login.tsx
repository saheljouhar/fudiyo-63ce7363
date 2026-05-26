import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { landingForRole, type AppRole } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Sign in — Fudiyo" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("manager@restaurant.com");
  const [password, setPassword] = useState("manager1234");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    toast.success("Welcome back");
    navigate({ to: landingForRole((roleRow?.role as AppRole) ?? null) });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-card p-8 border border-border">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="text-3xl font-bold tracking-tight text-primary">Fudiyo</div>
          <div className="text-xs text-muted-foreground">Restaurant Management</div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-md bg-cta text-cta-foreground font-semibold text-sm hover:bg-cta-hover transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-xs text-muted-foreground text-center pt-2">
            Accounts are created by your manager.
          </p>
        </form>
      </div>
    </main>
  );
}