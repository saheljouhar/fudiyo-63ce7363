import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UtensilsCrossed, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "orbis.onboarding.dismissedAt";

export function OnboardingBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissedAt = Number(localStorage.getItem(KEY) || 0);
    if (Date.now() - dismissedAt < 24 * 3600 * 1000) return;
    (async () => {
      const { count } = await supabase.from("dishes").select("id", { count: "exact", head: true });
      if ((count ?? 0) > 0) {
        // sample data already present — keep banner unless user has 100+ dishes
        setShow((count ?? 0) <= 25);
      } else setShow(true);
    })();
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <div className="mb-5 rounded-xl border border-[#F59E0B]/40 bg-[#FEF3C7] text-[#92400E] px-4 py-3 flex items-center gap-3">
      <UtensilsCrossed className="size-5 shrink-0" />
      <div className="flex-1 text-sm">
        <strong className="font-semibold">You're viewing sample menu data.</strong>{" "}
        Upload your own menu to get started.
      </div>
      <Link to="/menu" className="text-xs font-semibold bg-primary text-primary-foreground rounded-md px-3 py-1.5">
        Go to Menu →
      </Link>
      <button onClick={dismiss} className="text-[#92400E]/70 hover:text-[#92400E]"><X className="size-4" /></button>
    </div>
  );
}