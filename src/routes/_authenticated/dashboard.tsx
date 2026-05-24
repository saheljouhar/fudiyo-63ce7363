import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { StatTileCard } from "@/components/StatTileCard";
import { formatINR } from "@/lib/format";
import {
  BarChart3, Users, UtensilsCrossed, Package, Settings as SettingsIcon, LineChart as LineIcon,
  Grid3x3, IndianRupee, ShoppingCart, TrendingUp, RefreshCcw, Calendar,
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — ORBIS" }] }),
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
      <PageHeader
        title="Today's Overview"
        subtitle="How your business is doing today"
        actions={
          <>
            <button className="h-9 px-3 inline-flex items-center gap-2 rounded-md border border-border bg-card text-sm">
              <Calendar className="size-4" /> Today
            </button>
            <Link to="/orders" className="h-9 px-4 inline-flex items-center rounded-md bg-cta text-cta-foreground text-sm font-semibold hover:bg-cta-hover">
              Start Taking Orders
            </Link>
            <button onClick={() => location.reload()} className="size-9 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground">
              <RefreshCcw className="size-4" />
            </button>
          </>
        }
      />

      <OnboardingBanner />

      <div className="border-b border-border mb-6 flex gap-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
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
      {tab === "inventory" && <InventoryStub />}
      {tab === "setup" && <SetupGrid />}
      {tab === "reports" && <TabPlaceholder title="Reports" hint="Sales, menu, staff analytics" link="/reports" />}
    </main>
  );
}

