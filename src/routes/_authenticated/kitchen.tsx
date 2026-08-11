import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { itemLabel } from "@/lib/format";
import {
  Volume2, VolumeX, RefreshCw, Eye, MoreVertical, ChefHat, Check,
  ChevronDown, Printer, X, Play, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { AnnouncementBell } from "@/components/AnnouncementBell";

export const Route = createFileRoute("/_authenticated/kitchen")({
  component: KitchenPage,
  head: () => ({ meta: [{ title: "Kitchen — Fudiyo" }] }),
});

type Status = "pending" | "cooking" | "ready" | "billed" | "cleared" | "voided";
type Tab = "all" | "new" | "cooking" | "ready" | "done";
const TAB_TO_STATUS: Record<Exclude<Tab, "all">, Status> = {
  new: "pending", cooking: "cooking", ready: "ready", done: "billed",
};

interface OrderItem { name: string; qty: number; note?: string; variant?: string }
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

/** Stage colours reused by tabs, badges and move animations. */
const STAGE_COLOR: Record<"pending" | "cooking" | "ready" | "billed", string> = {
  pending: "#F59E0B",
  cooking: "#3B82F6",
  ready: "#16A34A",
  billed: "#6B7280",
};

/** Drop internal tokens (order code, payment method) from the KOT note line. */
function cleanNote(note: string | null): string {
  if (!note) return "";
  return note
    .split(/\s{2,}|\|/)
    .flatMap((chunk) => chunk.split(" "))
    .filter((tok) => tok && !/^Code:/i.test(tok) && !/^Pay:/i.test(tok))
    .join(" ")
    .trim();
}

const COOK_LS = "fudiyo.kds.cookTimers";
type CookTimer = { start: number; end?: number };
function readCookTimers(): Record<string, CookTimer> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(COOK_LS) ?? "{}") as Record<string, CookTimer>; } catch { return {}; }
}
function fmtDur(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return m < 1 ? `${s}s` : `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("all");
  const [muted, setMuted] = useState(() => typeof window !== "undefined" && localStorage.getItem("kds-muted") === "1");
  const [flash, setFlash] = useState(false);
  const [splash, setSplash] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<Order | null>(null);
  const [dateFilter, setDateFilter] = useState<"today" | "24h" | "all">("today");
  const [dateOpen, setDateOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cookTimers, setCookTimers] = useState<Record<string, CookTimer>>({});
  const seenRef = useRef<Set<string>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

  const load = async () => {
    setRefreshing(true);
    const [{ data: o }, { data: t }] = await Promise.all([
      supabase.from("orders").select("id,table_id,status,items,created_at,order_type,note,round").order("created_at", { ascending: false }),
      supabase.from("tables").select("id,number"),
    ]);
    if (o) setOrders(o as unknown as Order[]);
    if (t) setTables(Object.fromEntries(t.map((x) => [x.id, x.number])));
    setTimeout(() => setRefreshing(false), 400);
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
  useEffect(() => { setCookTimers(readCookTimers()); }, []);

  const counts = useMemo(() => ({
    all: orders.filter((o) => o.status === "pending" || o.status === "cooking" || o.status === "ready").length,
    new: orders.filter((o) => o.status === "pending").length,
    cooking: orders.filter((o) => o.status === "cooking").length,
    ready: orders.filter((o) => o.status === "ready").length,
    done: orders.filter((o) => o.status === "billed").length,
  }), [orders]);

  const visible = tab === "all"
    ? orders.filter((o) => o.status === "pending" || o.status === "cooking" || o.status === "ready")
    : orders.filter((o) => o.status === TAB_TO_STATUS[tab]);

  // Apply date filter
  const dateFiltered = useMemo(() => {
    if (dateFilter === "all") return visible;
    const cutoff = dateFilter === "24h" ? Date.now() - 86400000 : new Date().setHours(0, 0, 0, 0);
    return visible.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  }, [visible, dateFilter]);

  const dateLabel = dateFilter === "today" ? "Today" : dateFilter === "24h" ? "Last 24h" : "All Time";

  const advance = async (o: Order) => {
    const next: Status = o.status === "pending" ? "cooking" : o.status === "cooking" ? "ready" : "billed";
    const label = next === "cooking" ? "Moved to Cooking" : next === "ready" ? "Moved to Ready" : "Order Complete";
    setCookTimers((prev) => {
      const nextTimers = { ...prev };
      if (next === "cooking") nextTimers[o.id] = { start: Date.now() };
      if (next === "ready" && nextTimers[o.id] && !nextTimers[o.id].end) {
        nextTimers[o.id] = { ...nextTimers[o.id], end: Date.now() };
      }
      try { localStorage.setItem(COOK_LS, JSON.stringify(nextTimers)); } catch {}
      return nextTimers;
    });
    setSplash((s) => ({ ...s, [o.id]: label }));
    setTimeout(() => setSplash((s) => { const n = { ...s }; delete n[o.id]; return n; }), 1500);
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", o.id);
    if (error) { toast.error(error.message); return; }
    if (next === "billed") {
      await supabase.from("notifications").insert({ type: "order_ready" as never, message: `Order ready for pickup` });
    }
  };

  const tabPills: { key: Tab; label: string }[] = [
    { key: "all", label: "All Active" },
    { key: "new", label: "New" },
    { key: "cooking", label: "Cooking" },
    { key: "ready", label: "Ready" },
    { key: "done", label: "Done" },
  ];

  return (
    <div className="min-h-screen -mx-6 px-6 pt-5 pb-8 bg-[#111827] text-white">
      {flash && <div className="fixed inset-0 z-50 bg-amber-400/30 pointer-events-none animate-pulse" />}
      <header className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-[#1E293B] inline-flex items-center justify-center">
            <ChefHat className="size-6 text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">Kitchen Display</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Fudiyo Kitchen · {counts.all} order(s) in queue ·{" "}
              <span className="inline-flex items-center gap-1 text-[#16A34A]">
                <span className="inline-block size-1.5 rounded-full bg-[#16A34A] animate-pulse" /> Live
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center relative">
          <div className="relative">
            <button onClick={() => setDateOpen((v) => !v)} className="h-10 px-3 rounded-md border border-white/20 inline-flex items-center gap-1.5 text-sm hover:bg-white/10">
              <Calendar className="size-4" /> {dateLabel} <ChevronDown className="size-3.5" />
            </button>
            {dateOpen && (
              <div className="absolute right-0 top-11 z-40 w-44 rounded-md border border-white/10 bg-[#1E293B] shadow-xl py-1">
                {([["today", "Today"], ["24h", "Last 24 Hours"], ["all", "All Time"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => { setDateFilter(k); setDateOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 ${dateFilter === k ? "text-[#0D9488] font-semibold" : "text-white"}`}>
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setMuted((m) => !m)} title={muted ? "Unmute" : "Mute"} className="size-10 rounded-md border border-white/20 inline-flex items-center justify-center hover:bg-white/10">
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <AnnouncementBell className="size-10 rounded-md border border-white/20 inline-flex items-center justify-center text-white hover:bg-white/10" />
          <button onClick={() => void load()} disabled={refreshing} className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] inline-flex items-center gap-2 text-sm font-semibold text-white disabled:opacity-70">
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      <div className="flex gap-2 my-5 flex-wrap">
        {tabPills.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`h-10 px-4 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition ${
                active ? "bg-[#0D9488] text-white" : "bg-transparent border border-white/20 text-white hover:bg-white/10"
              }`}
            >
              {t.label}
              <span className={`min-w-[22px] text-center text-xs font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-white/10"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {dateFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <ChefHat className="size-20 mb-5 text-gray-600" strokeWidth={1.5} />
          <p className="text-xl font-semibold text-gray-300">No active orders</p>
          <p className="text-sm text-gray-500 mt-1">New orders will appear here when they come in.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 items-start">
          {dateFiltered.map((o, i) => (
            <KdsCard
              key={o.id}
              o={o}
              index={i + 1}
              tableNo={o.table_id ? tables[o.table_id] : null}
              splash={splash[o.id]}
              cook={cookTimers[o.id]}
              onAdvance={() => advance(o)}
              onView={() => setDetail(o)}
            />
          ))}
        </div>
      )}

      {detail && <DetailModal o={detail} tableNo={detail.table_id ? tables[detail.table_id] : null} onClose={() => setDetail(null)} />}
    </div>
  );
}

function KdsCard({
  o, index, tableNo, splash, cook, onAdvance, onView,
}: {
  o: Order; index: number; tableNo: string | null;
  splash?: string; cook?: CookTimer; onAdvance: () => void; onView: () => void;
}) {
  const [elapsed, setElapsed] = useState("0m");
  const [cookElapsed, setCookElapsed] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 1000);
      const m = Math.floor(s / 60);
      setElapsed(m < 1 ? `${s}s` : `${m}m`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [o.created_at]);

  useEffect(() => {
    if (!cook) { setCookElapsed(""); return; }
    if (cook.end) { setCookElapsed(fmtDur(cook.end - cook.start)); return; }
    const tick = () => setCookElapsed(fmtDur(Date.now() - cook.start));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [cook]);

  const meta =
    o.status === "pending"
      ? { left: "border-l-[#F59E0B]", badge: "NEW", badgeCls: "bg-[#F59E0B]/15 text-[#F59E0B]", btn: { label: "START COOKING", icon: <Play className="size-4" />, cls: "bg-[#F59E0B] hover:bg-[#D97706]" } }
      : o.status === "cooking"
      ? { left: "border-l-[#3B82F6]", badge: "COOKING", badgeCls: "bg-[#3B82F6]/15 text-[#3B82F6]", btn: { label: "MARK READY", icon: <Check className="size-4" />, cls: "bg-[#3B82F6] hover:bg-[#2563EB]" } }
      : o.status === "ready"
      ? { left: "border-l-[#16A34A]", badge: "READY", badgeCls: "bg-[#16A34A]/15 text-[#16A34A]", btn: { label: "MARK DONE", icon: <Check className="size-4" />, cls: "bg-[#16A34A] hover:bg-[#15803D]" } }
      : { left: "border-l-gray-400", badge: "DONE", badgeCls: "bg-gray-200 text-gray-700", btn: null };

  const shortId = o.id.slice(0, 6).toUpperCase();
  const nextStage: "cooking" | "ready" | "billed" =
    o.status === "pending" ? "cooking" : o.status === "cooking" ? "ready" : "billed";
  const splashColor = STAGE_COLOR[nextStage];
  const note = cleanNote(o.note);

  return (
    <div className={`relative rounded-xl bg-white text-gray-900 border-l-4 ${meta.left} shadow-lg overflow-hidden`}>
      {splash && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white animate-in fade-in zoom-in duration-200" style={{ backgroundColor: splashColor }}>
          <Check className="size-12" strokeWidth={3} />
          <div className="mt-2 text-base font-bold">{splash}</div>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${meta.badgeCls}`}>{meta.badge}</span>
          <span className="text-base font-bold">#{index}</span>
          <span className="text-xs text-gray-500">{o.order_type === "dine_in" ? `Dine In${tableNo ? ` · T${tableNo}` : ""}` : o.order_type.replace("_", " ")}</span>
          <span title="Order age" className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full">
            ⏱ {elapsed}
          </span>
          {cookElapsed && (
            <span
              title={cook?.end ? "Cooking time (final)" : "Cooking time"}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cook?.end ? "text-[#3B82F6] bg-[#3B82F6]/10" : "text-[#F59E0B] bg-[#F59E0B]/10"}`}>
              🔥 {cookElapsed}
            </span>
          )}
          <button onClick={onView} className="size-7 inline-flex items-center justify-center rounded hover:bg-gray-100 text-gray-500" title="View details">
            <Eye className="size-4" />
          </button>
        </div>
        <div className="text-[11px] text-gray-400 mt-1">ID: {shortId}</div>
        <div className="border-t my-3" />
        <ul className="space-y-0">
          {o.items.map((it, k) => (
            <li key={k} className="py-1.5 border-b last:border-b-0 border-gray-100">
              <div className="text-sm">
                <span className="font-semibold text-gray-900">{it.qty}×</span> {itemLabel(it)}
              </div>
              {it.note && <div className="text-[11px] text-amber-700">⚠ {it.note}</div>}
            </li>
          ))}
          {note && <li className="py-1 text-[11px] text-amber-700">⚠ {note}</li>}
        </ul>
        {meta.btn && (
          <div className="flex items-center gap-2 mt-4">
            <button onClick={onAdvance} className={`flex-1 h-11 rounded-md inline-flex items-center justify-center gap-2 text-white font-bold text-sm tracking-wide transition ${meta.btn.cls}`}>
              {meta.btn.icon} {meta.btn.label}
            </button>
            <div>
              <button ref={menuBtnRef} onClick={() => setMenuOpen((v) => !v)} className="size-11 rounded-md border border-gray-200 inline-flex items-center justify-center hover:bg-gray-50" title="More">
                <MoreVertical className="size-4 text-gray-500" />
              </button>
              {menuOpen && (
                <FloatingMenu anchor={menuBtnRef.current} onClose={() => setMenuOpen(false)}>
                  <MenuItem onClick={() => { setMenuOpen(false); onView(); }}>View Details</MenuItem>
                  <MenuItem onClick={() => { setMenuOpen(false); window.print(); }}><Printer className="size-3.5" /> Print KOT</MenuItem>
                  <MenuItem onClick={() => setMenuOpen(false)}>Cancel</MenuItem>
                  <MenuItem onClick={() => setMenuOpen(false)} danger>Delete</MenuItem>
                </FloatingMenu>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Viewport-aware dropdown rendered in a portal so tall cards never clip it. */
function FloatingMenu({ anchor, onClose, children }: { anchor: HTMLElement | null; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const h = ref.current?.offsetHeight ?? 168;
      const w = ref.current?.offsetWidth ?? 176;
      const below = window.innerHeight - r.bottom;
      const top = below >= h + 12 ? r.bottom + 6 : Math.max(8, r.top - h - 6);
      const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
      setStyle({ top, left });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); };
  }, [anchor]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <button onClick={onClose} className="fixed inset-0 z-[70]" aria-label="Close menu" />
      <div
        ref={ref}
        className="fixed z-[71] w-44 bg-white border border-gray-200 rounded-md shadow-xl py-1 text-sm text-gray-800"
        style={{ top: style?.top ?? -9999, left: style?.left ?? -9999, visibility: style ? "visible" : "hidden" }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 inline-flex items-center gap-2 hover:bg-gray-50 ${danger ? "text-[#DC2626]" : ""}`}
    >
      {children}
    </button>
  );
}

