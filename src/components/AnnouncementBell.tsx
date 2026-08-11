import { useEffect, useRef, useState } from "react";
import { Bell, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface Ann {
  id: string;
  message: string;
  created_at: string;
  sent_by: string | null;
}

export function AnnouncementBell({ className }: { className?: string } = {}) {
  const { role, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [list, setList] = useState<Ann[]>([]);
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("id,message,created_at,sent_by")
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setList(data as Ann[]);
  };

  useEffect(() => {
    void load();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (role !== "manager") return null;

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const { error } = await supabase.from("announcements").insert({
      message: text.trim().slice(0, 200),
      sent_by: user?.id,
    });
    setSending(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Sent to all waiters");
      setText("");
      void load();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={className ?? "size-9 rounded-md border border-border bg-card hover:bg-accent flex items-center justify-center text-muted-foreground"}
        aria-label="Announcements"
      >
        <Bell className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-card border border-border rounded-xl shadow-xl z-50 p-4">
          <h3 className="text-sm font-semibold mb-2">Broadcast to all waiters</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            placeholder="Type announcement..."
            className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{text.length}/200</span>
          </div>
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="size-4" /> Send to All Waiters
          </button>
          <div className="mt-4 max-h-64 overflow-auto">
            <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-2">Recent</div>
            {list.length === 0 && <div className="text-xs text-muted-foreground">No announcements yet.</div>}
            {list.map((a) => (
              <div key={a.id} className="text-xs py-2 border-t border-border">
                <div className="text-foreground">{a.message}</div>
                <div className="text-muted-foreground mt-0.5">
                  {new Date(a.created_at).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}