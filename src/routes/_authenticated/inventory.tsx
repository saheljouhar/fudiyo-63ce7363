import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Package, Sparkles, ClipboardList, Plus, Zap, Trash2, Download,
  Search, BookOpen, UtensilsCrossed, Clock, ShoppingCart, TrendingUp,
  Recycle, FileText, ArrowUpDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
  head: () => ({ meta: [{ title: "Inventory — Fudiyo" }] }),
});

type Tab = "dashboard" | "stock" | "recipes" | "usage" | "procurement" | "ai" | "waste";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <Zap className="size-4" /> },
  { key: "stock", label: "Stock", icon: <Package className="size-4" /> },
  { key: "recipes", label: "Recipes", icon: <BookOpen className="size-4" /> },
  { key: "usage", label: "Usage", icon: <Clock className="size-4" /> },
  { key: "procurement", label: "Procurement", icon: <ShoppingCart className="size-4" /> },
  { key: "ai", label: "AI Insights", icon: <TrendingUp className="size-4" /> },
  { key: "waste", label: "Waste", icon: <Recycle className="size-4" /> },
];

function InventoryPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  return (
    <main className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-[#0D9488]/10 inline-flex items-center justify-center">
            <Package className="size-6 text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-[#111827]">Inventory</h1>
            <p className="text-sm text-[#64748B]">Smart inventory management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2">
            <Sparkles className="size-4" /> Smart Import
          </button>
          <button className="h-10 px-4 rounded-md border-2 border-[#0D9488] text-[#0D9488] hover:bg-[#0D9488]/5 text-sm font-semibold inline-flex items-center gap-2 bg-white">
            <ClipboardList className="size-4" /> Log External Order
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`h-10 px-4 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition ${
                active ? "bg-[#0D9488] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-gray-50"
              }`}
            >
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "stock" && <StockTab />}
      {tab === "recipes" && <RecipesTab />}
      {tab === "usage" && <ComingSoon icon={<Clock className="size-10 text-[#0D9488]" />} title="Usage" subtitle="Track consumption trends across your kitchen." />}
      {tab === "procurement" && <ComingSoon icon={<ShoppingCart className="size-10 text-[#0D9488]" />} title="Procurement" subtitle="Manage suppliers and purchase orders." />}
      {tab === "ai" && <ComingSoon icon={<TrendingUp className="size-10 text-[#0D9488]" />} title="AI Insights" subtitle="Forecast demand and reduce waste with AI suggestions." />}
      {tab === "waste" && <ComingSoon icon={<Recycle className="size-10 text-[#0D9488]" />} title="Waste" subtitle="Log and review waste events to cut losses." />}
    </main>
  );
}

function DashboardTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BigCta color="#16A34A" hover="#15803D" icon={<Plus className="size-5" />} label="Add Item" />
        <BigCta color="#F59E0B" hover="#D97706" icon={<Zap className="size-5" />} label="Quick Stock" />
        <BigCta color="#DC2626" hover="#B91C1C" icon={<Trash2 className="size-5" />} label="Log Waste" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="TOTAL ITEMS" value="0" color="#0D9488" icon={<Package className="size-4" />} />
        <StatCard label="LOW STOCK" value="0" color="#F59E0B" icon={<TrendingUp className="size-4" />} />
        <StatCard label="TOTAL VALUE" value="₹0" color="#16A34A" icon={<ArrowUpDown className="size-4" />} />
        <StatCard label="SUPPLIERS" value="0" color="#2563EB" icon={<ShoppingCart className="size-4" />} />
        <StatCard label="WASTAGE" value="₹0" color="#DC2626" icon={<Recycle className="size-4" />} />
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-bold text-[#111827] mb-3">Low Stock Items</h3>
        <div className="py-10 text-center">
          <p className="text-sm text-[#64748B]">All items are well-stocked. Nice work!</p>
        </div>
      </div>
    </div>
  );
}

function StockTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="TOTAL ITEMS" value="0" color="#0D9488" icon={<Package className="size-4" />} />
        <StatCard label="LOW STOCK" value="0" color="#F59E0B" icon={<TrendingUp className="size-4" />} />
        <StatCard label="VALUE" value="₹0" color="#16A34A" icon={<ArrowUpDown className="size-4" />} />
        <StatCard label="CATEGORIES" value="0" color="#2563EB" icon={<ClipboardList className="size-4" />} />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#64748B]" />
          <input placeholder="Search items..." className="w-full h-10 pl-10 pr-3 rounded-md border border-[#E2E8F0] bg-white text-sm" />
        </div>
        <select className="h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm">
          <option>All Categories</option>
        </select>
        <select className="h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm">
          <option>Name</option><option>Stock</option><option>Value</option>
        </select>
        <button className="size-10 rounded-md border border-[#E2E8F0] bg-white inline-flex items-center justify-center text-[#64748B] hover:bg-gray-50">
          <ArrowUpDown className="size-4" />
        </button>
        <button className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2">
          <Plus className="size-4" /> Add Item
        </button>
        <button className="h-10 px-4 rounded-md border-2 border-[#0D9488] text-[#0D9488] bg-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#0D9488]/5">
          <Download className="size-4" /> Export PDF
        </button>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <Package className="size-12 text-[#94A3B8] mx-auto mb-3" strokeWidth={1.5} />
        <h3 className="text-base font-semibold text-[#111827] mb-1">No inventory items found</h3>
        <p className="text-sm text-[#64748B] mb-5">Get started by adding your first inventory item.</p>
        <button className="h-11 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2">
          <Plus className="size-4" /> Add Your First Item
        </button>
      </div>
    </div>
  );
}

function RecipesTab() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#111827]">Recipes</h3>
          <p className="text-xs text-[#64748B]">0 of 0 recipes</p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2">
            <Plus className="size-4" /> Add Recipe
          </button>
          <button className="h-10 px-4 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold inline-flex items-center gap-2">
            <ClipboardList className="size-4" /> Bulk Import
          </button>
          <button className="h-10 px-4 rounded-md border-2 border-[#0D9488] text-[#0D9488] bg-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#0D9488]/5">
            <Download className="size-4" /> Export PDF
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <UtensilsCrossed className="size-12 text-[#94A3B8] mx-auto mb-3" strokeWidth={1.5} />
        <h3 className="text-base font-semibold text-[#111827] mb-1">No recipes yet</h3>
        <p className="text-sm text-[#64748B] mb-5">Create your first recipe to track ingredient costs.</p>
        <button className="h-11 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2">
          <Plus className="size-4" /> Add Recipe
        </button>
      </div>
    </div>
  );
}

function ComingSoon({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-14 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="size-16 rounded-2xl bg-[#0D9488]/10 inline-flex items-center justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-[#111827] mb-1">{title}</h3>
      <p className="text-sm text-[#64748B] max-w-md mx-auto">{subtitle}</p>
      <p className="text-xs text-[#94A3B8] mt-3">Coming soon</p>
    </div>
  );
}

function BigCta({ color, hover, icon, label }: { color: string; hover: string; icon: React.ReactNode; label: string }) {
  return (
    <button
      className="h-20 rounded-2xl text-white text-lg font-bold inline-flex items-center justify-center gap-3 shadow-sm transition"
      style={{ backgroundColor: color }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = color)}
    >
      {icon} {label}
    </button>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-bold tracking-wider text-[#64748B]">{label}</div>
        <div className="size-7 rounded-md inline-flex items-center justify-center" style={{ backgroundColor: `${color}1A`, color }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-[#111827] mt-2 tabular-nums">{value}</div>
    </div>
  );
}

// Silence unused-import warnings (kept for future tabs)
void FileText;
