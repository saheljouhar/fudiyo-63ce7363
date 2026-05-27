import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { formatINR } from "@/lib/format";
import {
  BarChart3, Users, UtensilsCrossed, Package, Settings as SettingsIcon, LineChart as LineIcon,
  Grid3x3, IndianRupee, ShoppingCart, TrendingUp, RefreshCcw, Calendar, ShoppingBag,
  Sparkles, Trophy, ArrowUp, ArrowDown, Minus,
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

function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <main className="p-6 max-w-[1500px] mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Today's Overview</h1>
          <p className="text-sm text-[#64748B] mt-1">How your business is doing today</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="h-10 px-3 inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white text-sm font-medium text-[#374151]">
            <Calendar className="size-4" /> Today
          </button>
          <Link to="/orders" className="h-10 px-5 inline-flex items-center gap-2 rounded-[10px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold">
            <ShoppingCart className="size-4" /> Start Taking Orders
          </Link>
          <button onClick={() => location.reload()} className="size-10 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center text-[#6B7280]">
            <RefreshCcw className="size-4" />
          </button>
        </div>
      </header>

      <OnboardingBanner />

      {/* Tabs — solid red pill active */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 h-10 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                active
                  ? "bg-[#DC2626] text-white"
                  : "text-[#64748B] hover:bg-[#F1F5F9]"
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <Overview />}
      {tab === "staff" && <TabPlaceholder title="Staff" hint="Manage accounts & attendance" link="/staff" />}
      {tab === "menu" && <TabPlaceholder title="Menu" hint="Manage dishes & categories" link="/menu" />}
      {tab === "inventory" && <TabPlaceholder title="Inventory" hint="Track items, stock and waste" link="/inventory" />}
      {tab === "setup" && <SetupGrid />}
      {tab === "reports" && <TabPlaceholder title="Reports" hint="Sales, menu, staff analytics" link="/reports" />}
    </main>
  );
}

type OrderRow = { total: number | string; items: unknown; created_at: string; status: string; order_type?: string | null };

type Granularity = "hourly" | "daily" | "weekly";

