import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import {
  Receipt, ChevronDown, ChevronUp, Printer, Eye, Pencil, RotateCcw, Pause,
  Calendar, ClipboardList, LayoutGrid, List, BarChart3, Search, Copy, Check,
  FileSpreadsheet, ArrowUpDown, Plus, X, Minus, Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  validateSearch: (s: Record<string, unknown>) => ({ table: (s.table as string) ?? undefined }),
  component: HistoryPage,
  head: () => ({ meta: [{ title: "Orders — Fudiyo" }] }),
});

type Tab = "orders" | "scheduled" | "summary" | "bookings";
type Status = "pending" | "cooking" | "ready" | "billed" | "cleared" | "voided";
type ViewMode = "list" | "grid";
type Range = "today" | "yesterday" | "7d" | "30d";

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
  note: string | null;
}

function HistoryPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const [view, setView] = useState<ViewMode>("list");
  const [orders, setOrders] = useState<OrderRow[]>([]);

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

      {tab === "orders" && <OrdersTab orders={orders} view={view} />}
      {tab === "scheduled" && <ScheduledTab />}
      {tab === "summary" && <SummaryTab orders={orders} />}
      {tab === "bookings" && <BookingsEmbed />}
    </main>
  );
}

/* ---------------- Orders Tab ---------------- */

function OrdersTab({ orders, view }: { orders: OrderRow[]; view: ViewMode }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [range, setRange] = useState<Range>("today");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<{ kind: ActionKind; order: OrderRow } | null>(null);
  const onAction = (kind: ActionKind, order: OrderRow) => setActive({ kind, order });

  const filtered = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const cutoff = range === "today" ? startOfToday
      : range === "yesterday" ? startOfToday - 86400000
      : range === "7d" ? now - 7 * 86400000 : now - 30 * 86400000;
    const top = range === "yesterday" ? startOfToday : Infinity;
    return orders.filter((o) => {
      const ts = new Date(o.created_at).getTime();
      if (ts < cutoff || ts >= top) return false;
      if (status !== "all" && o.status !== status) return false;
      if (type !== "all" && o.order_type !== type) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!o.id.toLowerCase().includes(s) && !(o.waiter_name ?? "").toLowerCase().includes(s) && !(o.note ?? "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [orders, search, status, type, range]);

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
          <button key={r} onClick={() => setRange(r)} className={`h-9 px-3 rounded-lg text-[12px] font-semibold capitalize ${range === r ? "bg-[#0D9488] text-white" : "border border-[#E5E7EB] bg-white text-[#6B7280]"}`}>
            {r === "today" ? "Today" : r === "yesterday" ? "Yesterday" : r.toUpperCase()}
          </button>
        ))}
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
            <OrderCard key={o.id} o={o} idx={idx + 1} expanded={open.has(o.id)} onToggle={() => setOpen((s) => { const n = new Set(s); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; })} onAction={onAction} />
          ))}
        </div>
      ) : (
        <GridView orders={filtered} open={open} setOpen={setOpen} onAction={onAction} />
      )}

      {active?.kind === "view" && <ViewModal order={active.order} onClose={() => setActive(null)} />}
      {active?.kind === "refund" && <RefundModal order={active.order} onClose={() => setActive(null)} />}
      {active?.kind === "edit-details" && <EditDetailsModal order={active.order} onClose={() => setActive(null)} />}
      {active?.kind === "edit-items" && <EditItemsModal order={active.order} onClose={() => setActive(null)} />}
    </>
  );
}

type ActionKind = "view" | "print-bill" | "print-kot" | "refund" | "edit-details" | "edit-items";

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

function OrderCard({ o, idx, expanded, onToggle, onAction }: { o: OrderRow; idx: number; expanded: boolean; onToggle: () => void; onAction: (k: ActionKind, o: OrderRow) => void }) {
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
            <li key={k} className="flex justify-between text-[#374151]"><span>{it.qty}× {it.name}</span><span>{formatINR((it.price ?? 0) * it.qty)}</span></li>
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
                      {o.items.map((it, k) => <li key={k} className="flex justify-between"><span>{it.qty}× {it.name}</span><span>{formatINR((it.price ?? 0) * it.qty)}</span></li>)}
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