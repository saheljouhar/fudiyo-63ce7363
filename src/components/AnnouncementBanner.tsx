import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Ann { id: string; message: string; created_at: string }

const KEY = "orbis.dismissedAnn";

function getDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function AnnouncementBanner() {
  const { role } = useAuth();
  const [items, setItems] = useState<Ann[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => getDismissed());

  useEffect(() => {
    if (role === "manager") return;
    const load = async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data } = await supabase
        .from("announcements")
        .select("id,message,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setItems(data as Ann[]);
    };
    void load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [role]);

  if (role === "manager") return null;
  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  return (
    <div className="space-y-2 mb-3">
      {visible.map((a) => (
        <div key={a.id} className="rounded-lg bg-[#FEF3C7] text-[#92400E] border border-[#F59E0B]/40 px-4 py-2.5 flex items-center gap-3">
          <Megaphone className="size-4 shrink-0" />
          <div className="flex-1 text-sm">{a.message}</div>
          <button onClick={() => dismiss(a.id)} className="text-[#92400E]/70 hover:text-[#92400E]"><X className="size-4" /></button>
        </div>
      ))}
    </div>
  );
}