function DetailModal({ o, tableNo, onClose }: { o: Order; tableNo: string | null; onClose: () => void }) {
  const created = new Date(o.created_at);
  const elapsedM = Math.floor((Date.now() - created.getTime()) / 60000);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white text-gray-900 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="p-5 border-b flex items-start gap-3">
          <div className="size-10 rounded-lg bg-[#FEE2E2] inline-flex items-center justify-center">
            <ChefHat className="size-5 text-[#DC2626]" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Order #{o.round || 1}</h2>
            <p className="text-xs text-gray-500">ID: {o.id.slice(0, 6).toUpperCase()} · {o.order_type === "dine_in" ? `Dine In${tableNo ? ` · T${tableNo}` : ""}` : o.order_type.replace("_", " ")}</p>
          </div>
          <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
        </div>
        <div className="grid grid-cols-4 gap-2 p-5 border-b text-center">
          {[
            { label: "ORDER TIME", value: created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
            { label: "KOT TIME", value: created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
            { label: "ELAPSED", value: `${elapsedM}m` },
            { label: "CUSTOMER", value: "—" },
          ].map((c) => (
            <div key={c.label}>
              <div className="text-[10px] font-semibold text-gray-500 tracking-wider">{c.label}</div>
              <div className="text-sm font-bold mt-0.5">{c.value}</div>
            </div>
          ))}
        </div>
        <div className="p-5 max-h-72 overflow-y-auto">
          {o.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b last:border-b-0">
              <div className="text-base font-bold w-8">{it.qty}×</div>
              <div className="flex-1 text-sm">{itemLabel(it)}</div>
              <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Main</span>
            </div>
          ))}
        </div>
        <div className="p-4 bg-gray-50 flex gap-2 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-100">Close</button>
          <button onClick={() => window.print()} className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2">
            <Printer className="size-4" /> Print KOT
          </button>
        </div>
      </div>
    </div>
  );
}