function Overview() {
  const [todayOrders, setTodayOrders] = useState<OrderRow[]>([]);
  const [yesterdayOrders, setYesterdayOrders] = useState<OrderRow[]>([]);
  const [weeklyOrders, setWeeklyOrders] = useState<OrderRow[]>([]);
  const [tables, setTables] = useState<{ status: string }[]>([]);
  const [dishes, setDishes] = useState<{ id: string; is_available: boolean }[]>([]);
  const [gran, setGran] = useState<Granularity>("hourly");

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
      const startYesterday = new Date(startToday); startYesterday.setDate(startYesterday.getDate() - 1);
      const start4w = new Date(startToday); start4w.setDate(start4w.getDate() - 28);

      const [{ data: t }, { data: d }, { data: tOrders }, { data: yOrders }, { data: wOrders }] = await Promise.all([
        supabase.from("tables").select("status"),
        supabase.from("dishes").select("id,is_available"),
        supabase.from("orders").select("total,items,created_at,status,order_type").gte("created_at", startToday.toISOString()),
        supabase.from("orders").select("total,items,created_at,status,order_type").gte("created_at", startYesterday.toISOString()).lt("created_at", startToday.toISOString()),
        supabase.from("orders").select("total,items,created_at,status,order_type").gte("created_at", start4w.toISOString()),
      ]);
      setTables(t ?? []);
      setDishes(d ?? []);
      setTodayOrders((tOrders ?? []) as OrderRow[]);
      setYesterdayOrders((yOrders ?? []) as OrderRow[]);
      setWeeklyOrders((wOrders ?? []) as OrderRow[]);
    };
    void load();
  }, []);

  const occupied = tables.filter((t) => t.status === "occupied").length;
  const totalTables = tables.length;
  const available = totalTables - occupied;

  const sum = (rows: OrderRow[]) => rows.reduce((s, o) => s + Number(o.total || 0), 0);
  const revenueToday = sum(todayOrders);
  const revenueYesterday = sum(yesterdayOrders);
  const ordersTodayN = todayOrders.length;
  const ordersYestN = yesterdayOrders.length;
  const avgToday = ordersTodayN ? revenueToday / ordersTodayN : 0;
  const avgYest = ordersYestN ? revenueYesterday / ordersYestN : 0;

  // Chart data per granularity
  const chartData = useMemo(() => {
    if (gran === "hourly") {
      const b: Record<number, { revenue: number; orders: number }> = {};
      for (let h = 6; h <= 23; h++) b[h] = { revenue: 0, orders: 0 };
      for (const o of todayOrders) {
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
    // weekly: last 4 weeks
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
  }, [gran, todayOrders, weeklyOrders]);

  // Top sellers (today)
  const topDishes = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number }> = {};
    for (const o of todayOrders) {
      const items = (o.items as { name: string; qty: number; price: number }[]) || [];
      for (const it of items) {
        if (!counts[it.name]) counts[it.name] = { count: 0, revenue: 0 };
        counts[it.name].count += it.qty || 1;
        counts[it.name].revenue += (it.price || 0) * (it.qty || 1);
      }
    }
    return Object.entries(counts).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [todayOrders]);

  // Order types
  const orderTypeCounts = useMemo(() => {
    const m = { "Dine-In": 0, "Takeaway": 0, "Delivery": 0 } as Record<string, number>;
    for (const o of todayOrders) {
      const t = (o.order_type || "Dine-In") as string;
      const key = /takeaway/i.test(t) ? "Takeaway" : /deliver/i.test(t) ? "Delivery" : "Dine-In";
      m[key] += 1;
    }
    return m;
  }, [todayOrders]);

  // Peak hour
  const peakHour = useMemo(() => {
    const b: Record<number, number> = {};
    for (const o of todayOrders) {
      const h = new Date(o.created_at).getHours();
      b[h] = (b[h] || 0) + 1;
    }
    const top = Object.entries(b).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const h = Number(top[0]);
    const ampm = h >= 12 ? "PM" : "AM";
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh} ${ampm}`;
  }, [todayOrders]);

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        <StatCard
          icon={<Grid3x3 className="size-6 text-white" />} tone="#7C3AED"
          value={`${occupied}/${totalTables}`} label="Occupied tables"
          sublabel={totalTables > 0 ? <span className="text-[#16A34A] text-[12px] font-medium">{available} available</span> : undefined}
        />
        <StatCard
          icon={<IndianRupee className="size-6 text-white" />} tone="#16A34A"
          value={formatINR(revenueToday)} label="Revenue"
          compare={pct(revenueToday, revenueYesterday)}
        />
        <StatCard
          icon={<ShoppingBag className="size-6 text-white" />} tone="#2563EB"
          value={String(ordersTodayN)} label="Total orders"
          compare={pct(ordersTodayN, ordersYestN)}
        />
        <StatCard
          icon={<TrendingUp className="size-6 text-white" />} tone="#D97706"
          value={formatINR(avgToday)} label="Avg order value"
          compare={pct(avgToday, avgYest)}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Revenue Trend" subtitle={subtitleFor(gran)} badge={`₹ ${formatINR(revenueToday).replace("₹", "")}.00`} badgeTone="green" gran={gran} setGran={setGran}>
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
        <ChartCard title="Orders Trend" subtitle={subtitleFor(gran)} badge={`${ordersTodayN} orders`} badgeTone="blue" gran={gran} setGran={setGran}>
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

      {/* Rankings + Order types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHead title="Location Performance" subtitle="Today's performance" right={<Pill tone="gray">1 location</Pill>} />
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-[#DC2626]/10 flex items-center justify-center shrink-0">
              <Trophy className="size-6 text-[#DC2626]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[14px] font-semibold text-[#111827] truncate">My Restaurant</div>
                <div className="text-[12px] font-semibold text-[#64748B]">{revenueToday > 0 ? "100%" : "0%"}</div>
              </div>
              <div className="h-2 rounded-full bg-[#F1F5F9] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: revenueToday > 0 ? "100%" : "0%", background: "linear-gradient(90deg,#DC2626,#EA580C)" }} />
              </div>
              {revenueToday === 0 && <div className="text-[12px] text-[#94A3B8] mt-2">No orders yet today</div>}
            </div>
            <div className="text-right shrink-0">
              <div className="text-[16px] font-bold text-[#16A34A]">₹{formatINR(revenueToday).replace("₹", "")}.00</div>
              <div className="text-[11px] text-[#64748B]">Revenue</div>
              <div className="text-[16px] font-bold text-[#2563EB] mt-1">{ordersTodayN}</div>
              <div className="text-[11px] text-[#64748B]">orders</div>
            </div>
          </div>
        </Card>

        <OrderTypesCard counts={orderTypeCounts} />
      </div>

      {/* Top sellers + live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHead title="Top Sellers" subtitle="Today's best performers" />
          {topDishes.length === 0 ? (
            <div className="text-center py-10">
              <UtensilsCrossed className="size-12 mx-auto text-[#CBD5E1] mb-3" />
              <div className="text-[14px] text-[#64748B] font-medium">No orders yet today</div>
              <div className="text-[12px] text-[#94A3B8] mt-1">Start taking orders to see top sellers</div>
            </div>
          ) : (
            <ul className="space-y-2">
              {topDishes.map((d, i) => (
                <li key={d.name} className="flex items-center gap-3 py-2">
                  <span
                    className="size-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                    style={{ background: ["#DC2626", "#EA580C", "#D97706", "#9CA3AF", "#9CA3AF"][i] }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-[#111827] truncate">{d.name}</div>
                    <div className="text-[12px] text-[#94A3B8]">{d.count} sold</div>
                  </div>
                  <div className="text-[14px] font-bold text-[#16A34A]">{formatINR(d.revenue)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <LiveFeed
          available={available} totalTables={totalTables}
          dishesAvail={dishes.filter((x) => x.is_available).length} dishesTotal={dishes.length}
          occupied={occupied}
        />
      </div>

      {/* AI Insights */}
      <AIInsights
        topDish={topDishes[0]?.name ?? null}
        peakHour={peakHour}
        avg={avgToday}
        orders={ordersTodayN}
      />
    </>
  );
}

function StatCard({
  icon, tone, value, label, sublabel, compare,
}: {
  icon: React.ReactNode; tone: string; value: string; label: string;
  sublabel?: React.ReactNode; compare?: { dir: "up" | "down" | "flat"; pct: number };
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
      <div className="flex items-center gap-4 mb-3">
        <div className="size-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: tone }}>
          {icon}
        </div>
        <div className="text-[32px] font-bold leading-none tracking-tight text-[#111827]">{value}</div>
      </div>
      <div className="text-[14px] text-[#64748B]">{label}</div>
      {sublabel && <div className="mt-1">{sublabel}</div>}
      {compare && (
        <div className="mt-2">
          <CompareBadge dir={compare.dir} pct={compare.pct} />
        </div>
      )}
    </div>
  );
}

function CompareBadge({ dir, pct }: { dir: "up" | "down" | "flat"; pct: number }) {
  if (dir === "flat") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold bg-[#F1F5F9] text-[#64748B]">
        <Minus className="size-3" /> same as yesterday
      </span>
    );
  }
  const up = dir === "up";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold"
      style={{ background: up ? "#DCFCE7" : "#FEE2E2", color: up ? "#16A34A" : "#DC2626" }}
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {pct}% vs yesterday
    </span>
  );
}

function ChartCard({
  title, subtitle, badge, badgeTone, gran, setGran, children,
}: {
  title: string; subtitle: string; badge: string; badgeTone: "green" | "blue";
  gran: Granularity; setGran: (g: Granularity) => void; children: React.ReactNode;
}) {
  const b = badgeTone === "green" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#DBEAFE] text-[#2563EB]";
  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h3 className="text-[16px] font-semibold text-[#111827]">{title}</h3>
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
          <button
            key={g}
            onClick={() => setGran(g)}
            className={`px-3 h-7 rounded-full text-[11px] font-semibold capitalize transition-colors ${active ? "bg-[#0D9488] text-white" : "text-[#64748B] hover:text-[#111827]"}`}
          >
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
        <h3 className="text-[16px] font-semibold text-[#111827]">{title}</h3>
        {subtitle && <p className="text-[12px] text-[#64748B]">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function Pill({ tone, children }: { tone: "gray" | "green"; children: React.ReactNode }) {
  const cls = tone === "gray" ? "bg-[#F1F5F9] text-[#64748B]" : "bg-[#DCFCE7] text-[#16A34A]";
  return <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cls}`}>{children}</span>;
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
      <CardHead title="Order Types" subtitle="Today's breakdown" />
      <div className="grid grid-cols-2 gap-4 items-center">
        <div className="relative" style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={total === 0 ? [{ name: "empty", value: 1, color: "#E2E8F0" }] : data}
                dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={total === 0 ? 0 : 2}
                stroke="none"
              >
                {(total === 0 ? [{ color: "#E2E8F0" }] : data).map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {total === 0 ? (
              <div className="text-[12px] text-[#94A3B8]">No orders yet</div>
            ) : (
              <>
                <div className="text-[24px] font-bold text-[#111827] leading-none">{total}</div>
                <div className="text-[11px] text-[#64748B] mt-1">orders</div>
              </>
            )}
          </div>
        </div>
        <ul className="space-y-2">
          {data.map((d) => {
            const pct = total === 0 ? 0 : Math.round((d.value / total) * 100);
            return (
              <li key={d.name} className="flex items-center gap-2 text-[13px]">
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
        <h3 className="text-[16px] font-semibold text-[#111827]">Live customer-app feed</h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#DCFCE7] text-[#16A34A] px-2 py-1 rounded-full">
          <span className="size-1.5 rounded-full bg-[#16A34A] animate-ping" />
          <span className="size-1.5 rounded-full bg-[#16A34A] -ml-3" />
          LIVE
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
    <div className="flex items-center justify-between py-2.5 border-b border-[#F1F5F9] last:border-0 text-sm">
      <span className="text-[#64748B]">{label}</span>
      <span className="font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

function AIInsights({ topDish, peakHour, avg, orders }: { topDish: string | null; peakHour: string | null; avg: number; orders: number }) {
  const chips: string[] = [];
  if (orders > 0) {
    if (topDish) chips.push(`🔥 ${topDish} is your best seller today`);
    if (peakHour) chips.push(`⏰ Peak hour was ${peakHour}`);
    if (avg > 0) chips.push(`💰 Avg order ${formatINR(avg)}`);
    chips.push(`📊 ${orders} order${orders === 1 ? "" : "s"} completed today`);
  }
  return (
    <div className="rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#7C3AED]" />
          <div>
            <div className="text-[16px] font-semibold text-[#111827]">AI Insights</div>
            <div className="text-[12px] text-[#64748B]">Powered by Fudiyo AI</div>
          </div>
        </div>
        <div className="size-9 rounded-lg bg-[#7C3AED] flex items-center justify-center">
          <Sparkles className="size-4 text-white" />
        </div>
      </div>
      {chips.length === 0 ? (
        <div className="text-center py-6">
          <Sparkles className="size-10 mx-auto text-[#7C3AED] mb-2" />
          <div className="text-[14px] text-[#64748B]">Insights will appear once you start taking orders today</div>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {chips.map((c, i) => (
            <span key={i} className="shrink-0 rounded-full bg-white border border-[#DDD6FE] text-[#7C3AED] text-[13px] py-1.5 px-3.5">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TabPlaceholder({ title, hint, link }: { title: string; hint: string; link: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-[#64748B] mt-1 mb-4">{hint}</p>
      <Link to={link} className="inline-flex h-9 px-4 items-center rounded-md bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold">
        Open {title}
      </Link>
    </div>
  );
}

function SetupGrid() {
  const items = [
    ["General", "Language, business type, order types"],
    ["Tax & Billing", "GST number, tax rate"],
    ["Print Settings", "Paper size, printer type"],
    ["Payment", "UPI ID, accepted methods"],
    ["Staff Accounts", "Add and manage staff"],
    ["Customer App Feed", "Toggle live data sharing"],
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {items.map(([t, d]) => (
        <Link key={t} to="/settings" className="rounded-2xl border border-[#E2E8F0] bg-white p-5 hover:border-[#0D9488]/50 transition-colors flex items-center justify-between group shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div>
            <div className="text-sm font-semibold">{t}</div>
            <div className="text-xs text-[#64748B] mt-0.5">{d}</div>
          </div>
          <span className="text-[#94A3B8] group-hover:text-[#0D9488]">→</span>
        </Link>
      ))}
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
