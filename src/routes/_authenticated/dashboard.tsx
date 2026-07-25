import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { formatINR } from "@/lib/format";
import {
  BarChart3, Users, UtensilsCrossed, Package, Settings as SettingsIcon, LineChart as LineIcon,
  Grid3x3, IndianRupee, ShoppingCart, TrendingUp, RefreshCcw, Calendar, ShoppingBag,
  Sparkles, Trophy, ArrowUp, ArrowDown, Minus, X, AlertTriangle, PlusCircle, FileText,
  ChevronDown, ChevronUp, ArrowLeft, Download,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Fudiyo" }] }),
});

type Tab = "overview" | "staff" | "menu" | "inventory" | "setup" | "reports";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "staff", label: "Staff", icon: Users },
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "setup", label: "Setup", icon: SettingsIcon },
  { id: "reports", label: "Reports", icon: LineIcon },
];

type RangeKey = "today" | "7" | "30" | "90" | "custom";
type DateRange = { key: RangeKey; from: Date; to: Date; label: string };

function rangeFor(key: Exclude<RangeKey, "custom">): DateRange {
  const to = new Date(); to.setHours(23, 59, 59, 999);
  const from = new Date(); from.setHours(0, 0, 0, 0);
  if (key === "7") from.setDate(from.getDate() - 6);
  if (key === "30") from.setDate(from.getDate() - 29);
  if (key === "90") from.setDate(from.getDate() - 89);
  return { key, from, to, label: key === "today" ? "Today" : `${key} Days` };
}

