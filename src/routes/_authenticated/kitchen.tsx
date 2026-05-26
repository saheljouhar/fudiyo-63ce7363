import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Volume2, VolumeX, RefreshCw, Eye, MoreVertical, ChefHat } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kitchen")({
  component: KitchenPage,
  head: () => ({ meta: [{ title: "Kitchen — Fudiyo" }] }),
});

type Status = "pending" | "cooking" | "ready" | "billed" | "cleared" | "voided";
type Tab = "new" | "cooking" | "ready" | "done";
const TAB_TO_STATUS: Record<Tab, Status> = { new: "pending", cooking: "cooking", ready: "ready", done: "billed" };

interface OrderItem { name: string; qty: number; note?: string }
interface Order {
  id: string;
  table_id: string | null;
  status: Status;
  items: OrderItem[];
  created_at: string;
  order_type: string;
  note: string | null;
  round: number;
}

function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("new");
  const [muted, setMuted] = useState(() => typeof window !== "undefined" && localStorage.getItem("kds-muted") === "1");
  const [flash, setFlash] = useState(false);
  const [pulse, setPulse] = useState<Set<string>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

  const load = async () => {
    const [{ data: o }, { data: t }] = await Promise.all([
      supabase.from("orders").select("id,table_id,status,items,created_at,order_type,note,round").order("created_at", { ascending: false }),
      supabase.from("tables").select("id,number"),
    ]);
    if (o) setOrders(o as unknown as Order[]);
    if (t) setTables(Object.fromEntries(t.map((x) => [x.id, x.number])));
  };

  const beep = () => {
    if (muted) return;
    try {
      audioCtxRef.current ??= new (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  useEffect(() => {
    void load();
    // wake lock
    let wakeLock: { release: () => Promise<void> } | null = null;
    interface NavWL { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }
    (async () => {
      try { wakeLock = await (navigator as NavWL).wakeLock?.request("screen") ?? null; } catch {}
    })();

    const ch = supabase
      .channel("kds-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const id = (payload.new as { id: string }).id;
          if (!seenRef.current.has(id)) {
            seenRef.current.add(id);
            setFlash(true);
            setTimeout(() => setFlash(false), 200);
            beep();
            setPulse((p) => new Set(p).add(id));
            setTimeout(() => setPulse((p) => { const n = new Set(p); n.delete(id); return n; }), 3000);
          }
        }
        void load();
      })
      .subscribe();

    // mark existing as seen on first load
    setTimeout(() => orders.forEach((o) => seenRef.current.add(o.id)), 100);

    return () => { void supabase.removeChannel(ch); void wakeLock?.release(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { localStorage.setItem("kds-muted", muted ? "1" : "0"); }, [muted]);

  const counts = useMemo(() => ({
    new: orders.filter((o) => o.status === "pending").length,
    cooking: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    done: orders.filter((o) => o.status === "served").length,
  }), [orders]);

  const visible = orders.filter((o) => o.status === TAB_TO_STATUS[tab]);

  const advance = async (o: Order) => {
    const next: Status = o.status === "pending" ? "cooking" : o.status === "cooking" ? "ready" : "billed";
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    if (next === "served") {
      await supabase.from("notifications").insert({ type: "order_ready" as never, message: `Order ready for pickup` });
    }
  };

  return (
    <div className="min-h-screen -mx-6 -mt-4 px-6 pt-4 bg-[#111827] text-white">
      {flash && <div className="fixed inset-0 z-50 bg-amber-400/40 pointer-events-none animate-pulse" />}
      <header className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold">Kitchen Display</h1>
          <p className="text-xs text-gray-400 mt-0.5">Fudiyo Kitchen · {counts.new + counts.cooking + counts.ready} order(s) in queue · <span className="text-green-400">🟢 Live</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMuted((m) => !m)} className="size-10 rounded-md border border-white/20 inline-flex items-center justify-center hover:bg-white/10">
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button onClick={load} className="h-10 px-4 rounded-md border border-white/20 inline-flex items-center gap-2 text-sm hover:bg-white/10">
            <RefreshCw className="size-4" /> Refresh
          </button>
        </div>
      </header>

      <div className="flex gap-2 my-5">
        {(["new", "cooking", "ready", "done"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold capitalize border-b-2 transition ${tab === t ? "border-[#14B8A6] text-white" : "border-transparent text-gray-400 hover:text-white"}`}
          >
            {t}: {counts[t]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <ChefHat className="size-16 mb-4" strokeWidth={1.5} />
          <p className="text-xl">No {tab} orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
          {visible.map((o, i) => (
            <KdsCard key={o.id} o={o} index={i + 1} tableNo={o.table_id ? tables[o.table_id] : null} tab={tab} pulsing={pulse.has(o.id)} onAdvance={() => advance(o)} />
          ))}
        </div>
      )}
    </div>
  );
}

function KdsCard({ o, index, tableNo, tab, pulsing, onAdvance }: { o: Order; index: number; tableNo: string | null; tab: Tab; pulsing: boolean; onAdvance: () => void }) {
  const [elapsed, setElapsed] = useState("0:00");
  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 1000);
      setElapsed(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [o.created_at]);

  const btn = tab === "new" ? { label: "START COOKING", cls: "bg-[#2563EB] hover:bg-[#1D4ED8]" }
    : tab === "cooking" ? { label: "MARK READY", cls: "bg-[#14B8A6] hover:bg-[#0F9C8E]" }
    : tab === "ready" ? { label: "DONE ✓", cls: "bg-[#16A34A] hover:bg-[#15803D]" }
    : null;

  return (
    <div className={`rounded-xl bg-[#1F2937] p-4 ${pulsing ? "ring-2 ring-[#14B8A6] animate-pulse" : ""}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-xl font-bold">#{index}</div>
        {tableNo && <span className="text-xs font-semibold bg-[#14B8A6]/20 text-[#14B8A6] px-2 py-0.5 rounded">T{tableNo}</span>}
        <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded capitalize">{o.order_type.replace("_", " ")}</span>
        <span className="text-xs text-[#60A5FA] ml-auto">🕐 {elapsed}</span>
        <Eye className="size-4 text-gray-400" />
        <MoreVertical className="size-4 text-gray-400" />
      </div>
      <div className="border-t border-white/10 my-3" />
      <div className="text-[11px] uppercase text-gray-400 mb-2">{o.items.length} item(s)</div>
      <ul className="space-y-1.5 mb-4">
        {o.items.map((it, k) => (
          <li key={k}>
            <div className="text-base">{it.qty}× {it.name}</div>
            {it.note && <div className="text-xs text-amber-400">⚠ {it.note}</div>}
          </li>
        ))}
        {o.note && <li className="text-xs text-amber-400">⚠ {o.note}</li>}
      </ul>
      {btn && (
        <button onClick={onAdvance} className={`w-full h-11 rounded-md text-white font-bold text-sm tracking-wide transition ${btn.cls}`}>
          {btn.label}
        </button>
      )}
    </div>
  );
}