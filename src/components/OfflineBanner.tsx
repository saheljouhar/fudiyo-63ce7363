import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Connectivity check: assume ONLINE by default. Only show the banner when
 * navigator.onLine is false AND an active Supabase ping fails. navigator.onLine
 * is unreliable inside preview iframes, so we never trust it alone.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const ping = async (): Promise<boolean> => {
      try {
        const { error } = await supabase.from("restaurants").select("id").limit(1);
        return !error;
      } catch {
        return false;
      }
    };

    const check = async () => {
      // Browser thinks we're online → trust it, never show banner.
      if (navigator.onLine) {
        if (!cancelled) setOffline(false);
        return;
      }
      // Browser thinks offline → verify with active ping before showing banner.
      const ok = await ping();
      if (!cancelled) setOffline(!ok);
    };

    void check();
    const id = window.setInterval(check, 30_000);
    const onOnline = () => setOffline(false);
    const onOffline = () => void check();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-destructive text-destructive-foreground text-center text-xs font-medium py-2 px-4 shadow">
      ⚠ No internet connection — working offline. Changes will sync when reconnected.
    </div>
  );
}