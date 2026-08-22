import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR, itemLabel } from "@/lib/format";
import {
  Receipt, ChevronDown, ChevronUp, Printer, Eye, Pencil, RotateCcw, Pause,
  Calendar, ClipboardList, LayoutGrid, List, BarChart3, Search, Copy, Check,
  FileSpreadsheet, ArrowUpDown, Plus, X, Minus, Trash2, Download, Play, Ban, Utensils,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  validateSearch: (s: Record<string, unknown>): { table?: string } => ({ table: (s.table as string) ?? undefined }),
  component: HistoryPage,
  head: () => ({ meta: [{ title: "Orders — Fudiyo" }] }),
});

type Tab = "orders" | "scheduled" | "summary" | "bookings";
type Status = "pending" | "cooking" | "ready" | "billed" | "cleared" | "voided";
type ViewMode = "list" | "grid";
type Range = "today" | "yesterday" | "7d" | "30d";

interface OrderItem { name: string; qty: number; price?: number; note?: string; variant?: string }
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
  note: string | null;
}

function HistoryPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const [view, setView] = useState<ViewMode>("list");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [tablesMap, setTablesMap] = useState<Record<string, { number: string; floor: string | null }>>({});

  useEffect(() => {
    void supabase.from("tables").select("id, number, floor").then(({ data }) => {
      if (data) setTablesMap(Object.fromEntries(data.map((t) => [t.id, { number: String(t.number), floor: t.floor ?? null }])));
    });
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const exportAll = () => {
    const rows = [["Order ID","Time","Waiter","Type","Status","Payment","Subtotal","Tax","Total","Items"]];
    for (const o of orders) {
      rows.push([
        o.id, new Date(o.created_at).toLocaleString("en-IN"),
        o.waiter_name ?? "", o.order_type, o.status, o.payment_method ?? "",
        String(o.subtotal), String(o.tax), String(o.total),
        o.items.map((i) => `${i.qty}x ${itemLabel(i)}`).join("; "),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
      if (data) setOrders(data as unknown as OrderRow[]);
    };
    void load();
    const ch = supabase.channel("orders-history").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load()).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  return (
    <main className="p-6 max-w-[1500px] mx-auto">
      <header className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-12 rounded-xl bg-[#0D9488] inline-flex items-center justify-center text-white shrink-0">
            <Receipt className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold text-[#111827] truncate">Order History</h1>
            <p className="text-[13px] text-[#6B7280]">My Restaurant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[#6B7280]">{orders.length} orders</span>
          <button onClick={exportAll} className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white text-[13px] font-semibold text-[#374151] inline-flex items-center gap-1.5 hover:bg-[#F9FAFB]">
            <Download className="size-4" /> Export
          </button>
          <div className="inline-flex border border-[#E5E7EB] rounded-lg overflow-hidden">
            <button onClick={() => setView("list")} className={`size-9 inline-flex items-center justify-center ${view === "list" ? "bg-[#111827] text-white" : "bg-white text-[#6B7280]"}`} aria-label="List view"><List className="size-4" /></button>
            <button onClick={() => setView("grid")} className={`size-9 inline-flex items-center justify-center ${view === "grid" ? "bg-[#111827] text-white" : "bg-white text-[#6B7280]"}`} aria-label="Grid view"><LayoutGrid className="size-4" /></button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-5">
        {([
          ["orders", "orders", ClipboardList],
          ["scheduled", "Scheduled", Calendar],
          ["summary", "Sales Summary", BarChart3],
          ["bookings", "Bookings", Calendar],
        ] as const).map(([key, label, Icon]) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)}
              className={`h-10 px-4 rounded-full inline-flex items-center gap-2 text-[13px] font-semibold border ${active ? "bg-[#0D9488] text-white border-[#0D9488]" : "bg-white text-[#6B7280] border-[#E5E7EB] hover:text-[#111827]"}`}>
              <Icon className="size-4" /> {label}
            </button>
          );
        })}
      </div>

      {tab === "orders" && <OrdersTab orders={orders} view={view} me={me} tablesMap={tablesMap} />}
      {tab === "scheduled" && <ScheduledTab />}
      {tab === "summary" && <SummaryTab orders={orders} />}
      {tab === "bookings" && <BookingsEmbed />}
    </main>
  );
}

/* ---------------- Orders Tab ---------------- */

function OrdersTab({ orders, view, me, tablesMap }: { orders: OrderRow[]; view: ViewMode; me: string | null; tablesMap: Record<string, { number: string; floor: string | null }> }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [range, setRange] = useState<Range>("today");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<{ kind: ActionKind; order: OrderRow } | null>(null);
  const [mine, setMine] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const onAction = (kind: ActionKind, order: OrderRow) => {
    if (kind === "print-bill" || kind === "print-kot") { handleQuickPrint(kind, order); return; }
    setActive({ kind, order });
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    let cutoff: number;
    let top: number = Infinity;
    if (customFrom || customTo) {
      cutoff = customFrom ? new Date(customFrom).setHours(0,0,0,0) : 0;
      top = customTo ? new Date(customTo).setHours(23,59,59,999) : Infinity;
    } else {
      cutoff = range === "today" ? startOfToday
        : range === "yesterday" ? startOfToday - 86400000
        : range === "7d" ? now - 7 * 86400000 : now - 30 * 86400000;
      top = range === "yesterday" ? startOfToday : Infinity;
    }
    return orders.filter((o) => {
      const ts = new Date(o.created_at).getTime();
      if (ts < cutoff || ts >= top) return false;
      if (status !== "all" && o.status !== status) return false;
      if (type !== "all" && o.order_type !== type) return false;
      if (mine && me) {
        const w = (o.waiter_name ?? "").toLowerCase();
        // Match by waiter_name substring against email or user id fragment
        if (!w) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        if (!o.id.toLowerCase().includes(s) && !(o.waiter_name ?? "").toLowerCase().includes(s) && !(o.note ?? "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [orders, search, status, type, range, mine, me, customFrom, customTo]);

  const revenue = filtered.reduce((s, o) => s + Number(o.total), 0);
  const taxTotal = filtered.reduce((s, o) => s + Number(o.tax), 0);
  const completed = filtered.filter((o) => o.status === "billed" || o.status === "cleared").length;
  const pays: Record<string, number> = {};
  filtered.forEach((o) => { if (o.payment_method) pays[o.payment_method] = (pays[o.payment_method] ?? 0) + 1; });

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard tint="#DCFCE7" iconBg="#16A34A" label="REVENUE" value={formatINR(revenue)} sub={`incl. tax: ${formatINR(taxTotal)}`} icon="₹" />
        <StatCard tint="#DBEAFE" iconBg="#2563EB" label="ORDERS" value={String(filtered.length)} icon="📦" />
        <StatCard tint="#EDE9FE" iconBg="#7C3AED" label="PAYMENTS" value={Object.keys(pays).length === 0 ? "--" : Object.entries(pays).map(([k, v]) => `${v} ${k}`).join(" · ")} icon="💳" />
        <StatCard tint="#FEF9C3" iconBg="#D97706" label="COMPLETED" value={String(completed)} icon="✓" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-[#E5E7EB] rounded-xl p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E5E7EB] text-[13px]" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] text-[13px]">
          <option value="all">All Status</option>
          <option value="billed">Billing Completed</option>
          <option value="cooking">In Progress</option>
          <option value="ready">Pending Bill</option>
          <option value="voided">Voided</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 px-3 rounded-lg border border-[#E5E7EB] text-[13px]">
          <option value="all">All Types</option>
          <option value="dine_in">Dine In</option>
          <option value="takeaway">Takeaway</option>
          <option value="delivery">Delivery</option>
        </select>
        {(["today", "yesterday", "7d", "30d"] as Range[]).map((r) => (
          <button key={r} onClick={() => { setRange(r); setCustomFrom(""); setCustomTo(""); }} className={`h-9 px-3 rounded-lg text-[12px] font-semibold capitalize ${range === r && !customFrom && !customTo ? "bg-[#0D9488] text-white" : "border border-[#E5E7EB] bg-white text-[#6B7280]"}`}>
            {r === "today" ? "Today" : r === "yesterday" ? "Yesterday" : r.toUpperCase()}
          </button>
        ))}
        <label className="h-9 px-3 rounded-lg border border-[#E5E7EB] bg-white inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#374151] cursor-pointer">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-[#0D9488]" />
          Mine
        </label>
        <div className="relative">
          <button onClick={() => setDateOpen((v) => !v)} className={`size-9 rounded-lg border inline-flex items-center justify-center ${customFrom || customTo ? "bg-[#0D9488] text-white border-[#0D9488]" : "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"}`} aria-label="Custom date range">
            <Calendar className="size-4" />
          </button>
          {dateOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setDateOpen(false)} />
              <div className="absolute right-0 mt-1 z-40 bg-white rounded-xl shadow-lg border border-[#E5E7EB] p-3 w-[280px]">
                <div className="text-[11px] font-bold uppercase text-[#6B7280] mb-1">From</div>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-full h-9 px-2 rounded-md border border-[#E5E7EB] text-[13px] mb-2" />
                <div className="text-[11px] font-bold uppercase text-[#6B7280] mb-1">To</div>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-full h-9 px-2 rounded-md border border-[#E5E7EB] text-[13px] mb-3" />
                <div className="flex gap-2">
                  <button onClick={() => { setCustomFrom(""); setCustomTo(""); setDateOpen(false); }} className="flex-1 h-9 rounded-md border border-[#E5E7EB] text-[12px] font-semibold">Clear</button>
                  <button onClick={() => setDateOpen(false)} className="flex-1 h-9 rounded-md bg-[#0D9488] text-white text-[12px] font-semibold">Apply</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-[12px] text-[#6B7280] px-1">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#16A34A]" /> Revenue {formatINR(revenue)}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#2563EB]" /> {filtered.length} orders</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#F59E0B]" /> {completed} Completed</span>
      </div>

      {view === "list" ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Empty label="No orders in this range" />
          ) : filtered.map((o, idx) => (
            <OrderCard key={o.id} o={o} idx={idx + 1} tablesMap={tablesMap} expanded={open.has(o.id)} onToggle={() => setOpen((s) => { const n = new Set(s); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; })} onAction={onAction} />
          ))}
        </div>
      ) : (
        <GridView orders={filtered} open={open} setOpen={setOpen} onAction={onAction} />
      )}

      {active?.kind === "view" && <ViewModal order={active.order} onClose={() => setActive(null)} />}
      {active?.kind === "refund" && <RefundModal order={active.order} onClose={() => setActive(null)} />}
      {active?.kind === "edit-details" && <EditDetailsModal order={active.order} onClose={() => setActive(null)} />}
      {active?.kind === "edit-items" && <EditItemsModal order={active.order} onClose={() => setActive(null)} />}
      {active?.kind === "complete" && <CompleteBillingModal order={active.order} tablesMap={tablesMap} onClose={() => setActive(null)} />}
    </>
  );
}

type ActionKind = "view" | "print-bill" | "print-kot" | "refund" | "edit-details" | "edit-items" | "complete";

function StatCard({ tint, iconBg, label, value, sub, icon }: { tint: string; iconBg: string; label: string; value: string; sub?: string; icon: string }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: tint }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="size-7 rounded-lg text-white text-[14px] font-bold inline-flex items-center justify-center" style={{ backgroundColor: iconBg }}>{icon}</div>
        <div className="text-[11px] font-bold tracking-wider text-[#6B7280] uppercase">{label}</div>
      </div>
      <div className="text-[22px] font-bold text-[#111827] leading-tight">{value}</div>
      {sub && <div className="text-[12px] text-[#6B7280] mt-0.5">{sub}</div>}
    </div>
  );
}

function OrderCard({ o, idx, tablesMap, expanded, onToggle, onAction }: { o: OrderRow; idx: number; tablesMap: Record<string, { number: string; floor: string | null }>; expanded: boolean; onToggle: () => void; onAction: (k: ActionKind, o: OrderRow) => void }) {
  const tbl = o.table_id ? tablesMap[o.table_id] : undefined;
  const tableLabel = tbl ? `Table ${tbl.number}${tbl.floor ? ` · ${tbl.floor}` : ""}` : "—";
  const codeMatch = (o.note ?? "").match(/Code:([A-Z0-9]+)/);
  const code = codeMatch ? codeMatch[1] : o.id.slice(0, 4).toUpperCase();
  const time = new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const itemsVisible = expanded ? o.items : o.items.slice(0, 2);
  const more = o.items.length - itemsVisible.length;

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-4">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="size-10 rounded-lg bg-[#FEE2E2] text-[#DC2626] inline-flex items-center justify-center shrink-0"><Receipt className="size-5" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[16px] text-[#111827]">#{idx}</span>
            <StatusBadge s={o.status} />
            <span className="text-[12px] text-[#6B7280]">🕐 {time}</span>
            <span className="text-[11px] bg-[#F1F5F9] text-[#374151] px-2 py-0.5 rounded font-semibold">{o.waiter_name ?? "Manager"}</span>
          </div>
          <div className="text-[12px] text-[#6B7280] mt-1">{formatINR(Number(o.subtotal))} + GST 5%</div>
        </div>
        <div className="text-right">
          <div className="text-[18px] font-bold text-[#111827]">{formatINR(Number(o.total))}</div>
          <div className="text-[13px] text-[#6B7280] capitalize">{o.payment_method ?? "—"}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3 text-[12px]">
        <div><div className="text-[#9CA3AF]">👤 Customer</div><div className="font-semibold text-[#111827] truncate">Walk-in Customer</div></div>
        <div><div className="text-[#9CA3AF]">🪑 Table</div><div className="font-semibold text-[#111827] truncate">{o.table_id ? "—" : "—"}</div></div>
        <div><div className="text-[#9CA3AF]">🍽 Type</div><div className="font-semibold text-[#111827] capitalize">{o.order_type.replace("_", " ")}</div></div>
      </div>

      <div className="mt-3 border-t border-[#F1F5F9] pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-[#111827]">{o.items.length} Items</span>
          <button onClick={onToggle} className="text-[12px] font-semibold text-[#0D9488] inline-flex items-center gap-1">
            {expanded ? <>Hide <ChevronUp className="size-3" /></> : <>View <ChevronDown className="size-3" /></>}
          </button>
        </div>
        <ul className="space-y-0.5 text-[13px]">
          {itemsVisible.map((it, k) => (
            <li key={k} className="flex justify-between text-[#374151]"><span>{it.qty}× {itemLabel(it)}</span><span>{formatINR((it.price ?? 0) * it.qty)}</span></li>
          ))}
          {!expanded && more > 0 && <li className="text-[12px] text-[#0D9488]">+{more} more...</li>}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-[#F1F5F9]">
        <div className="text-[12px] text-[#6B7280] space-y-0.5">
          <div className="inline-flex items-center gap-1">Order Number #{code} <button onClick={() => copy(code)} className="text-[#9CA3AF] hover:text-[#374151]"><Copy className="size-3" /></button></div>
          <div className="inline-flex items-center gap-1 ml-3">Order ID {o.id.slice(0, 8)}… <button onClick={() => copy(o.id)} className="text-[#9CA3AF] hover:text-[#374151]"><Copy className="size-3" /></button></div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <ActionBtn icon={Eye} label="View" onClick={() => onAction("view", o)} />
          <PrintDropdown onPick={(k) => onAction(k, o)} />
          <ActionBtn icon={RotateCcw} label="Refund" onClick={() => onAction("refund", o)} />
          <ActionBtn icon={Pencil} label="Edit Details" onClick={() => onAction("edit-details", o)} />
          <button onClick={() => onAction("edit-items", o)} className="h-8 px-3 rounded-lg bg-[#0D9488] text-white text-[12px] font-semibold inline-flex items-center gap-1"><Pencil className="size-3" /> Edit Items</button>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, tone, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; tone?: string; onClick?: () => void }) {
  const color = tone ?? "#374151";
  return (
    <button onClick={onClick} className="h-8 px-3 rounded-lg border text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#F9FAFB]"
      style={{ borderColor: tone ? `${tone}66` : "#E5E7EB", color }}>
      <Icon className="size-3" /> {label}
    </button>
  );
}

function GridView({ orders, open, setOpen, onAction }: { orders: OrderRow[]; open: Set<string>; setOpen: (fn: (s: Set<string>) => Set<string>) => void; onAction: (k: ActionKind, o: OrderRow) => void }) {
  if (orders.length === 0) return <Empty label="No orders in this range" />;
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <table className="w-full text-[13px]">
        <thead className="bg-[#F9FAFB] text-[11px] uppercase text-[#6B7280]">
          <tr>
            {["Order", "Time", "Customer", "Table", "Type", "Status", "Payment", "Amount", "Actions"].map((h) => (
              <th key={h} className="text-left px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => {
            const expanded = open.has(o.id);
            return (
              <>
                <tr key={o.id} className={`border-t border-[#F1F5F9] cursor-pointer hover:bg-[#F9FAFB] ${i % 2 ? "bg-[#FAFAFA]" : ""}`}
                  onClick={() => setOpen((s) => { const n = new Set(s); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; })}>
                  <td className="px-3 py-2"><div className="font-bold">#{i + 1}</div><div className="text-[11px] text-[#9CA3AF]">{o.id.slice(0, 8)}</div></td>
                  <td className="px-3 py-2">{new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-3 py-2">Walk-in</td>
                  <td className="px-3 py-2">{o.table_id ?? "—"}</td>
                  <td className="px-3 py-2 capitalize">{o.order_type.replace("_", " ")}</td>
                  <td className="px-3 py-2"><StatusBadge s={o.status} /></td>
                  <td className="px-3 py-2 capitalize">{o.payment_method ?? "—"}</td>
                  <td className="px-3 py-2"><div className="font-bold">{formatINR(Number(o.total))}</div><div className="text-[11px] text-[#9CA3AF]">+tax {formatINR(Number(o.tax))}</div></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => onAction("print-bill", o)} title="Print Bill" className="size-7 rounded inline-flex items-center justify-center text-[#F59E0B] hover:bg-[#FEF3C7]"><Printer className="size-3.5" /></button>
                      <button onClick={() => onAction("view", o)} title="View" className="size-7 rounded inline-flex items-center justify-center text-[#6B7280] hover:bg-[#F1F5F9]"><Eye className="size-3.5" /></button>
                      <button onClick={() => onAction("edit-details", o)} title="Edit details" className="size-7 rounded inline-flex items-center justify-center text-[#6B7280] hover:bg-[#F1F5F9]"><Pencil className="size-3.5" /></button>
                      <button onClick={() => onAction("edit-items", o)} title="Edit items" className="size-7 rounded inline-flex items-center justify-center text-[#0D9488] hover:bg-[#F0FDFA]"><Pause className="size-3.5" /></button>
                      <button onClick={() => onAction("refund", o)} title="Refund" className="size-7 rounded inline-flex items-center justify-center text-[#DC2626] hover:bg-[#FEE2E2]"><RotateCcw className="size-3.5" /></button>
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr className="bg-[#F9FAFB]"><td colSpan={9} className="p-4">
                    <ul className="space-y-0.5 text-[13px]">
                      {o.items.map((it, k) => <li key={k} className="flex justify-between"><span>{it.qty}× {itemLabel(it)}</span><span>{formatINR((it.price ?? 0) * it.qty)}</span></li>)}
                    </ul>
                  </td></tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ s }: { s: Status }) {
  const map: Record<Status, { bg: string; fg: string; dot: string; label: string }> = {
    billed:  { bg: "#DCFCE7", fg: "#16A34A", dot: "#16A34A", label: "BILLING COMPLETED" },
    cleared: { bg: "#DCFCE7", fg: "#16A34A", dot: "#16A34A", label: "CLEARED" },
    cooking: { bg: "#FEF3C7", fg: "#D97706", dot: "#F59E0B", label: "IN PROGRESS" },
    pending: { bg: "#FEF3C7", fg: "#D97706", dot: "#F59E0B", label: "IN PROGRESS" },
    ready:   { bg: "#DBEAFE", fg: "#2563EB", dot: "#2563EB", label: "PENDING BILL" },
    voided:  { bg: "#FEE2E2", fg: "#DC2626", dot: "#DC2626", label: "VOIDED" },
  };
  const m = map[s];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: m.bg, color: m.fg }}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: m.dot }} /> {m.label}
    </span>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center text-[14px] text-[#6B7280]">
      <ClipboardList className="size-12 mx-auto text-[#CBD5E1] mb-3" strokeWidth={1.5} />
      {label}
    </div>
  );
}

/* ---------------- Scheduled ---------------- */

function ScheduledTab() {
  const [period, setPeriod] = useState("Upcoming");
  const periods = ["Upcoming", "Today", "This Week", "This Month", "All", "Past"];
  const kotUrl = typeof window !== "undefined" ? `${window.location.origin}/kitchen?print=1` : "/kitchen?print=1";
  const copy = () => { navigator.clipboard.writeText(kotUrl); toast.success("URL copied"); };
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {periods.map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`h-9 px-3 rounded-full text-[12px] font-semibold ${period === p ? "bg-[#0D9488] text-white" : "bg-white border border-[#E5E7EB] text-[#6B7280]"}`}>{p}</button>
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center mb-6">
        <Calendar className="size-14 mx-auto text-[#CBD5E1] mb-3" strokeWidth={1.5} />
        <p className="text-[16px] font-bold text-[#6B7280]">No scheduled orders</p>
        <p className="text-[13px] text-[#9CA3AF] mt-1">Scheduled orders will appear here when created from the billing page</p>
      </div>
      <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
        <div className="text-[13px] font-semibold text-[#2563EB] mb-1">🖨 KOT Auto-Print Setup:</div>
        <div className="text-[12px] text-[#374151] mb-2">Open the URL below in Chrome kiosk mode on your kitchen PC to auto-print orders to thermal printer.</div>
        <div className="flex gap-2">
          <input readOnly value={kotUrl} className="flex-1 h-10 px-3 rounded-lg bg-[#F1F5F9] border border-[#E5E7EB] font-mono text-[12px]" />
          <button onClick={copy} className="h-10 px-4 rounded-lg bg-[#0D9488] text-white text-[13px] font-semibold">Copy</button>
        </div>
      </div>
    </>
  );
}

/* ---------------- Summary ---------------- */

function SummaryTab({ orders }: { orders: OrderRow[] }) {
  const [period, setPeriod] = useState<Range | "custom">("today");
  const [search, setSearch] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const periods: (Range | "custom")[] = ["today", "yesterday", "7d", "30d", "custom"];

  const filtered = useMemo(() => {
    if (period === "custom") return orders;
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const cutoff = period === "today" ? startOfToday
      : period === "yesterday" ? startOfToday - 86400000
      : period === "7d" ? now - 7 * 86400000 : now - 30 * 86400000;
    const top = period === "yesterday" ? startOfToday : Infinity;
    return orders.filter((o) => { const ts = new Date(o.created_at).getTime(); return ts >= cutoff && ts < top; });
  }, [orders, period]);

  const revenue = filtered.reduce((s, o) => s + Number(o.total), 0);
  const subtotal = filtered.reduce((s, o) => s + Number(o.subtotal), 0);
  const avg = filtered.length ? revenue / filtered.length : 0;
  const itemCount = filtered.reduce((s, o) => s + o.items.reduce((a, b) => a + b.qty, 0), 0);
  const uniq = new Set(filtered.flatMap((o) => o.items.map((i) => i.name))).size;

  const types: Record<string, number> = {};
  filtered.forEach((o) => { types[o.order_type] = (types[o.order_type] ?? 0) + 1; });

  const hours: Record<number, number> = {};
  filtered.forEach((o) => { const h = new Date(o.created_at).getHours(); hours[h] = (hours[h] ?? 0) + 1; });
  const busiest = Object.entries(hours).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxHour = Math.max(1, ...busiest.map(([, v]) => v));

  const itemAgg: Record<string, { qty: number; revenue: number }> = {};
  filtered.forEach((o) => o.items.forEach((it) => {
    const cur = itemAgg[it.name] ?? { qty: 0, revenue: 0 };
    cur.qty += it.qty;
    cur.revenue += (it.price ?? 0) * it.qty;
    itemAgg[it.name] = cur;
  }));
  let items = Object.entries(itemAgg).map(([name, v]) => ({ name, ...v }));
  if (search) items = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));
  items.sort((a, b) => sortDesc ? b.qty - a.qty : a.qty - b.qty);
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalRev = items.reduce((s, i) => s + i.revenue, 0);

  const exportCSV = () => {
    const rows = [["Item", "Qty", "Revenue"], ...items.map((i) => [i.name, String(i.qty), String(i.revenue)])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sales.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {periods.map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`h-9 px-3 rounded-full text-[12px] font-semibold capitalize ${period === p ? "bg-[#0D9488] text-white" : "bg-white border border-[#E5E7EB] text-[#6B7280]"}`}>
            {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard tint="#DCFCE7" iconBg="#16A34A" label="REVENUE" value={formatINR(revenue)} sub={`excl. tax: ${formatINR(subtotal)}`} icon="₹" />
        <StatCard tint="#DBEAFE" iconBg="#2563EB" label="ORDERS" value={String(filtered.length)} sub={`avg ${formatINR(avg)}`} icon="📦" />
        <StatCard tint="#EDE9FE" iconBg="#7C3AED" label="ITEMS SOLD" value={String(itemCount)} sub={`${uniq} unique items`} icon="📊" />
        <StatCard tint="#FEF3C7" iconBg="#D97706" label="CUSTOMERS" value={String(filtered.length)} icon="👥" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="text-[14px] font-bold text-[#111827] mb-3">Order Types</div>
          {Object.keys(types).length === 0 ? <p className="text-[13px] text-[#6B7280]">No data</p> : Object.entries(types).map(([k, v]) => {
            const pct = filtered.length ? Math.round((v / filtered.length) * 100) : 0;
            return (
              <div key={k} className="mb-2">
                <div className="flex justify-between text-[13px] text-[#374151]"><span className="capitalize">{k.replace("_", " ")}</span><span>{v} ({pct}%)</span></div>
                <div className="h-2 rounded-full bg-[#F1F5F9] mt-1 overflow-hidden"><div className="h-full bg-[#0D9488]" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
          <div className="text-[14px] font-bold text-[#111827] mb-3">Busiest Hours</div>
          {busiest.length === 0 ? <p className="text-[13px] text-[#6B7280]">No data</p> : busiest.map(([h, v]) => {
            const pct = (v / maxHour) * 100;
            const intensity = Math.round(255 - (pct * 0.5));
            return (
              <div key={h} className="flex items-center gap-2 mb-1.5 text-[12px]">
                <span className="w-12 text-[#6B7280]">{h}:00</span>
                <div className="flex-1 h-5 rounded bg-[#F1F5F9] overflow-hidden">
                  <div className="h-full" style={{ width: `${pct}%`, background: `rgb(245,${intensity},11)` }} />
                </div>
                <span className="w-6 text-right text-[#374151] font-semibold">{v}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-[#F1F5F9]">
          <div className="text-[14px] font-bold text-[#111827]">Item-wise Sales <span className="text-[#6B7280] font-normal">({items.length} Items)</span></div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="h-8 px-3 rounded-lg bg-[#16A34A] text-white text-[12px] font-semibold inline-flex items-center gap-1"><FileSpreadsheet className="size-3" /> CSV</button>
            <button onClick={exportCSV} className="h-8 px-3 rounded-lg bg-[#16A34A] text-white text-[12px] font-semibold inline-flex items-center gap-1"><FileSpreadsheet className="size-3" /> Excel</button>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="h-8 px-3 rounded-lg border border-[#E5E7EB] text-[12px] w-[160px]" />
          </div>
        </div>
        <table className="w-full text-[13px]">
          <thead className="bg-[#F9FAFB] text-[11px] uppercase text-[#6B7280]">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Item</th>
              <th className="text-left px-3 py-2"><button onClick={() => setSortDesc(!sortDesc)} className="inline-flex items-center gap-1">Qty <ArrowUpDown className="size-3" /></button></th>
              <th className="text-left px-3 py-2">Revenue</th>
              <th className="text-left px-3 py-2">% of total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-[#6B7280]">No items</td></tr>
            ) : items.map((it, i) => {
              const pct = totalQty ? (it.qty / totalQty) * 100 : 0;
              const rank = i === 0 ? { label: "1st", bg: "#FEF3C7", fg: "#D97706" } : i === 1 ? { label: "2nd", bg: "#F1F5F9", fg: "#6B7280" } : i === 2 ? { label: "3rd", bg: "#FED7AA", fg: "#9A3412" } : null;
              return (
                <tr key={it.name} className="border-t border-[#F1F5F9]">
                  <td className="px-3 py-2 text-[#6B7280]">{rank ? <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: rank.bg, color: rank.fg }}>{rank.label}</span> : i + 1}</td>
                  <td className="px-3 py-2 text-[#111827]">{it.name}</td>
                  <td className="px-3 py-2"><span className="inline-block bg-[#F0FDFA] text-[#0D9488] font-semibold px-2 py-0.5 rounded-full text-[12px]">{it.qty}</span></td>
                  <td className="px-3 py-2 text-[#111827]">{formatINR(it.revenue)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden"><div className="h-full bg-[#EC4899]" style={{ width: `${pct}%` }} /></div>
                      <span className="text-[12px] text-[#6B7280] w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[#0D9488] font-bold bg-[#F0FDFA]">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2"><span className="inline-block bg-[#0D9488] text-white px-2 py-0.5 rounded-full text-[12px]">{totalQty}</span></td>
                <td className="px-3 py-2 text-[#0D9488]">{formatINR(totalRev)}</td>
                <td className="px-3 py-2 text-[#0D9488]">100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

/* ---------------- Bookings Embed ---------------- */

function BookingsEmbed() {
  const [creating, setCreating] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  if (creating) return <NewBookingForm onClose={() => setCreating(false)} />;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setCreating(true)} className="h-10 px-4 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-semibold inline-flex items-center gap-1.5">
          <Plus className="size-4" /> New Booking
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 bg-white border border-[#E5E7EB] rounded-xl p-3">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 px-3 rounded-lg border text-sm">
          <option value="all">All Types</option>
          <option value="catering">Catering</option>
          <option value="advance">Advance Order</option>
          <option value="venue">Venue / Place</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border text-sm">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 px-3 rounded-lg border text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 px-3 rounded-lg border text-sm" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search... Enter to apply" className="flex-1 min-w-[200px] h-10 px-3 rounded-lg border text-sm" />
      </div>
      <div className="rounded-xl bg-[#FEE2E2]/40 border border-[#FECACA] p-10 text-center">
        <Search className="size-10 mx-auto text-[#F87171] mb-3" strokeWidth={1.5} />
        <h3 className="text-base font-bold text-[#111827]">No bookings found</h3>
        <p className="text-sm text-[#6B7280] mt-1">Try adjusting your filters or create a new booking.</p>
      </div>
    </div>
  );
}

function NewBookingForm({ onClose }: { onClose: () => void }) {
  const [bookingType, setBookingType] = useState<"catering" | "advance" | "venue">("catering");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [eventName, setEventName] = useState("");
  const [guests, setGuests] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [service, setService] = useState(0);
  const [advance, setAdvance] = useState(false);
  const [trackExp, setTrackExp] = useState(false);

  const subtotal = 0;
  const total = Math.max(0, subtotal - discount + tax + service);

  const save = async () => {
    const { error } = await supabase.from("bookings").insert({
      booking_type: bookingType, guest_name: name, phone, email,
      event_name: eventName, party_size: guests, special_instructions: notes,
      booking_time: startDate ? `${startDate}T${startTime || "00:00"}:00` : null,
      total, status: "pending",
    } as never);
    if (error) toast.error(error.message);
    else { toast.success("Booking saved"); onClose(); }
  };

  const types = [
    { id: "catering" as const, icon: "🍽", title: "Catering", desc: "Custom menus for events" },
    { id: "advance" as const, icon: "📋", title: "Advance Order", desc: "Pre-order for pickup/delivery" },
    { id: "venue" as const, icon: "🏛", title: "Venue / Place", desc: "Reserve halls, rooms & event spaces" },
  ];

  return (
    <div className="relative bg-white rounded-xl border border-[#E5E7EB] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">New Booking</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#F59E0B] text-white capitalize">{bookingType}</span>
          <button onClick={onClose} className="size-8 inline-flex items-center justify-center rounded hover:bg-gray-100"><X className="size-4" /></button>
        </div>
      </div>

      <Section n="①" title="Booking Type">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {types.map((t) => (
            <button key={t.id} onClick={() => setBookingType(t.id)}
              className={`p-4 rounded-xl border-2 text-left relative ${bookingType === t.id ? "border-[#F59E0B] bg-[#FFFBEB]" : "border-gray-200 hover:border-gray-300"}`}>
              {bookingType === t.id && <Check className="absolute top-2 right-2 size-5 text-[#F59E0B]" />}
              <div className="text-3xl mb-2">{t.icon}</div>
              <div className="font-semibold">{t.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section n="②" title="Menu Items" subtitle="Search or add custom dishes for the event">
        <div className="flex gap-2 mb-3">
          <input placeholder="Search menu..." className="flex-1 h-10 px-3 rounded-md border text-sm" />
          <button className="h-10 px-3 rounded-md border bg-white text-sm font-semibold inline-flex items-center gap-1"><Plus className="size-4" /> Custom</button>
        </div>
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">No items added yet.</div>
      </Section>

      <Section n="③" title="Customer & Event Details">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <FormField label="PHONE"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="input2" /></FormField>
          <FormField label="NAME"><input value={name} onChange={(e) => setName(e.target.value)} className="input2" /></FormField>
          <FormField label="EMAIL"><input value={email} onChange={(e) => setEmail(e.target.value)} className="input2" /></FormField>
        </div>
        <button className="text-sm text-[#0D9488] font-semibold mb-4">+ Add address</button>
        <h4 className="text-xs font-bold uppercase text-gray-500 mt-2 mb-2">Event Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <FormField label="EVENT NAME"><input value={eventName} onChange={(e) => setEventName(e.target.value)} className="input2" /></FormField>
          <FormField label="GUEST COUNT"><input type="number" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="input2" /></FormField>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <FormField label="START DATE"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input2" /></FormField>
          <FormField label="END DATE (OPTIONAL)"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input2" /></FormField>
          <FormField label="START TIME"><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input2" /></FormField>
          <FormField label="END TIME"><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input2" /></FormField>
        </div>
        <FormField label="SPECIAL INSTRUCTIONS"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input2 min-h-[80px]" /></FormField>
      </Section>

      <Section n="④" title="Pricing & Payment">
        <div className="space-y-2 max-w-md">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-semibold tabular-nums">{formatINR(subtotal)}</span></div>
          <div className="flex justify-between items-center text-sm"><span className="text-gray-500">Discount</span><input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 h-9 px-2 rounded border text-right text-sm" /></div>
          <div className="flex justify-between items-center text-sm"><span className="text-gray-500">Tax</span><input type="number" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-24 h-9 px-2 rounded border text-right text-sm" /></div>
          <div className="flex justify-between items-center text-sm"><span className="text-gray-500">Service</span><input type="number" value={service} onChange={(e) => setService(Number(e.target.value))} className="w-24 h-9 px-2 rounded border text-right text-sm" /></div>
        </div>
        <div className="mt-4 h-14 rounded-lg bg-[#F59E0B] text-white flex items-center justify-between px-5">
          <span className="font-bold">Total</span>
          <span className="text-xl font-bold tabular-nums">{formatINR(total)}</span>
        </div>
        <div className="flex gap-6 mt-3">
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={advance} onChange={(e) => setAdvance(e.target.checked)} /> Advance Payment</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={trackExp} onChange={(e) => setTrackExp(e.target.checked)} /> Track in Expenses</label>
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3 bg-white border-t flex justify-end">
        <button onClick={save} className="h-11 px-6 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold inline-flex items-center gap-1.5">
          <Check className="size-4" /> Save Booking
        </button>
      </div>
      <style>{`.input2 { width:100%; height:38px; padding:0 10px; border-radius:6px; border:1px solid #E5E7EB; font-size:13px; background:white; } textarea.input2 { padding:8px 10px; height:auto; }`}</style>
    </div>
  );
}

function Section({ n, title, subtitle, children }: { n: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 pb-6 border-b border-gray-100 last:border-0">
      <h3 className="text-base font-bold mb-1"><span className="text-[#F59E0B] mr-2">{n}</span>{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-[10px] font-bold tracking-wider text-gray-500 mb-1">{label}</div>{children}</div>;
}

/* ---------------- Order Action Modals ---------------- */

function ModalShell({ title, onClose, children, wide, full }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode; wide?: boolean; full?: boolean }) {
  const w = full ? "w-[95vw] h-[92vh]" : wide ? "w-full max-w-3xl" : "w-full max-w-lg";
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-2xl ${w} max-h-[95vh] overflow-hidden flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
          <div className="text-[15px] font-bold text-[#111827]">{title}</div>
          <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function PrintDropdown({ onPick }: { onPick: (k: ActionKind) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="h-8 px-3 rounded-lg border text-[12px] font-semibold inline-flex items-center gap-1 hover:bg-[#F9FAFB]" style={{ borderColor: "#F59E0B66", color: "#F59E0B" }}>
        <Printer className="size-3" /> Print <ChevronDown className="size-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white shadow-lg rounded-lg border border-[#E5E7EB] overflow-hidden w-[160px]">
            <button onClick={() => { onPick("print-bill"); setOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#F9FAFB]">🧾 Print Bill</button>
            <button onClick={() => { onPick("print-kot"); setOpen(false); }} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#F9FAFB]">🍳 Print KOT</button>
          </div>
        </>
      )}
    </div>
  );
}

export function printReceipt(html: string) {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return;
  w.document.write(`<html><head><title>Print</title><style>body{font-family:ui-monospace,Menlo,monospace;font-size:12px;padding:14px;color:#000}h2{margin:0 0 8px;font-size:16px}table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:2px 0}.r{text-align:right}.b{border-top:1px dashed #000;margin:8px 0}</style></head><body>${html}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close(); }, 200);
}

function renderBillHTML(o: OrderRow) {
  const code = (o.note ?? "").match(/Code:([A-Z0-9]+)/)?.[1] ?? o.id.slice(0, 4).toUpperCase();
  const rows = o.items.map((it) => `<tr><td>${it.qty}× ${itemLabel(it)}</td><td class="r">${formatINR((it.price ?? 0) * it.qty)}</td></tr>`).join("");
  return `<h2>Fudiyo — Bill</h2><div>Order #${code}</div><div>${new Date(o.created_at).toLocaleString("en-IN")}</div><div>Type: ${o.order_type}</div><div class="b"></div><table>${rows}</table><div class="b"></div><table><tr><td>Subtotal</td><td class="r">${formatINR(Number(o.subtotal))}</td></tr><tr><td>Tax</td><td class="r">${formatINR(Number(o.tax))}</td></tr><tr><td><b>Total</b></td><td class="r"><b>${formatINR(Number(o.total))}</b></td></tr></table><div class="b"></div><div>Payment: ${o.payment_method ?? "—"}</div><div style="text-align:center;margin-top:10px">Thank you!</div>`;
}
function renderKotHTML(o: OrderRow) {
  const code = (o.note ?? "").match(/Code:([A-Z0-9]+)/)?.[1] ?? o.id.slice(0, 4).toUpperCase();
  const rows = o.items.map((it) => `<tr><td>${it.qty}×</td><td>${itemLabel(it)}${it.note ? `<div style="font-size:11px;color:#555">${it.note}</div>` : ""}</td></tr>`).join("");
  return `<h2>KOT #${code}</h2><div>${new Date(o.created_at).toLocaleString("en-IN")}</div><div>${o.waiter_name ?? "Waiter"} · ${o.order_type}</div><div class="b"></div><table>${rows}</table>`;
}

export function handleQuickPrint(kind: "print-bill" | "print-kot", o: OrderRow) {
  printReceipt(kind === "print-bill" ? renderBillHTML(o) : renderKotHTML(o));
}

function ViewModal({ order, onClose }: { order: OrderRow; onClose: () => void }) {
  const code = (order.note ?? "").match(/Code:([A-Z0-9]+)/)?.[1] ?? order.id.slice(0, 4).toUpperCase();
  const custName = (order.note ?? "").match(/Name:([^|]+)/)?.[1]?.trim() || "Walk-in Customer";
  const tableNo = (order.note ?? "").match(/Table:([^|]+)/)?.[1]?.trim() || "—";
  return (
    <ModalShell title={`Order #${code}`} onClose={onClose} wide>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[13px]">
          <Info label="Status" value={order.status} />
          <Info label="Type" value={order.order_type} />
          <Info label="Payment" value={order.payment_method ?? "—"} />
          <Info label="Waiter" value={order.waiter_name ?? "—"} />
          <Info label="Customer" value={custName} />
          <Info label="Table" value={tableNo} />
          <Info label="Created" value={new Date(order.created_at).toLocaleString("en-IN")} />
        </div>
        <div>
          <div className="text-[12px] font-bold text-[#6B7280] uppercase mb-2">Items</div>
          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-[#F9FAFB] text-[11px] uppercase text-[#6B7280]"><tr><th className="text-left px-3 py-2">Item</th><th className="text-right px-3 py-2">Qty</th><th className="text-right px-3 py-2">Price</th><th className="text-right px-3 py-2">Total</th></tr></thead>
              <tbody>{order.items.map((it, i) => (
                <tr key={i} className="border-t border-[#F1F5F9]"><td className="px-3 py-2">{itemLabel(it)}{it.note ? <div className="text-[11px] text-[#6B7280]">{it.note}</div> : null}</td><td className="px-3 py-2 text-right">{it.qty}</td><td className="px-3 py-2 text-right">{formatINR(it.price ?? 0)}</td><td className="px-3 py-2 text-right">{formatINR((it.price ?? 0) * it.qty)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        {order.note && <div className="text-[12px] text-[#6B7280]"><span className="font-semibold">Note:</span> {order.note}</div>}
        <div className="rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] p-4 space-y-1.5">
          <div className="flex justify-between text-[13px] text-[#6B7280]"><span>Subtotal</span><span className="font-semibold text-[#111827]">{formatINR(Number(order.subtotal))}</span></div>
          <div className="flex justify-between text-[13px] text-[#6B7280]"><span>Tax</span><span className="font-semibold text-[#111827]">{formatINR(Number(order.tax))}</span></div>
          <div className="flex justify-between text-[15px] font-bold text-[#111827] pt-2 border-t border-[#E5E7EB]"><span>Total</span><span className="text-[#0D9488]">{formatINR(Number(order.total))}</span></div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => handleQuickPrint("print-bill", order)} className="h-9 px-4 rounded-lg border border-[#F59E0B] text-[#F59E0B] text-[13px] font-semibold inline-flex items-center gap-1"><Printer className="size-3.5" /> Print Bill</button>
          <button onClick={onClose} className="h-9 px-4 rounded-lg bg-[#0D9488] text-white text-[13px] font-semibold">Close</button>
        </div>
      </div>
    </ModalShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">{label}</div><div className="text-[13px] font-semibold text-[#111827] capitalize">{value}</div></div>;
}

function RefundModal({ order, onClose }: { order: OrderRow; onClose: () => void }) {
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState<number>(Number(order.total));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const reasons = ["Customer request", "Wrong order", "Quality issue", "Delayed", "Duplicate", "Other"];
  const save = async () => {
    if (!reason) return toast.error("Pick a reason");
    setSaving(true);
    const refundAmt = mode === "full" ? Number(order.total) : amount;
    const note = `${order.note ?? ""} | REFUND:${refundAmt} (${reason}${notes ? ` - ${notes}` : ""})`;
    const { error } = await supabase.from("orders").update({ status: "voided", note }).eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Refunded ${formatINR(refundAmt)}`);
    onClose();
  };
  return (
    <ModalShell title="Process Refund" onClose={onClose}>
      <div className="p-5 space-y-4">
        <div className="flex gap-1 p-1 bg-[#F1F5F9] rounded-lg">
          {(["full", "partial"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`flex-1 h-9 rounded-md text-[13px] font-semibold capitalize ${mode === m ? "bg-white shadow text-[#111827]" : "text-[#6B7280]"}`}>{m} Refund</button>
          ))}
        </div>
        {mode === "partial" && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Refund amount (max {formatINR(Number(order.total))})</div>
            <input type="number" value={amount} min={0} max={Number(order.total)} onChange={(e) => setAmount(Number(e.target.value))} className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-[13px]" />
          </div>
        )}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-2">Reason</div>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <button key={r} onClick={() => setReason(r)} className={`h-8 px-3 rounded-full text-[12px] font-semibold border ${reason === r ? "bg-[#DC2626] text-white border-[#DC2626]" : "bg-white text-[#374151] border-[#E5E7EB]"}`}>{r}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">Notes</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[70px] p-2 rounded-lg border border-[#E5E7EB] text-[13px]" placeholder="Optional…" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border bg-white text-[13px] font-semibold">Cancel</button>
          <button disabled={saving} onClick={save} className="h-10 px-5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[13px] font-semibold disabled:opacity-50">Process Refund</button>
        </div>
      </div>
    </ModalShell>
  );
}

function EditDetailsModal({ order, onClose }: { order: OrderRow; onClose: () => void }) {
  const parseNote = (key: string) => (order.note ?? "").match(new RegExp(`${key}:([^|]+)`))?.[1]?.trim() ?? "";
  const [custName, setCustName] = useState(parseNote("Name"));
  const [mobile, setMobile] = useState(parseNote("Mobile"));
  const [tableNo, setTableNo] = useState(parseNote("Table"));
  const [orderType, setOrderType] = useState(order.order_type);
  const [pay, setPay] = useState((order.payment_method ?? "cash").toLowerCase());
  const [status, setStatus] = useState<string>(order.status);
  const [cashReceived, setCashReceived] = useState<number>(Number(order.total));
  const [freeNote, setFreeNote] = useState((order.note ?? "").split("|").pop()?.trim() ?? "");
  const [saving, setSaving] = useState(false);
  const payMethods: { key: string; label: string }[] = [
    { key: "cash", label: "Cash" }, { key: "upi", label: "UPI" }, { key: "card", label: "Card" },
    { key: "online", label: "Online" }, { key: "other", label: "Other" }, { key: "settlement", label: "Settlement" },
  ];
  const statuses: { key: string; label: string }[] = [
    { key: "billed", label: "Paid" }, { key: "ready", label: "Partial" }, { key: "pending", label: "Due (Udhar)" },
  ];
  const types: { key: string; label: string }[] = [
    { key: "dine_in", label: "Dine-in" }, { key: "takeaway", label: "Takeaway" }, { key: "delivery", label: "Delivery" },
  ];
  const change = Math.max(0, cashReceived - Number(order.total));
  const save = async () => {
    setSaving(true);
    const code = (order.note ?? "").match(/Code:([A-Z0-9]+)/)?.[1];
    const parts = [
      code && `Code:${code}`,
      mobile && `Mobile:${mobile}`,
      custName && `Name:${custName}`,
      tableNo && `Table:${tableNo}`,
      `Pay:${pay}`,
      pay === "cash" && `CashReceived:${cashReceived}`,
      freeNote,
    ].filter(Boolean);
    const { error } = await supabase.from("orders").update({ order_type: orderType, payment_method: pay, status, note: parts.join(" | ") } as never).eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Details updated");
    onClose();
  };
  return (
    <ModalShell title="Edit Order Details" onClose={onClose} wide>
      <div className="p-5 space-y-4">
        {/* Read-only items summary */}
        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2">Items ({order.items.length})</div>
          <ul className="space-y-1 text-[13px] max-h-[140px] overflow-y-auto">
            {order.items.map((it, i) => (
              <li key={i} className="flex justify-between text-[#374151]"><span>{it.qty}× {itemLabel(it)}</span><span className="font-semibold text-[#111827]">{formatINR((it.price ?? 0) * it.qty)}</span></li>
            ))}
          </ul>
        </div>

        <Field label="Customer Name"><input value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-[13px]" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile"><input value={mobile} onChange={(e) => setMobile(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-[13px]" /></Field>
          <Field label="Table #"><input value={tableNo} onChange={(e) => setTableNo(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-[13px]" /></Field>
        </div>

        <Field label="Delivery Type">
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => (
              <button key={t.key} type="button" onClick={() => setOrderType(t.key)}
                className={`h-9 px-4 rounded-full text-[12px] font-semibold border ${orderType === t.key ? "bg-[#0D9488] text-white border-[#0D9488]" : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#0D9488]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Payment Method">
          <div className="flex flex-wrap gap-1.5">
            {payMethods.map((m) => (
              <button key={m.key} type="button" onClick={() => setPay(m.key)}
                className={`h-9 px-4 rounded-full text-[12px] font-semibold border ${pay === m.key ? "bg-[#0D9488] text-white border-[#0D9488]" : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#0D9488]"}`}>
                {m.label}
              </button>
            ))}
          </div>
        </Field>

        {pay === "cash" && (
          <Field label="Cash Received">
            <div className="flex items-center gap-3">
              <input type="number" value={cashReceived} onChange={(e) => setCashReceived(Number(e.target.value))} className="w-40 h-10 px-3 rounded-lg border border-[#E5E7EB] text-[13px]" />
              <div className="text-[12px] text-[#6B7280]">Total <span className="font-semibold text-[#111827]">{formatINR(Number(order.total))}</span></div>
              <div className={`text-[12px] font-semibold ${change > 0 ? "text-[#16A34A]" : "text-[#6B7280]"}`}>Change: {formatINR(change)}</div>
            </div>
          </Field>
        )}

        <Field label="Status">
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <button key={s.key} type="button" onClick={() => setStatus(s.key)}
                className={`h-9 px-4 rounded-full text-[12px] font-semibold border ${status === s.key ? "bg-[#0D9488] text-white border-[#0D9488]" : "bg-white text-[#374151] border-[#E5E7EB] hover:border-[#0D9488]"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Note"><textarea value={freeNote} onChange={(e) => setFreeNote(e.target.value)} className="w-full min-h-[70px] p-2 rounded-lg border border-[#E5E7EB] text-[13px]" /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border bg-white text-[13px] font-semibold">Cancel</button>
          <button disabled={saving} onClick={save} className="h-10 px-5 rounded-lg bg-[#0D9488] hover:bg-[#0B7F75] text-white text-[13px] font-semibold disabled:opacity-50">Save Changes</button>
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">{label}</div>{children}</div>;
}

interface DishLite { id: string; name: string; category: string; price: number; photo_url?: string | null }

function EditItemsModal({ order, onClose }: { order: OrderRow; onClose: () => void }) {
  const [dishes, setDishes] = useState<DishLite[]>([]);
  const [cart, setCart] = useState<OrderItem[]>(() => order.items.map((it) => ({ ...it })));
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [saving, setSaving] = useState(false);
  const parseNote = (key: string) => (order.note ?? "").match(new RegExp(`${key}:([^|]+)`))?.[1]?.trim() ?? "";
  const [orderType, setOrderType] = useState(order.order_type);
  const [mobile, setMobile] = useState(parseNote("Mobile"));
  const [tableNo, setTableNo] = useState(parseNote("Table"));
  const [custName, setCustName] = useState(parseNote("Name"));
  const [covers, setCovers] = useState<number>(1);
  const [pay, setPay] = useState((order.payment_method ?? "cash").toLowerCase());
  useEffect(() => { void supabase.from("dishes").select("id,name,category,price,photo_url").eq("is_archived", false).order("name").then(({ data }) => { if (data) setDishes(data as DishLite[]); }); }, []);
  const cats = useMemo(() => Array.from(new Set(dishes.map((d) => d.category))).sort(), [dishes]);
  const visible = dishes.filter((d) => (cat === "all" || d.category === cat) && (!q || d.name.toLowerCase().includes(q.toLowerCase())));
  const add = (d: DishLite) => setCart((c) => { const ex = c.find((x) => x.name === d.name); if (ex) return c.map((x) => x === ex ? { ...x, qty: x.qty + 1 } : x); return [...c, { name: d.name, qty: 1, price: Number(d.price) }]; });
  const inc = (i: number) => setCart((c) => c.map((x, k) => k === i ? { ...x, qty: x.qty + 1 } : x));
  const dec = (i: number) => setCart((c) => c.map((x, k) => k === i ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0));
  const del = (i: number) => setCart((c) => c.filter((_, k) => k !== i));
  const subtotal = cart.reduce((s, x) => s + (x.price ?? 0) * x.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  const types: { key: string; label: string }[] = [
    { key: "dine_in", label: "Dine In" }, { key: "takeaway", label: "Takeaway" }, { key: "delivery", label: "Delivery" },
  ];
  const payMethods = [{ key: "cash", label: "Cash" }, { key: "upi", label: "UPI" }, { key: "card", label: "Card" }];
  const save = async () => {
    if (cart.length === 0) return toast.error("At least one item required");
    setSaving(true);
    const code = (order.note ?? "").match(/Code:([A-Z0-9]+)/)?.[1];
    const parts = [
      code && `Code:${code}`,
      mobile && `Mobile:${mobile}`,
      custName && `Name:${custName}`,
      tableNo && `Table:${tableNo}`,
      `Pay:${pay}`,
    ].filter(Boolean);
    const { error } = await supabase.from("orders").update({
      items: JSON.parse(JSON.stringify(cart)), subtotal, tax, total,
      order_type: orderType, payment_method: pay, note: parts.join(" | "),
    } as never).eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Items updated");
    onClose();
  };
  const modalTitle = (
    <div className="flex items-center gap-3 flex-wrap">
      <span>Edit Items</span>
      <div className="inline-flex gap-1 p-1 bg-[#F1F5F9] rounded-lg">
        {types.map((t) => (
          <button key={t.key} onClick={() => setOrderType(t.key)}
            className={`h-7 px-3 rounded-md text-[12px] font-semibold ${orderType === t.key ? "bg-white shadow text-[#0D9488]" : "text-[#6B7280]"}`}>{t.label}</button>
        ))}
      </div>
    </div>
  );
  return (
    <ModalShell title={modalTitle} onClose={onClose} full>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-0 h-full">
        <div className="flex flex-col border-r border-[#E5E7EB] min-h-0">
          <div className="p-3 border-b border-[#E5E7EB]">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menu…" className="w-full h-10 px-3 rounded-lg border border-[#E5E7EB] text-[13px]" />
          </div>
          <div className="px-3 pt-2 pb-2 border-b border-[#E5E7EB] overflow-x-auto">
            <div className="inline-flex gap-1.5 whitespace-nowrap">
              <button onClick={() => setCat("all")} className={`h-8 px-3 rounded-full text-[12px] font-semibold border ${cat === "all" ? "bg-[#0D9488] text-white border-[#0D9488]" : "bg-white text-[#374151] border-[#E5E7EB]"}`}>All</button>
              {cats.map((c) => (
                <button key={c} onClick={() => setCat(c)} className={`h-8 px-3 rounded-full text-[12px] font-semibold border ${cat === c ? "bg-[#0D9488] text-white border-[#0D9488]" : "bg-white text-[#374151] border-[#E5E7EB]"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 md:grid-cols-3 gap-2 content-start">
            {visible.map((d) => (
              <button key={d.id} onClick={() => add(d)} className="text-left rounded-lg border border-[#E5E7EB] bg-white hover:border-[#0D9488] hover:shadow transition overflow-hidden">
                <div className="aspect-video bg-[#F1F5F9] flex items-center justify-center overflow-hidden">
                  {d.photo_url ? (
                    <img src={d.photo_url} alt={d.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-[#94A3B8]">{d.name[0]?.toUpperCase() ?? "?"}</span>
                  )}
                </div>
                <div className="p-2">
                  <div className="text-[13px] font-semibold text-[#111827] line-clamp-2">{d.name}</div>
                  <div className="text-[11px] text-[#9CA3AF]">{d.category}</div>
                  <div className="text-[13px] font-bold text-[#DC2626] mt-1">{formatINR(Number(d.price))}</div>
                </div>
              </button>
            ))}
            {visible.length === 0 && <div className="col-span-full text-center text-[13px] text-[#6B7280] py-10">No dishes match</div>}
          </div>
        </div>
        <aside className="flex flex-col min-h-0">
          <div className="p-3 border-b border-[#E5E7EB] text-[13px] font-bold text-[#111827]">Order Summary ({cart.length})</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 && <div className="text-[13px] text-[#6B7280] text-center py-6">No items</div>}
            {cart.map((it, i) => (
              <div key={i} className="border border-[#E5E7EB] rounded-lg p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="text-[13px] font-semibold text-[#111827] truncate">{itemLabel(it)}</div><div className="text-[12px] text-[#6B7280]">{formatINR(it.price ?? 0)}</div></div>
                  <button onClick={() => del(i)} className="text-[#DC2626] hover:bg-[#FEE2E2] rounded p-1"><Trash2 className="size-3.5" /></button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="inline-flex items-center gap-2">
                    <button onClick={() => dec(i)} className="size-7 rounded border border-[#E5E7EB] inline-flex items-center justify-center"><Minus className="size-3" /></button>
                    <span className="w-6 text-center text-[13px] font-semibold">{it.qty}</span>
                    <button onClick={() => inc(i)} className="size-7 rounded border border-[#E5E7EB] inline-flex items-center justify-center"><Plus className="size-3" /></button>
                  </div>
                  <div className="text-[13px] font-bold">{formatINR((it.price ?? 0) * it.qty)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#E5E7EB] p-3 space-y-2 text-[13px]">
            <div className="flex justify-between text-[#6B7280]"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
            <div className="flex justify-between text-[#6B7280]"><span>Tax (5%)</span><span>{formatINR(tax)}</span></div>
            <div className="rounded-lg bg-[#0D9488] text-white flex justify-between items-center px-3 py-2.5">
              <span className="text-[13px] font-semibold">Total</span>
              <span className="text-[16px] font-bold">{formatINR(total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile" className="h-9 px-2 rounded-md border border-[#E5E7EB] text-[12px]" />
              <input value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="Table No" className="h-9 px-2 rounded-md border border-[#E5E7EB] text-[12px]" />
              <input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Customer Name" className="col-span-2 h-9 px-2 rounded-md border border-[#E5E7EB] text-[12px]" />
              <div className="col-span-2 flex items-center justify-between gap-2 h-9 px-2 rounded-md border border-[#E5E7EB]">
                <span className="text-[12px] text-[#6B7280]">Covers</span>
                <div className="inline-flex items-center gap-2">
                  <button onClick={() => setCovers((n) => Math.max(1, n - 1))} className="size-6 rounded border border-[#E5E7EB] inline-flex items-center justify-center"><Minus className="size-3" /></button>
                  <span className="w-5 text-center text-[13px] font-semibold">{covers}</span>
                  <button onClick={() => setCovers((n) => n + 1)} className="size-6 rounded border border-[#E5E7EB] inline-flex items-center justify-center"><Plus className="size-3" /></button>
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 pt-1">
              {payMethods.map((m) => (
                <button key={m.key} onClick={() => setPay(m.key)}
                  className={`flex-1 h-9 rounded-md text-[12px] font-semibold border ${pay === m.key ? "bg-[#0D9488] text-white border-[#0D9488]" : "bg-white text-[#374151] border-[#E5E7EB]"}`}>{m.label}</button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 h-10 rounded-lg border bg-white text-[13px] font-semibold">Cancel</button>
              <button disabled={saving} onClick={save} className="flex-1 h-10 rounded-lg bg-[#0D9488] hover:bg-[#0B7F75] text-white text-[13px] font-semibold disabled:opacity-50">Save Changes</button>
            </div>
          </div>
        </aside>
      </div>
    </ModalShell>
  );
}