function Overview() {
  const [stats, setStats] = useState({ occupied: 0, totalTables: 0, revenue: 0, orders: 0, dishesAvail: 0, dishesTotal: 0 });
  const [hourly, setHourly] = useState<{ hour: string; revenue: number; orders: number }[]>([]);
  const [topDishes, setTopDishes] = useState<{ name: string; count: number; revenue: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const [{ data: tables }, { data: orders }, { data: dishes }] = await Promise.all([
        supabase.from("tables").select("status"),
        supabase.from("orders").select("total,items,created_at,status").gte("created_at", start.toISOString()),
        supabase.from("dishes").select("id,is_available"),
      ]);
      const occupied = tables?.filter((t) => t.status === "occupied").length ?? 0;
      const totalTables = tables?.length ?? 0;
      const revenue = orders?.reduce((s, o) => s + Number(o.total || 0), 0) ?? 0;

      const buckets: Record<number, { revenue: number; orders: number }> = {};
      for (let h = 6; h <= 23; h++) buckets[h] = { revenue: 0, orders: 0 };
      for (const o of orders ?? []) {
        const h = new Date(o.created_at).getHours();
        if (buckets[h]) {
          buckets[h].revenue += Number(o.total || 0);
          buckets[h].orders += 1;
        }
      }
      setHourly(Object.entries(buckets).map(([h, v]) => ({ hour: `${h}:00`, ...v })));

      // top dishes from items jsonb
      const counts: Record<string, { count: number; revenue: number }> = {};
      for (const o of orders ?? []) {
        const items = (o.items as unknown as { name: string; qty: number; price: number }[]) || [];
        for (const it of items) {
          if (!counts[it.name]) counts[it.name] = { count: 0, revenue: 0 };
          counts[it.name].count += it.qty || 1;
          counts[it.name].revenue += (it.price || 0) * (it.qty || 1);
        }
      }
      setTopDishes(
        Object.entries(counts).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count).slice(0, 5)
      );

      setStats({
        occupied,
        totalTables,
        revenue,
        orders: orders?.length ?? 0,
        dishesAvail: dishes?.filter((d) => d.is_available).length ?? 0,
        dishesTotal: dishes?.length ?? 0,
      });
    };
    void load();
  }, []);

  const avg = stats.orders ? Math.round(stats.revenue / stats.orders) : 0;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTileCard icon={Grid3x3} tone="purple" value={`${stats.occupied}/${stats.totalTables}`} label="Occupied tables" />
        <StatTileCard icon={IndianRupee} tone="green" value={formatINR(stats.revenue)} label="Revenue" sublabel={`incl. tax ${formatINR(stats.revenue * 1.05)}`} />
        <StatTileCard icon={ShoppingCart} tone="blue" value={String(stats.orders)} label="Total orders" />
        <StatTileCard icon={TrendingUp} tone="amber" value={formatINR(avg)} label="Avg order value" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Revenue Trend" subtitle="Hourly breakdown" badge={formatINR(stats.revenue)} badgeTone="green">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourly}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hour" fontSize={10} stroke="#94a3b8" />
              <YAxis fontSize={10} stroke="#94a3b8" />
              <Tooltip formatter={(v: number) => formatINR(v)} />
              <Bar dataKey="revenue" fill="#0D9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Orders Trend" subtitle="Hourly breakdown" badge={`${stats.orders} orders`} badgeTone="blue">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourly}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hour" fontSize={10} stroke="#94a3b8" />
              <YAxis fontSize={10} stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-card border border-border shadow-card p-5">
          <h3 className="text-base font-semibold mb-3">Top dishes today</h3>
          {topDishes.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <UtensilsCrossed className="size-8 mx-auto mb-2 opacity-40" />
              No orders yet today — start taking orders to see top dishes
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr><th className="text-left py-1">#</th><th className="text-left">Dish</th><th className="text-right">Qty</th><th className="text-right">Revenue</th></tr>
              </thead>
              <tbody>
                {topDishes.map((d, i) => (
                  <tr key={d.name} className="border-t border-border">
                    <td className="py-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 font-medium">{d.name}</td>
                    <td className="py-2 text-right">{d.count}</td>
                    <td className="py-2 text-right">{formatINR(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="rounded-xl bg-card border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Live customer-app feed</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-success/15 text-success px-2 py-0.5 rounded-full">LIVE</span>
          </div>
          <Row label="Tables free" value={`${stats.totalTables - stats.occupied} / ${stats.totalTables}`} tone={stats.occupied < stats.totalTables / 2 ? "green" : "amber"} />
          <Row label="Est. wait" value={`${Math.max(5, stats.occupied * 5)} mins`} tone={stats.occupied < 5 ? "green" : stats.occupied < 15 ? "amber" : "red"} />
          <Row label="Dishes available" value={`${stats.dishesAvail} / ${stats.dishesTotal}`} tone="green" />
        </div>
      </div>
    </>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "red" }) {
  const c = tone === "green" ? "text-[#16A34A]" : tone === "amber" ? "text-[#D97706]" : "text-[#DC2626]";
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${c}`}>{value}</span>
    </div>
  );
}

function ChartCard({ title, subtitle, badge, badgeTone, children }: { title: string; subtitle: string; badge: string; badgeTone: "green" | "blue"; children: React.ReactNode }) {
  const b = badgeTone === "green" ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#2563EB]/10 text-[#2563EB]";
  return (
    <div className="rounded-xl bg-card border border-border shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${b}`}>{badge}</span>
      </div>
      {children}
    </div>
  );
}

function TabPlaceholder({ title, hint, link }: { title: string; hint: string; link: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-10 text-center shadow-card">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{hint}</p>
      <Link to={link} className="inline-flex h-9 px-4 items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">
        Open {title}
      </Link>
    </div>
  );
}

function InventoryStub() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTileCard icon={Package} tone="cyan" value="0" label="Total Items" />
        <StatTileCard icon={Package} tone="red" value="0" label="Low Stock" />
        <StatTileCard icon={IndianRupee} tone="green" value="₹0" label="Total Value" />
        <StatTileCard icon={Users} tone="blue" value="0" label="Suppliers" />
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Inventory module ships next phase. Add items, track stock, and log waste in one place.
      </div>
    </>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(([t, d]) => (
        <Link key={t} to="/settings" className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors flex items-center justify-between group">
          <div>
            <div className="text-sm font-semibold">{t}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{d}</div>
          </div>
          <span className="text-muted-foreground group-hover:text-primary">→</span>
        </Link>
      ))}
    </div>
  );
}

// Avoid unused warning for toast import (kept for future)
void toast;