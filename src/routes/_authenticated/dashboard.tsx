import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatINR, formatDate } from "@/lib/format";
import { Grid3x3, IndianRupee, ShoppingCart, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — ORBIS" }] }),
});

function StatCard({ icon: Icon, label, value, tint }: { icon: typeof Grid3x3; label: string; value: string; tint: string }) {
  return (
    <div className="rounded-xl bg-card border border-border shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`size-9 rounded-lg flex items-center justify-center ${tint}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight text-foreground leading-none">{value}</div>
      <div className="text-xs text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

function Dashboard() {
  const { name } = useAuth();
  const [stats, setStats] = useState({ occupied: 0, total: 0, revenue: 0, orders: 0, avg: 0 });

  useEffect(() => {
    const load = async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [{ data: tables }, { data: orders }] = await Promise.all([
        supabase.from("tables").select("status"),
        supabase.from("orders").select("total,status,created_at").gte("created_at", today.toISOString()),
      ]);
      const occupied = tables?.filter(t => t.status === "occupied").length ?? 0;
      const total = tables?.length ?? 0;
      const revenue = orders?.reduce((s, o) => s + Number(o.total || 0), 0) ?? 0;
      const count = orders?.length ?? 0;
      setStats({ occupied, total, revenue, orders: count, avg: count ? Math.round(revenue / count) : 0 });
    };
    void load();
  }, []);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title={`${greet}, ${name || "there"}`}
        subtitle={formatDate(new Date())}
        actions={
          <a href="/orders" className="h-10 px-4 inline-flex items-center rounded-md bg-cta text-cta-foreground text-sm font-semibold hover:bg-cta-hover">
            Start Taking Orders
          </a>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Grid3x3} label="Occupied tables" value={`${stats.occupied}/${stats.total}`} tint="bg-primary/10 text-primary" />
        <StatCard icon={IndianRupee} label="Today's revenue" value={formatINR(stats.revenue)} tint="bg-cta/15 text-cta" />
        <StatCard icon={ShoppingCart} label="Total orders" value={String(stats.orders)} tint="bg-success/15 text-success" />
        <StatCard icon={TrendingUp} label="Avg order value" value={formatINR(stats.avg)} tint="bg-muted text-muted-foreground" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-card border border-border shadow-card p-5 h-64">
          <h3 className="text-sm font-semibold mb-2">Revenue trend</h3>
          <p className="text-xs text-muted-foreground">Hourly chart — shipping with Phase 3.</p>
        </div>
        <div className="rounded-xl bg-card border border-border shadow-card p-5 h-64">
          <h3 className="text-sm font-semibold mb-2">Orders trend</h3>
          <p className="text-xs text-muted-foreground">Hourly chart — shipping with Phase 3.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-card border border-border shadow-card p-5">
          <h3 className="text-sm font-semibold mb-3">Top dishes today</h3>
          <p className="text-xs text-muted-foreground">No data yet — start taking orders to see leaders.</p>
        </div>
        <div className="rounded-xl bg-card border border-border shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Live customer-app feed</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-success/15 text-success px-2 py-0.5 rounded-full">LIVE</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Tables free</span><span className="font-semibold">{stats.total - stats.occupied} / {stats.total}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Est. wait</span><span className="font-semibold">{Math.max(15, stats.occupied * 5)} mins</span></div>
          </div>
        </div>
      </div>
    </main>
  );
}