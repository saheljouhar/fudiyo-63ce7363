import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Beta namespace: local typed wrapper for the three oauth helpers.
type OAuthDetails = {
  client?: { name?: string; client_uri?: string; redirect_uris?: string[] } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};
type OAuthResult<T> = { data: T | null; error: { message: string } | null };
interface AuthOAuth {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult<OAuthDetails>>;
  approveAuthorization: (id: string) => Promise<OAuthResult<OAuthDetails>>;
  denyAuthorization: (id: string) => Promise<OAuthResult<OAuthDetails>>;
}
function oauthApi(): AuthOAuth {
  return (supabase.auth as unknown as { oauth: AuthOAuth }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({ meta: [{ title: "Authorize app — Fudiyo" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + (location.searchStr ?? "");
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const params = new URLSearchParams(location.search);
    const authorizationId = params.get("authorization_id") ?? "";
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-xl font-semibold text-foreground">Could not load this authorization request</h1>
        <p className="text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorization_id)
      : await oauthApi().denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-card p-8 border border-border space-y-5">
        <div>
          <div className="text-2xl font-bold text-primary">Fudiyo</div>
          <div className="text-xs text-muted-foreground">Authorize connection</div>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Connect {clientName} to your Fudiyo account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {clientName} will be able to call this app's enabled tools while you are signed in. Access
            runs as you and respects your restaurant's permissions and row-level security.
          </p>
        </div>
        {details?.scope ? (
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Requested scope: <span className="font-mono">{details.scope}</span>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-red-600">{error}</p>
        ) : null}
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(false)}
            className="h-11 min-w-24 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent disabled:opacity-60"
          >
            Deny
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(true)}
            className="h-11 min-w-24 px-4 rounded-md bg-cta text-cta-foreground text-sm font-semibold hover:bg-cta-hover disabled:opacity-60"
          >
            {busy ? "Working…" : "Approve"}
          </button>
        </div>
      </div>
    </main>
  );
}