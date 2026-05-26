import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/lib/format";
import { ChevronDown, ChevronUp, Printer, Eye, Pencil, Calendar } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  validateSearch: (s: Record<string, unknown>) => ({ table: (s.table as string) ?? undefined }),
  component: HistoryPage,
  head: () => ({ meta: [{ title: "History — Fudiyo" }] }),
});

type SubTab = "orders" | "scheduled" | "summary";
type Status = "pending" | "cooking" | "ready" | "billed" | "cleared" | "voided";

interface OrderItem { name: string; qty: number; price?: number; note?: string }
interface OrderRow {
  id: string;
  table_id: string | null;
  status: Status;
  items: OrderItem[];
  created_at: string;
  order_type: string;
  waiter_name: string | null;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string | null;
}

function HistoryPage() {
  const [tab, setTab] = useState<SubTab>("orders");
  return (
    <main className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Order History & Billing" subtitle="Filters, expandable orders, split bill, void" />
      <div className="border-b border-border mb-6 flex gap-1">
        {([["orders","Orders"],["scheduled","Scheduled"],["summary","Sales Summary"]] as const).map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab===t?"border-primary text-primary":"border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>
      {tab === "orders" && <OrdersTab />}
      {tab === "scheduled" && <ScheduledTab />}
      {tab === "summary" && <SummaryTab />}
    </main>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [tables, setTables] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [range, setRange] = useState<"today"|"yesterday"|"7d"|"30d">("today");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const load = async () => {
    const [{ data: o }, { data: t }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("tables").select("id,number,floor"),
    ]);
    if (o) setOrders(o as unknown as OrderRow[]);
    if (t) setTables(Object.fromEntries(t.map((x) => [x.id, x.number])));
  };

  useEffect(() => {
    void load();
    const ch = supabase.channel("orders-history").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load()).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = range === "today" ? new Date().setHours(0,0,0,0)
      : range === "yesterday" ? new Date(Date.now() - 86400000).setHours(0,0,0,0)
      : range === "7d" ? now - 7*86400000 : now - 30*86400000;
    const top = range === "yesterday" ? new Date().setHours(0,0,0,0) : Infinity;
    return orders.filter((o) => {
      const ts = new Date(o.created_at).getTime();
      if (ts < cutoff || ts >= top) return false;
      if (status !== "all" && o.status !== status) return false;
      if (search && !o.id.includes(search) && !(o.waiter_name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [orders, search, status, range]);

  const stats = useMemo(() => {
    const revenue = filtered.reduce((s, o) => s + Number(o.total), 0);
    const cash = filtered.filter((o) => o.payment_method === "cash").length;
    const upi = filtered.filter((o) => o.payment_method === "upi").length;
    const completed = filtered.filter((o) => o.status === "billed" || o.status === "cleared").length;
    return { revenue, count: filtered.length, cash, upi, completed };
  }, [filtered]);

  const pending = orders.filter((o) => o.status === "ready" || o.status === "billed");

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat color="#16A34A" label="REVENUE" value={formatINR(stats.revenue)} sub="incl. tax" />
        <Stat color="#2563EB" label="ORDERS" value={String(stats.count)} />
        <Stat color="#7C3AED" label="PAYMENTS" value={`${stats.cash} cash · ${stats.upi} UPI`} />
        <Stat color="#D97706" label="COMPLETED" value={String(stats.completed)} />
      </div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search id or waiter..." className="h-9 px-3 rounded-md border border-input bg-card text-sm flex-1 min-w-[200px]" />
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm">
          <option value="all">All Status</option>
          <option value="billed">Billed</option><option value="cleared">Cleared</option>
          <option value="pending">Pending</option><option value="cooking">Cooking</option><option value="ready">Ready</option><option value="voided">Voided</option>
        </select>
        {(["today","yesterday","7d","30d"] as const).map((r) => (
          <button key={r} onClick={()=>setRange(r)} className={`h-9 px-3 rounded-md text-sm font-medium capitalize ${range===r?"bg-primary text-primary-foreground":"border border-input bg-card"}`}>{r}</button>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">Pending Bills ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((o) => <PendingCard key={o.id} o={o} tableNo={o.table_id ? tables[o.table_id] : "—"} onRefresh={load} />)}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No orders in this range</div>
        ) : filtered.map((o) => {
          const isOpen = open.has(o.id);
          return (
            <div key={o.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button onClick={() => setOpen((s) => { const n = new Set(s); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; })} className="w-full p-4 flex items-center gap-4 text-left hover:bg-muted/40">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">#{o.id.slice(0, 8)}</span>
                    <StatusBadge s={o.status} />
                    <span className="text-xs text-muted-foreground">{o.waiter_name ?? "—"} · {new Date(o.created_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{o.table_id ? `Table ${tables[o.table_id]}` : "—"} · {o.order_type.replace("_"," ")}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{formatINR(Number(o.total))}</div>
                  <div className="text-xs text-muted-foreground capitalize">{o.payment_method ?? "—"}</div>
                </div>
                {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {isOpen && <OrderDetails o={o} />}
            </div>
          );
        })}
      </div>
    </>
  );
}

function PendingCard({ o, tableNo, onRefresh }: { o: OrderRow; tableNo: string; onRefresh: () => void }) {
  const [split, setSplit] = useState(1);
  const [discount, setDiscount] = useState(0);
  const total = Math.max(0, Number(o.total) - discount);
  const clear = async () => {
    await supabase.from("orders").update({ status: "cleared", payment_method: o.payment_method ?? "cash" }).eq("id", o.id);
    if (o.table_id) await supabase.from("tables").update({ status: "available", occupied_since: null }).eq("id", o.table_id);
    toast.success("Bill cleared, table available");
    onRefresh();
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Table {tableNo}</div>
        <div className="font-bold text-primary">{formatINR(total)}</div>
      </div>
      <ul className="text-xs text-muted-foreground space-y-0.5 mb-3">
        {o.items.map((it, k) => <li key={k}>{it.qty}× {it.name}</li>)}
      </ul>
      <div className="flex gap-2 mb-3 text-xs">
        <label className="flex items-center gap-1">Discount ₹<input type="number" value={discount} onChange={(e)=>setDiscount(Number(e.target.value))} className="w-20 h-7 px-2 rounded border border-input bg-background" /></label>
        <label className="flex items-center gap-1">Split ÷<input type="number" min={1} value={split} onChange={(e)=>setSplit(Math.max(1,Number(e.target.value)))} className="w-14 h-7 px-2 rounded border border-input bg-background" /></label>
        {split > 1 && <span className="text-muted-foreground">= {formatINR(total/split)} each</span>}
      </div>
      <button onClick={clear} className="w-full h-10 rounded-md bg-[#DC2626] text-white text-sm font-bold hover:bg-[#B91C1C]">PAID — CLEAR TABLE</button>
    </div>
  );
}

function OrderDetails({ o }: { o: OrderRow }) {
  return (
    <div className="border-t border-border p-4 bg-muted/20">
      <ul className="space-y-1 mb-3">
        {o.items.map((it, k) => (
          <li key={k} className="flex justify-between text-sm">
            <span>{it.qty}× {it.name}</span>
            <span>{formatINR((it.price ?? 0) * it.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-border pt-2 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(Number(o.subtotal))}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">GST 5%</span><span>{formatINR(Number(o.tax))}</span></div>
        <div className="flex justify-between font-bold"><span>TOTAL</span><span>{formatINR(Number(o.total))}</span></div>
      </div>
      <div className="text-xs text-muted-foreground mt-3 font-mono">Order ID: {o.id}</div>
      <div className="flex gap-2 mt-3">
        <button className="h-8 px-3 rounded border border-input text-xs font-semibold inline-flex items-center gap-1"><Eye className="size-3" /> View</button>
        <button className="h-8 px-3 rounded border border-input text-xs font-semibold inline-flex items-center gap-1"><Printer className="size-3" /> Print</button>
        <button className="h-8 px-3 rounded border border-input text-xs font-semibold inline-flex items-center gap-1"><Pencil className="size-3" /> Edit Order</button>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const map: Record<Status, string> = {
    billed: "bg-[#16A34A]/15 text-[#16A34A]",
    cleared: "bg-[#16A34A]/15 text-[#16A34A]",
    pending: "bg-[#2563EB]/15 text-[#2563EB]",
    cooking: "bg-[#D97706]/15 text-[#D97706]",
    ready: "bg-[#D97706]/15 text-[#D97706]",
    voided: "bg-[#DC2626]/15 text-[#DC2626]",
  };
  const label: Record<Status, string> = { billed: "BILLING COMPLETED", cleared: "CLEARED", pending: "PENDING", cooking: "IN PROGRESS", ready: "PENDING BILL", voided: "VOIDED" };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${map[s]}`}>{label[s]}</span>;
}

function Stat({ color, label, value, sub }: { color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
      <div className="text-[10px] font-semibold tracking-wider" style={{ color }}>{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function ScheduledTab() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <Calendar className="size-12 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground">No scheduled orders yet</p>
    </div>
  );
}

function SummaryTab() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  useEffect(() => {
    void supabase.from("orders").select("*").gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()).then(({ data }) => data && setOrders(data as unknown as OrderRow[]));
  }, []);
  const revenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const avg = orders.length ? revenue / orders.length : 0;
  const counts: Record<string, number> = {};
  orders.forEach((o) => o.items.forEach((it) => { counts[it.name] = (counts[it.name] ?? 0) + it.qty; }));
  const top = Object.entries(counts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "—";
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat color="#16A34A" label="REVENUE" value={formatINR(revenue)} />
        <Stat color="#2563EB" label="ORDERS" value={String(orders.length)} />
        <Stat color="#7C3AED" label="AVG ORDER" value={formatINR(avg)} />
        <Stat color="#D97706" label="TOP DISH" value={top} />
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">Time</th><th className="text-right p-3">Orders</th><th className="text-right p-3">Revenue</th></tr></thead>
          <tbody>
            {Array.from({ length: 12 }).map((_, h) => {
              const hour = h + 10;
              const slot = orders.filter((o) => new Date(o.created_at).getHours() === hour);
              return <tr key={h} className="border-t border-border"><td className="p-3">{hour}:00</td><td className="p-3 text-right">{slot.length}</td><td className="p-3 text-right">{formatINR(slot.reduce((s,o)=>s+Number(o.total),0))}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}