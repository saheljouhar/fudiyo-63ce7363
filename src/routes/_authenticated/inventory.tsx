import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Package, Sparkles, ClipboardList, Plus, Zap, Trash2, Download,
  Search, BookOpen, UtensilsCrossed, Clock, ShoppingCart, TrendingUp,
  Recycle, ArrowUpDown, X, CheckCircle2, RefreshCw, Upload,
} from "lucide-react";
import { toast } from "sonner";

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
  const [importOpen, setImportOpen] = useState(false);
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
          <button onClick={() => setImportOpen(true)} className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2">
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
      {tab === "usage" && <UsageTab />}
      {tab === "procurement" && <ProcurementTab />}
      {tab === "ai" && <AIInsightsTab />}
      {tab === "waste" && <WasteTab />}
      {importOpen && <SmartImportModal onClose={() => setImportOpen(false)} />}
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
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#111827]">Recipes</h3>
          <p className="text-xs text-[#64748B]">0 of 0 recipes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAddOpen(true)} className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2">
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#64748B]" />
        <input placeholder="Search recipes..." className="w-full h-10 pl-10 pr-3 rounded-md border border-[#E2E8F0] bg-white text-sm" />
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <UtensilsCrossed className="size-12 text-[#94A3B8] mx-auto mb-3" strokeWidth={1.5} />
        <h3 className="text-base font-semibold text-[#111827] mb-1">No recipes yet</h3>
        <p className="text-sm text-[#64748B] mb-5">Create your first recipe to track ingredient costs.</p>
        <button onClick={() => setAddOpen(true)} className="h-11 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2">
          <Plus className="size-4" /> Add Recipe
        </button>
      </div>
      {addOpen && <AddRecipeModal onClose={() => setAddOpen(false)} />}
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


function UsageTab() {
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "custom">("today");
  const opts: [typeof period, string][] = [["today", "Today"], ["7d", "7 Days"], ["30d", "30 Days"], ["custom", "Custom"]];
  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {opts.map(([k, l]) => (
          <button key={k} onClick={() => setPeriod(k)}
            className={`h-9 px-4 rounded-full text-sm font-semibold ${period === k ? "bg-[#0D9488] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B]"}`}>{l}</button>
        ))}
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-14 text-center">
        <div className="size-16 rounded-2xl bg-[#0D9488]/10 inline-flex items-center justify-center mb-3"><Clock className="size-8 text-[#0D9488]" /></div>
        <h3 className="text-lg font-bold mb-1">No usage data yet</h3>
        <p className="text-sm text-[#64748B] max-w-md mx-auto">Usage data will appear here as inventory is consumed through orders, recipes, and manual adjustments.</p>
      </div>
    </div>
  );
}