function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<DateRange>(rangeFor("today"));
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <main className="p-6 max-w-[1500px] mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Today's Overview</h1>
          <p className="text-[15px] text-[#64748B] mt-1">How your business is doing today</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <DateRangeButton value={range} onChange={setRange} />
          <Link to="/orders" className="h-12 px-5 inline-flex items-center gap-2 rounded-[10px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[15px] font-semibold">
            <ShoppingCart className="size-5" /> Start Taking Orders
          </Link>
          <button
            onClick={() => setAiOpen((v) => !v)}
            title="AI Insights"
            aria-label="AI Insights"
            className="size-12 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white flex items-center justify-center"
          >
            <Sparkles className="size-5" />
          </button>
          <button onClick={() => location.reload()} className="size-12 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center text-[#6B7280]">
            <RefreshCcw className="size-5" />
          </button>
        </div>
      </header>

      <AIInsightsPanel open={aiOpen} onClose={() => setAiOpen(false)} range={range} />

      <OnboardingBanner />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 h-12 rounded-full text-[15px] font-semibold whitespace-nowrap transition-colors ${
                active ? "bg-[#DC2626] text-white" : "text-[#64748B] hover:bg-[#F1F5F9]"
              }`}
            >
              <Icon className="size-5" /> {label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <Overview range={range} />}
      {tab === "staff" && <StaffTab />}
      {tab === "menu" && <MenuTab />}
      {tab === "inventory" && <InventoryTab />}
      {tab === "setup" && <SetupGrid />}
      {tab === "reports" && <ReportsTab />}
    </main>
  );
}

/* ============== Date range button ============== */

function DateRangeButton({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [from, setFrom] = useState(toInputDate(value.from));
  const [to, setTo] = useState(toInputDate(value.to));

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (k: Exclude<RangeKey, "custom">) => { onChange(rangeFor(k)); setOpen(false); };

  const applyCustom = () => {
    const f = new Date(from); f.setHours(0, 0, 0, 0);
    const t = new Date(to); t.setHours(23, 59, 59, 999);
    if (isNaN(f.getTime()) || isNaN(t.getTime()) || f > t) return;
    onChange({ key: "custom", from: f, to: t, label: `${from} → ${to}` });
    setOpen(false);
  };

  const pills: { k: Exclude<RangeKey, "custom">; label: string }[] = [
    { k: "today", label: "Today" }, { k: "7", label: "7 Days" },
    { k: "30", label: "30 Days" }, { k: "90", label: "90 Days" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-12 px-4 inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white text-[15px] font-medium text-[#374151]"
      >
        <Calendar className="size-4" /> {value.label}
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[340px] bg-white rounded-xl shadow-lg border border-[#E2E8F0] z-50 p-4">
          <div className="text-[14px] font-bold text-[#111827]">Select Time Period</div>
          <div className="text-[12px] text-[#64748B] mb-3">Choose a date range for your data</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {pills.map((p) => {
              const active = value.key === p.k;
              return (
                <button
                  key={p.k}
                  onClick={() => pick(p.k)}
                  className={`h-12 inline-flex items-center justify-center gap-2 rounded-xl border text-[14px] font-semibold ${active ? "border-[#0D9488] bg-[#0D9488] text-white" : "border-[#E2E8F0] bg-white text-[#374151] hover:bg-[#F8FAFC]"}`}
                >
                  <Calendar className="size-4" /> {p.label}
                </button>
              );
            })}
          </div>
          <div className="text-[12px] font-semibold uppercase text-[#94A3B8] mb-2">Custom Range</div>
          <div className="flex items-center gap-2 mb-3">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 h-10 rounded-md border border-[#E2E8F0] px-2 text-[14px]" />
            <span className="text-[#94A3B8]">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 h-10 rounded-md border border-[#E2E8F0] px-2 text-[14px]" />
          </div>
          <button onClick={applyCustom} className="w-full h-11 rounded-md bg-[#0D9488] hover:bg-[#0F766E] text-white text-[14px] font-semibold">Apply Custom Range</button>
        </div>
      )}
    </div>
  );
}

function toInputDate(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ============== Overview ============== */

type OrderRow = { total: number | string; items: unknown; created_at: string; status: string; order_type?: string | null };
type Granularity = "hourly" | "daily" | "weekly";

function Overview({ range }: { range: DateRange }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [prevOrders, setPrevOrders] = useState<OrderRow[]>([]);
  const [weeklyOrders, setWeeklyOrders] = useState<OrderRow[]>([]);
  const [tables, setTables] = useState<{ status: string }[]>([]);
  const [dishes, setDishes] = useState<{ id: string; is_available: boolean }[]>([]);
  const [gran, setGran] = useState<Granularity>("hourly");

  useEffect(() => {
    const load = async () => {
      const spanMs = range.to.getTime() - range.from.getTime();
      const prevTo = new Date(range.from.getTime() - 1);
      const prevFrom = new Date(range.from.getTime() - spanMs - 1);
      const start4w = new Date(); start4w.setHours(0, 0, 0, 0); start4w.setDate(start4w.getDate() - 28);

      const [{ data: t }, { data: d }, { data: cur }, { data: prev }, { data: w }] = await Promise.all([
        supabase.from("tables").select("status"),
        supabase.from("dishes").select("id,is_available"),
        supabase.from("orders").select("total,items,created_at,status,order_type").gte("created_at", range.from.toISOString()).lte("created_at", range.to.toISOString()),
        supabase.from("orders").select("total,items,created_at,status,order_type").gte("created_at", prevFrom.toISOString()).lte("created_at", prevTo.toISOString()),
        supabase.from("orders").select("total,items,created_at,status,order_type").gte("created_at", start4w.toISOString()),
      ]);
      setTables(t ?? []);
      setDishes(d ?? []);
      setOrders((cur ?? []) as OrderRow[]);
      setPrevOrders((prev ?? []) as OrderRow[]);
      setWeeklyOrders((w ?? []) as OrderRow[]);
    };
    void load();
  }, [range]);

  const occupied = tables.filter((t) => t.status === "occupied").length;
  const totalTables = tables.length;
  const available = totalTables - occupied;

  const sum = (rows: OrderRow[]) => rows.reduce((s, o) => s + Number(o.total || 0), 0);
  const revenue = sum(orders);
  const prevRevenue = sum(prevOrders);
  const ordersN = orders.length;
  const prevOrdersN = prevOrders.length;
  const avg = ordersN ? revenue / ordersN : 0;
  const prevAvg = prevOrdersN ? prevRevenue / prevOrdersN : 0;

  const chartData = useMemo(() => {
    if (gran === "hourly") {
      const b: Record<number, { revenue: number; orders: number }> = {};
      for (let h = 6; h <= 23; h++) b[h] = { revenue: 0, orders: 0 };
      for (const o of orders) {
        const h = new Date(o.created_at).getHours();
        if (b[h]) { b[h].revenue += Number(o.total || 0); b[h].orders += 1; }
      }
      return Object.entries(b).map(([h, v]) => ({ label: `${h}:00`, ...v }));
    }
    if (gran === "daily") {
      const days: { key: string; label: string; revenue: number; orders: number }[] = [];
      const today = new Date(); today.setHours(0, 0, 0, 0);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-IN", { weekday: "short" }), revenue: 0, orders: 0 });
      }
      const idx = new Map(days.map((d, i) => [d.key, i]));
      for (const o of weeklyOrders) {
        const k = new Date(o.created_at).toISOString().slice(0, 10);
        const i = idx.get(k);
        if (i !== undefined) { days[i].revenue += Number(o.total || 0); days[i].orders += 1; }
      }
      return days.map(({ label, revenue, orders }) => ({ label, revenue, orders }));
    }
    const weeks: { start: Date; label: string; revenue: number; orders: number }[] = [];
    const todayW = new Date(); todayW.setHours(0, 0, 0, 0);
    for (let i = 3; i >= 0; i--) {
      const start = new Date(todayW); start.setDate(start.getDate() - i * 7 - 6);
      weeks.push({ start, label: `W-${i === 0 ? "now" : i}`, revenue: 0, orders: 0 });
    }
    for (const o of weeklyOrders) {
      const d = new Date(o.created_at);
      for (let i = weeks.length - 1; i >= 0; i--) {
        if (d >= weeks[i].start) { weeks[i].revenue += Number(o.total || 0); weeks[i].orders += 1; break; }
      }
    }
    return weeks.map(({ label, revenue, orders }) => ({ label, revenue, orders }));
  }, [gran, orders, weeklyOrders]);

  const topDishes = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number }> = {};
    for (const o of orders) {
      const items = (o.items as { name: string; qty: number; price: number }[]) || [];
      for (const it of items) {
        if (!counts[it.name]) counts[it.name] = { count: 0, revenue: 0 };
        counts[it.name].count += it.qty || 1;
        counts[it.name].revenue += (it.price || 0) * (it.qty || 1);
      }
    }
    return Object.entries(counts).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [orders]);

  const orderTypeCounts = useMemo(() => {
    const m = { "Dine-In": 0, "Takeaway": 0, "Delivery": 0 } as Record<string, number>;
    for (const o of orders) {
      const t = (o.order_type || "Dine-In") as string;
      const key = /takeaway/i.test(t) ? "Takeaway" : /deliver/i.test(t) ? "Delivery" : "Dine-In";
      m[key] += 1;
    }
    return m;
  }, [orders]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        <StatCard icon={<Grid3x3 className="size-6 text-white" />} tone="#7C3AED" value={`${occupied}/${totalTables}`} label="Occupied tables"
          sublabel={totalTables > 0 ? <span className="text-[#16A34A] text-[13px] font-medium">{available} available</span> : undefined} />
        <StatCard icon={<IndianRupee className="size-6 text-white" />} tone="#16A34A" value={formatINR(revenue)} label="Revenue" compare={pct(revenue, prevRevenue)} />
        <StatCard icon={<ShoppingBag className="size-6 text-white" />} tone="#2563EB" value={String(ordersN)} label="Total orders" compare={pct(ordersN, prevOrdersN)} />
        <StatCard icon={<TrendingUp className="size-6 text-white" />} tone="#D97706" value={formatINR(avg)} label="Avg order value" compare={pct(avg, prevAvg)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Revenue Trend" subtitle={subtitleFor(gran)} badge={`₹${indianComma(revenue)}.00`} badgeTone="green" gran={gran} setGran={setGran}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" fontSize={10} stroke="#94A3B8" tickLine={false} axisLine={false} />
              <YAxis fontSize={10} stroke="#94A3B8" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${indianComma(v)}`} />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="revenue" fill="#0D9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Orders Trend" subtitle={subtitleFor(gran)} badge={`${ordersN} orders`} badgeTone="blue" gran={gran} setGran={setGran}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" fontSize={10} stroke="#94A3B8" tickLine={false} axisLine={false} />
              <YAxis fontSize={10} stroke="#94A3B8" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHead title="Location Performance" subtitle="Period performance" right={<Pill tone="gray">1 location</Pill>} />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-[#DC2626]/10 flex items-center justify-center shrink-0">
              <Trophy className="size-6 text-[#DC2626]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[15px] font-semibold text-[#111827] truncate">My Restaurant</div>
                <div className="text-[13px] font-semibold text-[#64748B]">{revenue > 0 ? "100%" : "0%"}</div>
              </div>
              <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: revenue > 0 ? "100%" : "0%", background: "linear-gradient(90deg,#DC2626,#EA580C)" }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[16px] font-bold text-[#16A34A]">₹{indianComma(revenue)}.00</div>
              <div className="text-[12px] text-[#64748B]">Revenue</div>
              <div className="text-[16px] font-bold text-[#2563EB] mt-1">{ordersN}</div>
              <div className="text-[12px] text-[#64748B]">orders</div>
            </div>
          </div>
        </Card>
        <OrderTypesCard counts={orderTypeCounts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHead title="Top Sellers" subtitle="Best performers in range" />
          {topDishes.length === 0 ? (
            <div className="text-center py-10">
              <UtensilsCrossed className="size-12 mx-auto text-[#CBD5E1] mb-3" />
              <div className="text-[14px] text-[#64748B] font-medium">No orders yet</div>
            </div>
          ) : (
            <ul className="space-y-2">
              {topDishes.map((d, i) => (
                <li key={d.name} className="flex items-center gap-3 py-2">
                  <span className="size-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                    style={{ background: ["#DC2626", "#EA580C", "#D97706", "#9CA3AF", "#9CA3AF"][i] }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-[#111827] truncate">{d.name}</div>
                    <div className="text-[13px] text-[#94A3B8]">{d.count} sold</div>
                  </div>
                  <div className="text-[15px] font-bold text-[#16A34A]">{formatINR(d.revenue)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <LiveFeed available={available} totalTables={totalTables}
          dishesAvail={dishes.filter((x) => x.is_available).length} dishesTotal={dishes.length} occupied={occupied} />
      </div>
    </>
  );
}

/* ============== AI Insights slide-down ============== */

function AIInsightsPanel({ open, onClose, range }: { open: boolean; onClose: () => void; range: DateRange }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  useEffect(() => {
    if (!open) return;
    void supabase.from("orders").select("total,items,created_at,status,order_type")
      .gte("created_at", range.from.toISOString()).lte("created_at", range.to.toISOString())
      .then(({ data }) => setOrders((data ?? []) as OrderRow[]));
  }, [open, range]);

  const top = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of orders) for (const it of ((o.items as { name: string; qty: number }[]) || [])) c[it.name] = (c[it.name] || 0) + (it.qty || 1);
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [orders]);
  const peak = useMemo(() => {
    const b: Record<number, number> = {};
    for (const o of orders) { const h = new Date(o.created_at).getHours(); b[h] = (b[h] || 0) + 1; }
    const t = Object.entries(b).sort((a, b) => b[1] - a[1])[0]; if (!t) return null;
    const h = Number(t[0]); const ap = h >= 12 ? "PM" : "AM"; return `${(h % 12) || 12} ${ap}`;
  }, [orders]);
  const avg = useMemo(() => { const t = orders.reduce((s, o) => s + Number(o.total || 0), 0); return orders.length ? t / orders.length : 0; }, [orders]);

  if (!open) return null;
  const chips: string[] = [];
  if (orders.length) {
    if (top) chips.push(`🔥 ${top} is your best seller`);
    if (peak) chips.push(`⏰ Peak hour was ${peak}`);
    if (avg) chips.push(`💰 Avg order ${formatINR(avg)}`);
    chips.push(`📊 ${orders.length} order${orders.length === 1 ? "" : "s"} completed`);
  }
  return (
    <div className="bg-white border-b border-[#E2E8F0] shadow-md rounded-xl mb-5 p-5">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#7C3AED]" />
          <div>
            <div className="text-[16px] font-bold text-[#111827]">AI Insights</div>
            <div className="text-[12px] text-[#64748B]">Powered by Fudiyo AI</div>
          </div>
        </div>
        <button onClick={onClose} className="size-9 rounded-md hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#6B7280]" aria-label="Close insights">
          <X className="size-5" />
        </button>
      </div>
      {chips.length === 0 ? (
        <div className="text-center py-5 text-[#64748B] text-[14px] flex items-center justify-center gap-2">
          <Sparkles className="size-5 text-[#7C3AED]" /> Insights will appear once you start taking orders today
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {chips.map((c, i) => (
            <span key={i} className="shrink-0 rounded-full bg-white border border-[#DDD6FE] text-[#7C3AED] text-[13px] py-2 px-4">{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============== Tab content ============== */

function StaffTab() {
  const [profiles, setProfiles] = useState<{ id: string; name: string; is_active: boolean; created_at: string }[]>([]);
  const [roles, setRoles] = useState<{ user_id: string; role: string }[]>([]);
  const [attendance, setAttendance] = useState<{ staff_id: string; status: string }[]>([]);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    void Promise.all([
      supabase.from("profiles").select("id,name,is_active,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("attendance").select("staff_id,status").eq("date", today),
    ]).then(([{ data: p }, { data: r }, { data: a }]) => {
      setProfiles((p ?? []) as never);
      setRoles((r ?? []) as never);
      setAttendance((a ?? []) as never);
    });
  }, []);
  const total = profiles.length;
  const present = attendance.filter((a) => a.status === "present").length;
  const absent = attendance.filter((a) => a.status === "absent").length;
  const leave = attendance.filter((a) => a.status === "leave").length;
  const byRole = (r: string) => roles.filter((x) => x.role === r).length;
  const recent = profiles.slice(0, 3);
  const roleFor = (id: string) => roles.find((r) => r.user_id === id)?.role ?? "—";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={<Users className="size-5 text-white" />} tone="#0891B2" value={String(total)} label="Total Staff" />
        <MiniStat icon={<span className="text-white text-lg">✓</span>} tone="#16A34A" value={String(present)} label="Present Today" />
        <MiniStat icon={<span className="text-white text-lg">✗</span>} tone="#DC2626" value={String(absent)} label="Absent Today" />
        <MiniStat icon={<Calendar className="size-5 text-white" />} tone="#D97706" value={String(leave)} label="On Leave" />
      </div>
      <Card>
        <CardHead title="Role Breakdown" />
        <div className="flex flex-wrap gap-2">
          <RolePill label={`Waiters: ${byRole("waiter")}`} bg="#DBEAFE" fg="#2563EB" />
          <RolePill label={`Kitchen: ${byRole("kitchen")}`} bg="#FFEDD5" fg="#EA580C" />
          <RolePill label={`Accountants: ${byRole("accountant")}`} bg="#EDE9FE" fg="#7C3AED" />
          <RolePill label={`Managers: ${byRole("manager")}`} bg="#DCFCE7" fg="#16A34A" />
        </div>
      </Card>
      <Card>
        <CardHead title="Recently Added" />
        {recent.length === 0 ? <div className="text-[14px] text-[#64748B]">No staff yet.</div> : (
          <ul className="space-y-2">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <div className="size-10 rounded-full bg-[#0D9488] text-white font-semibold flex items-center justify-center">{p.name[0]?.toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-semibold truncate">{p.name}</div>
                  <span className="text-[11px] uppercase font-semibold text-[#64748B]">{roleFor(p.id)}</span>
                </div>
                <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${p.is_active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                  {p.is_active ? "Active" : "Inactive"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="text-right mt-3"><Link to="/staff" className="text-[13px] font-medium text-[#0D9488] hover:text-[#0F766E]">→ Open Staff Management</Link></div>
      </Card>
    </div>
  );
}

function MenuTab() {
  const [dishes, setDishes] = useState<{ id: string; name: string; category: string; price: number; is_available: boolean }[]>([]);
  useEffect(() => {
    void supabase.from("dishes").select("id,name,category,price,is_available").eq("is_archived", false)
      .then(({ data }) => setDishes((data ?? []) as never));
  }, []);
  const total = dishes.length;
  const avail = dishes.filter((d) => d.is_available).length;
  const unavail = total - avail;
  const cats = useMemo(() => {
    const m: Record<string, { total: number; avail: number }> = {};
    for (const d of dishes) { m[d.category] = m[d.category] || { total: 0, avail: 0 }; m[d.category].total++; if (d.is_available) m[d.category].avail++; }
    return Object.entries(m);
  }, [dishes]);
  const top = dishes.slice(0, 5);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <MiniStat icon={<UtensilsCrossed className="size-5 text-white" />} tone="#16A34A" value={String(total)} label="Total Dishes" />
        <MiniStat icon={<span className="text-white text-lg">✓</span>} tone="#16A34A" value={String(avail)} label="Available" />
        <MiniStat icon={<span className="text-white text-lg">✗</span>} tone="#DC2626" value={String(unavail)} label="Unavailable" />
      </div>
      <Card>
        <CardHead title="Categories" />
        {cats.length === 0 ? <div className="text-[14px] text-[#64748B]">No dishes yet.</div> : (
          <ul className="space-y-2">
            {cats.map(([name, v]) => (
              <li key={name} className="flex items-center gap-3 py-2">
                <div className="flex-1 text-[15px] font-medium">{name}</div>
                <div className="text-[13px] text-[#64748B] w-20">{v.total} items</div>
                <div className="w-32 h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div className="h-full bg-[#16A34A]" style={{ width: `${(v.avail / v.total) * 100}%` }} />
                </div>
                <div className="text-[13px] text-[#16A34A] w-24 text-right">{v.avail} available</div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <CardHead title="Top 5 Dishes" />
        {top.length === 0 ? <div className="text-[14px] text-[#64748B]">No dishes.</div> : (
          <ul className="space-y-2">
            {top.map((d, i) => (
              <li key={d.id} className="flex items-center gap-3 py-2 text-[15px]">
                <span className="w-6 text-[#94A3B8]">{i + 1}</span>
                <span className="flex-1 truncate">{d.name}</span>
                <span className="text-[#0D9488] font-semibold">{formatINR(d.price)}</span>
                <span className={`size-2.5 rounded-full ${d.is_available ? "bg-[#16A34A]" : "bg-[#DC2626]"}`} />
              </li>
            ))}
          </ul>
        )}
        <div className="text-right mt-3"><Link to="/menu" className="text-[13px] font-medium text-[#0D9488] hover:text-[#0F766E]">→ Open Menu Management</Link></div>
      </Card>
    </div>
  );
}

function InventoryTab() {
  const [items, setItems] = useState<{ id: string; name: string; quantity: number; unit_cost: number; low_stock_threshold: number; supplier: string | null }[]>([]);
  useEffect(() => {
    void supabase.from("inventory_items").select("id,name,quantity,unit_cost,low_stock_threshold,supplier")
      .then(({ data }) => setItems((data ?? []) as never));
  }, []);
  const total = items.length;
  const low = items.filter((i) => i.quantity <= i.low_stock_threshold);
  const totalVal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0);
  const suppliers = new Set(items.map((i) => i.supplier).filter(Boolean)).size;

  if (total === 0) {
    return (
      <Card>
        <div className="text-center py-10">
          <Package className="size-12 mx-auto text-[#CBD5E1] mb-3" />
          <div className="text-[15px] text-[#64748B] mb-3">No inventory items added yet</div>
          <Link to="/inventory" className="inline-flex h-11 px-4 items-center rounded-md bg-[#16A34A] hover:bg-[#15803D] text-white text-[14px] font-semibold">+ Add your first item</Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={<Package className="size-5 text-white" />} tone="#0D9488" value={String(total)} label="Total Items" />
        <MiniStat icon={<AlertTriangle className="size-5 text-white" />} tone="#DC2626" value={String(low.length)} label="Low Stock" />
        <MiniStat icon={<IndianRupee className="size-5 text-white" />} tone="#16A34A" value={formatINR(totalVal)} label="Total Value" />
        <MiniStat icon={<Users className="size-5 text-white" />} tone="#2563EB" value={String(suppliers)} label="Suppliers" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Link to="/inventory" className="h-12 rounded-md bg-[#16A34A] hover:bg-[#15803D] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2"><PlusCircle className="size-4" /> Add Item</Link>
        <Link to="/inventory" className="h-12 rounded-md bg-[#D97706] hover:bg-[#B45309] text-white text-[14px] font-semibold inline-flex items-center justify-center">Quick Stock</Link>
        <Link to="/inventory" className="h-12 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[14px] font-semibold inline-flex items-center justify-center">Log Waste</Link>
      </div>
      {low.length > 0 && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <div className="text-[14px] font-bold text-[#DC2626] mb-1">⚠ {low.length} items are running low</div>
          <div className="text-[13px] text-[#7F1D1D]">{low.map((i) => i.name).join(", ")}</div>
        </div>
      )}
      <div className="text-right"><Link to="/inventory" className="text-[13px] font-medium text-[#0D9488] hover:text-[#0F766E]">→ Open Full Inventory</Link></div>
    </div>
  );
}

function ReportsTab() {
  const [from, setFrom] = useState(toInputDate(new Date()));
  const [to, setTo] = useState(toInputDate(new Date()));
  const [selected, setSelected] = useState<string | null>(null);
  const cards = [
    "Sales Summary", "Inventory Comparison", "Consolidated P&L",
    "Menu Performance", "Item-wise Sales", "Outlet Ranking", "Staff Performance",
    "Category Sales", "Discounts & Offers", "Tax Summary",
    "Customer Insights", "Payment Analytics", "Order Analytics",
    "Revenue Trends", "Wallet & Loyalty",
  ];

  if (selected) {
    return <ReportDetail name={selected} from={from} to={to} setFrom={setFrom} setTo={setTo} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="text-[12px] text-[#64748B] mb-1">From</div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 rounded-md border border-[#E2E8F0] px-2 text-[15px]" />
          </div>
          <div>
            <div className="text-[12px] text-[#64748B] mb-1">To</div>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-11 rounded-md border border-[#E2E8F0] px-2 text-[15px]" />
          </div>
          <div className="text-[12px] text-[#94A3B8] ml-auto">Date range applies to all reports</div>
        </div>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <button key={c} onClick={() => setSelected(c)} className="text-left rounded-2xl bg-white border border-[#E2E8F0] p-5 hover:border-[#0D9488]/50 transition-colors flex items-start gap-3">
            <div className="size-10 rounded-lg bg-[#0D9488]/10 text-[#0D9488] inline-flex items-center justify-center"><FileText className="size-5" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-[#111827]">{c}</div>
              <div className="text-[12px] text-[#64748B] mt-0.5">Tap to open report</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const REPORT_STATS: Record<string, { label: string; tone: string }[]> = {
  "Sales Summary": [
    { label: "Total Revenue", tone: "#16A34A" }, { label: "Total Orders", tone: "#2563EB" },
    { label: "Avg Ticket Size", tone: "#7C3AED" }, { label: "Tips + Service", tone: "#F59E0B" },
  ],
  "Inventory Comparison": [
    { label: "Items in Stock", tone: "#0D9488" }, { label: "Low Stock Items", tone: "#DC2626" },
    { label: "Total Value", tone: "#16A34A" }, { label: "Categories", tone: "#2563EB" },
  ],
  "Consolidated P&L": [
    { label: "Total Revenue", tone: "#16A34A" }, { label: "Total Cost", tone: "#DC2626" },
    { label: "Gross Profit", tone: "#0D9488" }, { label: "Margin %", tone: "#F59E0B" },
  ],
  "Menu Performance": [
    { label: "Top Selling Item", tone: "#0D9488" }, { label: "Total Items Sold", tone: "#2563EB" },
    { label: "Avg Items/Order", tone: "#7C3AED" }, { label: "Items with 0 sales", tone: "#DC2626" },
  ],
  "Staff Performance": [
    { label: "Staff Name", tone: "#0D9488" }, { label: "Orders Handled", tone: "#2563EB" },
    { label: "Revenue Generated", tone: "#16A34A" }, { label: "Avg Order Value", tone: "#F59E0B" },
  ],
  "Discounts & Offers": [
    { label: "Total Discounts", tone: "#DC2626" }, { label: "Discounted Orders", tone: "#2563EB" },
    { label: "Avg Discount", tone: "#F59E0B" }, { label: "Top Offer", tone: "#0D9488" },
  ],
  "Tax Summary": [
    { label: "Total Tax", tone: "#16A34A" }, { label: "CGST", tone: "#2563EB" },
    { label: "SGST", tone: "#7C3AED" }, { label: "Orders with Tax", tone: "#0D9488" },
  ],
  "Customer Insights": [
    { label: "Total Customers", tone: "#0D9488" }, { label: "New Customers", tone: "#16A34A" },
    { label: "Returning", tone: "#2563EB" }, { label: "Avg Visits", tone: "#F59E0B" },
  ],
  "Payment Analytics": [
    { label: "Cash", tone: "#16A34A" }, { label: "Card", tone: "#2563EB" },
    { label: "UPI", tone: "#7C3AED" }, { label: "Other", tone: "#6B7280" },
  ],
  "Order Analytics": [
    { label: "Dine-in", tone: "#0D9488" }, { label: "Takeaway", tone: "#F59E0B" },
    { label: "Delivery", tone: "#2563EB" }, { label: "Total", tone: "#16A34A" },
  ],
  "Wallet & Loyalty": [
    { label: "Points Issued", tone: "#0D9488" }, { label: "Points Redeemed", tone: "#16A34A" },
    { label: "Active Members", tone: "#2563EB" }, { label: "Redemption Rate", tone: "#F59E0B" },
  ],
  "Category Sales": [
    { label: "Categories", tone: "#0D9488" }, { label: "Total Sales", tone: "#16A34A" },
  ],
  "Outlet Ranking": [
    { label: "Outlets", tone: "#0D9488" }, { label: "Total Revenue", tone: "#16A34A" },
  ],
  "Revenue Trends": [
    { label: "Peak Day", tone: "#0D9488" }, { label: "Total Revenue", tone: "#16A34A" },
  ],
};

function ReportDetail({ name, from, to, setFrom, setTo, onBack }: {
  name: string; from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void; onBack: () => void;
}) {
  const stats = REPORT_STATS[name] ?? [{ label: "Value", tone: "#0D9488" }];
  if (name === "Item-wise Sales") {
    return <ItemWiseSalesReport from={from} to={to} setFrom={setFrom} setTo={setTo} onBack={onBack} />;
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="h-9 px-3 inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB]">
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-lg bg-[#0D9488]/10 text-[#0D9488] inline-flex items-center justify-center"><FileText className="size-5" /></div>
          <h2 className="text-[20px] font-bold text-[#111827]">{name}</h2>
        </div>
        <div className="ml-auto flex items-end gap-2">
          <div>
            <div className="text-[11px] text-[#64748B] mb-1">From</div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-md border border-[#E2E8F0] px-2 text-[14px]" />
          </div>
          <div>
            <div className="text-[11px] text-[#64748B] mb-1">To</div>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-md border border-[#E2E8F0] px-2 text-[14px]" />
          </div>
          <button className="h-10 px-4 rounded-md bg-[#0D9488] text-white text-[13px] font-semibold">Apply</button>
          <button className="h-10 px-4 rounded-md bg-[#0D9488] text-white text-[13px] font-semibold inline-flex items-center gap-1"><Download className="size-4" /> Export</button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white border border-[#E2E8F0] p-5">
            <div className="text-[12px] font-semibold uppercase text-[#64748B] tracking-wide">{s.label}</div>
            <div className="text-[24px] font-bold mt-1" style={{ color: s.tone }}>—</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-10 text-center">
        <FileText className="size-10 mx-auto text-[#CBD5E1] mb-2" />
        <div className="text-[14px] text-[#64748B]">No data for selected period.</div>
      </div>
    </div>
  );
}

interface DishSalesRow { id: string; name: string; category: string | null; price: number; qty: number; revenue: number }

function ItemWiseSalesReport({ from, to, setFrom, setTo, onBack }: {
  from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void; onBack: () => void;
}) {
  const [rows, setRows] = useState<DishSalesRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const start = new Date(from + "T00:00:00").toISOString();
      const end = new Date(to + "T23:59:59").toISOString();
      const [{ data: dishes }, { data: orders }] = await Promise.all([
        supabase.from("dishes").select("id,name,category,price").eq("is_archived", false),
        supabase.from("orders").select("items,created_at,status").gte("created_at", start).lte("created_at", end),
      ]);
      if (!alive) return;
      const totals = new Map<string, { qty: number; revenue: number }>();
      for (const o of (orders ?? []) as { items: unknown; status: string }[]) {
        if (o.status === "cancelled") continue;
        const items = Array.isArray(o.items) ? o.items : [];
        for (const it of items as { dish_id?: string; name?: string; qty?: number; price?: number }[]) {
          const key = it.dish_id ?? it.name ?? "";
          if (!key) continue;
          const cur = totals.get(key) ?? { qty: 0, revenue: 0 };
          cur.qty += Number(it.qty ?? 0);
          cur.revenue += Number(it.qty ?? 0) * Number(it.price ?? 0);
          totals.set(key, cur);
        }
      }
      const result: DishSalesRow[] = ((dishes ?? []) as { id: string; name: string; category: string | null; price: number }[]).map((d) => {
        const t = totals.get(d.id) ?? totals.get(d.name) ?? { qty: 0, revenue: 0 };
        return { id: d.id, name: d.name, category: d.category, price: Number(d.price ?? 0), qty: t.qty, revenue: t.revenue };
      }).sort((a, b) => b.qty - a.qty);
      setRows(result);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [from, to]);

  const exportCsv = () => {
    const header = "Item,Category,Qty Sold,Unit Price,Total Revenue\n";
    const body = rows.map(r => `"${r.name}","${r.category ?? ""}",${r.qty},${r.price.toFixed(2)},${r.revenue.toFixed(2)}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `item-wise-sales-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="h-9 px-3 inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB]">
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <div className="size-10 rounded-lg bg-[#0D9488]/10 text-[#0D9488] inline-flex items-center justify-center"><FileText className="size-5" /></div>
          <h2 className="text-[20px] font-bold text-[#111827]">Item-wise Sales</h2>
        </div>
        <div className="ml-auto flex items-end gap-2">
          <div><div className="text-[11px] text-[#64748B] mb-1">From</div><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-md border border-[#E2E8F0] px-2 text-[14px]" /></div>
          <div><div className="text-[11px] text-[#64748B] mb-1">To</div><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-md border border-[#E2E8F0] px-2 text-[14px]" /></div>
          <button onClick={exportCsv} className="h-10 px-4 rounded-md bg-[#0D9488] text-white text-[13px] font-semibold inline-flex items-center gap-1"><Download className="size-4" /> Export</button>
        </div>
      </div>
      <div className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[14px] text-[#64748B]">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center"><FileText className="size-10 mx-auto text-[#CBD5E1] mb-2" /><div className="text-[14px] text-[#64748B]">No data for selected period.</div></div>
        ) : (
          <table className="w-full text-[14px]">
            <thead className="bg-[#F8FAFC]"><tr className="text-left text-[11px] uppercase text-[#64748B] tracking-wide">
              <th className="px-4 py-3">Item</th><th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Qty Sold</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
              <th className="px-4 py-3 text-right">Total Revenue</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[#F1F5F9]">
                  <td className="px-4 py-3 font-semibold text-[#111827]">{r.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.category ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.qty}</td>
                  <td className="px-4 py-3 text-right">{formatINR(r.price)}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#0D9488]">{formatINR(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SetupGrid() {
  const items = [
    { title: "General", desc: "Language, business type, order types", to: "/settings", search: { tab: "general" as const } },
    { title: "Tax & Billing", desc: "GST number, tax rate", to: "/settings", search: { tab: "tax" as const } },
    { title: "Print Settings", desc: "Paper size, printer type", to: "/settings", search: { tab: "print" as const } },
    { title: "Payment", desc: "UPI ID, accepted methods", to: "/settings", search: { tab: "payment" as const } },
    { title: "Staff Accounts", desc: "Add and manage staff", to: "/staff", search: { tab: "accounts" as const } },
    { title: "Customer App Feed", desc: "Toggle live data sharing", to: "/settings", search: { tab: "customer" as const } },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {items.map((it) => (
        <Link key={it.title} to={it.to} search={it.search as never} className="rounded-2xl border border-[#E2E8F0] bg-white p-5 hover:border-[#0D9488]/50 transition-colors flex items-center justify-between group shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div>
            <div className="text-[15px] font-semibold">{it.title}</div>
            <div className="text-[13px] text-[#64748B] mt-0.5">{it.desc}</div>
          </div>
          <span className="text-[#94A3B8] group-hover:text-[#0D9488]">→</span>
        </Link>
      ))}
    </div>
  );
}

/* ============== Shared bits ============== */

function MiniStat({ icon, tone, value, label }: { icon: React.ReactNode; tone: string; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white border border-[#E2E8F0] p-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="size-9 rounded-lg flex items-center justify-center" style={{ background: tone }}>{icon}</div>
        <div className="text-[22px] font-bold leading-none">{value}</div>
      </div>
      <div className="text-[13px] text-[#64748B]">{label}</div>
    </div>
  );
}

function RolePill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return <span className="text-[13px] font-semibold px-3 py-1.5 rounded-full" style={{ background: bg, color: fg }}>{label}</span>;
}

function StatCard({ icon, tone, value, label, sublabel, compare }: {
  icon: React.ReactNode; tone: string; value: string; label: string;
  sublabel?: React.ReactNode; compare?: { dir: "up" | "down" | "flat"; pct: number };
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
      <div className="flex items-center gap-4 mb-3">
        <div className="size-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: tone }}>{icon}</div>
        <div className="text-[32px] font-bold leading-none tracking-tight text-[#111827]">{value}</div>
      </div>
      <div className="text-[15px] text-[#64748B]">{label}</div>
      {sublabel && <div className="mt-1">{sublabel}</div>}
      {compare && <div className="mt-2"><CompareBadge dir={compare.dir} pct={compare.pct} /></div>}
    </div>
  );
}

function CompareBadge({ dir, pct }: { dir: "up" | "down" | "flat"; pct: number }) {
  if (dir === "flat") return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold bg-[#F1F5F9] text-[#64748B]">
      <Minus className="size-3" /> same as previous
    </span>
  );
  const up = dir === "up";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold"
      style={{ background: up ? "#DCFCE7" : "#FEE2E2", color: up ? "#16A34A" : "#DC2626" }}>
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />} {pct}% vs previous
    </span>
  );
}

function ChartCard({ title, subtitle, badge, badgeTone, gran, setGran, children }: {
  title: string; subtitle: string; badge: string; badgeTone: "green" | "blue";
  gran: Granularity; setGran: (g: Granularity) => void; children: React.ReactNode;
}) {
  const b = badgeTone === "green" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#DBEAFE] text-[#2563EB]";
  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h3 className="text-[18px] font-semibold text-[#111827]">{title}</h3>
          <p className="text-[12px] text-[#64748B]">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <GranToggle gran={gran} setGran={setGran} />
          <span className={`text-[14px] font-semibold px-2.5 py-1 rounded-full ${b}`}>{badge}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function GranToggle({ gran, setGran }: { gran: Granularity; setGran: (g: Granularity) => void }) {
  const items: Granularity[] = ["hourly", "daily", "weekly"];
  return (
    <div className="inline-flex bg-[#F1F5F9] rounded-full p-0.5">
      {items.map((g) => {
        const active = gran === g;
        return (
          <button key={g} onClick={() => setGran(g)}
            className={`px-3 h-8 rounded-full text-[12px] font-semibold capitalize transition-colors ${active ? "bg-[#0D9488] text-white" : "text-[#64748B] hover:text-[#111827]"}`}>
            {g}
          </button>
        );
      })}
    </div>
  );
}

function subtitleFor(g: Granularity) {
  return g === "hourly" ? "Hourly breakdown" : g === "daily" ? "Last 7 days" : "Last 4 weeks";
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">{children}</div>;
}

function CardHead({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-[18px] font-semibold text-[#111827]">{title}</h3>
        {subtitle && <p className="text-[12px] text-[#64748B]">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function Pill({ tone, children }: { tone: "gray" | "green"; children: React.ReactNode }) {
  const cls = tone === "gray" ? "bg-[#F1F5F9] text-[#64748B]" : "bg-[#DCFCE7] text-[#16A34A]";
  return <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${cls}`}>{children}</span>;
}

function OrderTypesCard({ counts }: { counts: Record<string, number> }) {
  const total = counts["Dine-In"] + counts["Takeaway"] + counts["Delivery"];
  const data = [
    { name: "Dine-In", value: counts["Dine-In"], color: "#DC2626" },
    { name: "Takeaway", value: counts["Takeaway"], color: "#D97706" },
    { name: "Delivery", value: counts["Delivery"], color: "#2563EB" },
  ];
  return (
    <Card>
      <CardHead title="Order Types" subtitle="Breakdown" />
      <div className="grid grid-cols-2 gap-4 items-center">
        <div className="relative" style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={total === 0 ? [{ name: "empty", value: 1, color: "#E2E8F0" }] : data}
                dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={total === 0 ? 0 : 2} stroke="none">
                {(total === 0 ? [{ color: "#E2E8F0" }] : data).map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {total === 0 ? <div className="text-[12px] text-[#94A3B8]">No orders yet</div> : (
              <><div className="text-[24px] font-bold text-[#111827] leading-none">{total}</div><div className="text-[11px] text-[#64748B] mt-1">orders</div></>
            )}
          </div>
        </div>
        <ul className="space-y-2">
          {data.map((d) => {
            const pct = total === 0 ? 0 : Math.round((d.value / total) * 100);
            return (
              <li key={d.name} className="flex items-center gap-2 text-[14px]">
                <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-[#374151] flex-1">{d.name}</span>
                <span className="font-semibold text-[#111827] tabular-nums">{d.value}</span>
                <span className="text-[#94A3B8] tabular-nums w-9 text-right">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

function LiveFeed({ available, totalTables, dishesAvail, dishesTotal, occupied }: { available: number; totalTables: number; dishesAvail: number; dishesTotal: number; occupied: number }) {
  const freePct = totalTables === 0 ? 0 : (available / totalTables) * 100;
  const freeTone = freePct > 50 ? "#16A34A" : freePct < 30 ? "#DC2626" : "#D97706";
  const wait = Math.max(5, occupied * 5);
  const waitTone = wait < 15 ? "#16A34A" : wait <= 30 ? "#D97706" : "#DC2626";
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[18px] font-semibold text-[#111827]">Live customer-app feed</h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#DCFCE7] text-[#16A34A] px-2 py-1 rounded-full">
          <span className="size-1.5 rounded-full bg-[#16A34A] animate-ping" />
          <span className="size-1.5 rounded-full bg-[#16A34A] -ml-3" /> LIVE
        </span>
      </div>
      <FeedRow label="Tables free" value={`${available} / ${totalTables}`} color={freeTone} />
      <FeedRow label="Est. wait" value={`${wait} mins`} color={waitTone} />
      <FeedRow label="Dishes available" value={`${dishesAvail} / ${dishesTotal}`} color="#16A34A" />
      <Link to="/settings" className="inline-block mt-3 text-[13px] font-medium text-[#0D9488] hover:text-[#0F766E]">
        View customer app settings →
      </Link>
    </Card>
  );
}

function FeedRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F1F5F9] last:border-0 text-[15px]">
      <span className="text-[#64748B]">{label}</span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

function pct(today: number, yest: number): { dir: "up" | "down" | "flat"; pct: number } {
  if (yest === 0 && today === 0) return { dir: "flat", pct: 0 };
  if (yest === 0) return { dir: "up", pct: 100 };
  const diff = ((today - yest) / yest) * 100;
  if (Math.abs(diff) < 0.5) return { dir: "flat", pct: 0 };
  return { dir: diff > 0 ? "up" : "down", pct: Math.abs(Math.round(diff)) };
}

function indianComma(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}