function ProcurementTab() {
  const subs = ["Suppliers", "Purchase Orders", "Requisitions", "Goods Receipt", "Invoices", "Returns", "Transfers"];
  const [sub, setSub] = useState("Suppliers");
  return (
    <div className="space-y-5">
      <div className="flex gap-1 flex-wrap border-b border-[#E2E8F0]">
        {subs.map((s) => (
          <button key={s} onClick={() => setSub(s)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${sub === s ? "border-[#0D9488] text-[#0D9488]" : "border-transparent text-[#64748B]"}`}>{s}</button>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold">{sub}</h3>
        <button className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-1.5">
          <Plus className="size-4" /> Add {sub.replace(/s$/, "")}
        </button>
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center text-sm text-[#64748B]">
        No {sub.toLowerCase()} added yet.
      </div>
    </div>
  );
}

function AIInsightsTab() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4" style={{ background: "linear-gradient(90deg,#0D9488,#3B82F6)" }}>
        <div className="text-white">
          <h3 className="text-lg font-bold">AI Inventory Insights</h3>
          <p className="text-sm opacity-90 mt-1">0 items at risk with an estimated loss of ₹0.00. 0 reorder suggestions available.</p>
        </div>
        <div className="bg-white rounded-xl px-5 py-3 text-center">
          <div className="text-xs font-bold text-[#64748B]">ACTION ITEMS</div>
          <div className="text-3xl font-bold text-[#111827]">0</div>
        </div>
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h4 className="text-sm font-bold mb-3">Reorder Suggestions <span className="text-gray-400">[0]</span></h4>
        <p className="text-sm text-gray-500 py-4 text-center">No suggestions right now.</p>
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h4 className="text-sm font-bold mb-3">Waste Predictions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="ITEMS AT RISK" value="0" color="#F59E0B" icon={<TrendingUp className="size-4" />} />
          <StatCard label="ESTIMATED LOSS" value="₹0.00" color="#DC2626" icon={<TrendingUp className="size-4" />} />
          <StatCard label="CRITICAL RISK" value="0" color="#DC2626" icon={<TrendingUp className="size-4" />} />
        </div>
      </div>
    </div>
  );
}

function WasteTab() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["TODAY", "#0D9488"], ["THIS WEEK", "#2563EB"], ["THIS MONTH", "#F59E0B"], ["TOP WASTED", "#DC2626"]].map(([l, c]) => (
          <div key={l} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <div className="text-[10px] font-bold tracking-wider" style={{ color: c }}>{l}</div>
            <div className="text-2xl font-bold mt-1">₹0.00</div>
            <div className="text-xs text-gray-500">0 entries</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="size-4" /> Log Waste</button>
        <button className="h-10 px-4 rounded-md bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Sparkles className="size-4" /> AI Leftover</button>
        <button className="h-10 px-4 rounded-md border bg-white text-sm font-semibold inline-flex items-center gap-1.5"><RefreshCw className="size-4" /> Refresh</button>
        <div className="ml-auto flex items-center gap-2">
          <select className="h-10 px-3 rounded-md border text-sm"><option>7 Days</option><option>30 Days</option></select>
          <select className="h-10 px-3 rounded-md border text-sm"><option>All Reasons</option></select>
          <button className="h-10 px-4 rounded-md border-2 border-[#0D9488] text-[#0D9488] bg-white text-sm font-semibold inline-flex items-center gap-1.5"><Download className="size-4" /> Export PDF</button>
        </div>
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center">
        <CheckCircle2 className="size-12 text-[#16A34A] mx-auto mb-3" />
        <h3 className="text-base font-bold mb-1">No waste entries</h3>
        <p className="text-sm text-gray-500">Less waste = more profit.</p>
      </div>
    </div>
  );
}

function SmartImportModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"paste" | "invoice" | "file">("paste");
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-bold">Smart Import</h2>
          <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
        </div>
        <div className="flex border-b">
          {(["paste", "invoice", "file"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 h-11 text-sm font-semibold capitalize ${tab === t ? "border-b-2 border-[#0D9488] text-[#0D9488]" : "text-gray-500"}`}>
              {t === "paste" ? "Paste Text" : t === "invoice" ? "Upload Invoice" : "Upload File"}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === "paste" && <textarea className="w-full min-h-[180px] p-3 border rounded-md text-sm" placeholder="Paste inventory list..." />}
          {tab === "invoice" && <div className="border-2 border-dashed rounded-xl p-10 text-center"><Upload className="size-10 mx-auto text-gray-400 mb-3" /><p className="text-sm">Upload invoice (PDF/JPG/PNG)</p></div>}
          {tab === "file" && (
            <div className="border-2 border-dashed rounded-xl p-10 text-center">
              <Upload className="size-10 mx-auto text-gray-400 mb-3" />
              <p className="text-sm font-semibold">Drop file here or click to upload</p>
              <p className="text-xs text-gray-500 mt-1">Supported: CSV, XLSX, XLS</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">Cancel</button>
          <button onClick={() => { toast.success("Import queued"); onClose(); }} className="h-10 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold">Upload & Parse</button>
        </div>
      </div>
    </div>
  );
}

function AddRecipeModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [servings, setServings] = useState(1);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#16A34A] text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Add Recipe</h2>
          <button onClick={onClose} className="size-8 rounded hover:bg-white/10 inline-flex items-center justify-center"><X className="size-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-[#0D9488]/30 bg-[#0D9488]/5 p-4">
            <h4 className="text-sm font-bold text-[#0D9488] mb-2 inline-flex items-center gap-1.5"><Sparkles className="size-4" /> AI Recipe Generator</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <input placeholder="Recipe Name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 px-3 rounded-md border text-sm" />
              <input type="number" placeholder="Servings" value={servings} onChange={(e) => setServings(Number(e.target.value))} className="h-10 px-3 rounded-md border text-sm" />
            </div>
            <button disabled={!name} className="w-full h-10 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold disabled:opacity-50">Generate with AI</button>
          </div>
          <textarea placeholder="Description" className="w-full min-h-[70px] p-3 border rounded-md text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Category" className="h-10 px-3 rounded-md border text-sm" />
            <input type="number" placeholder="Servings" className="h-10 px-3 rounded-md border text-sm" />
            <input type="number" placeholder="Prep Time (min)" className="h-10 px-3 rounded-md border text-sm" />
            <input type="number" placeholder="Cook Time (min)" className="h-10 px-3 rounded-md border text-sm" />
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">Cancel</button>
          <button onClick={() => { toast.success("Recipe created"); onClose(); }} className="h-10 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold">Create Recipe</button>
        </div>
      </div>
    </div>
  );
}
