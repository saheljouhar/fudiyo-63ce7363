import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Package, Sparkles, ClipboardList, Plus, Zap, Trash2, Download,
  Search, BookOpen, UtensilsCrossed, Clock, ShoppingCart, TrendingUp,
  Recycle, ArrowUpDown, X, CheckCircle2, RefreshCw, Upload, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { RecipesTab } from "@/components/inventory/recipes";
import { ProcurementTab } from "@/components/inventory/procurement";
import { useLocalList } from "@/components/inventory/ui";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
  head: () => ({ meta: [{ title: "Inventory — Fudiyo" }] }),
});

type Tab = "dashboard" | "stock" | "recipes" | "usage" | "procurement" | "ai" | "waste";
interface Item {
  id: string; name: string; category: string; quantity: number; unit: string;
  unit_cost: number; low_stock_threshold: number; supplier: string | null;
}
interface Waste { id: string; item_name: string; quantity: number; reason: string; created_at: string }

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", icon: <Zap className="size-4" /> },
  { key: "stock", label: "Stock", icon: <Package className="size-4" /> },
  { key: "recipes", label: "Recipes", icon: <BookOpen className="size-4" /> },
  { key: "usage", label: "Usage", icon: <Clock className="size-4" /> },
  { key: "procurement", label: "Procurement", icon: <ShoppingCart className="size-4" /> },
  { key: "ai", label: "AI Insights", icon: <TrendingUp className="size-4" /> },
  { key: "waste", label: "Waste", icon: <Recycle className="size-4" /> },
];

function useInventoryData() {
  const [items, setItems] = useState<Item[]>([]);
  const [waste, setWaste] = useState<Waste[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    const [{ data: it }, { data: w }] = await Promise.all([
      supabase.from("inventory_items").select("*").order("name"),
      supabase.from("waste_log").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    if (it) setItems(it as Item[]);
    if (w) setWaste(w as Waste[]);
    setLoading(false);
  };
  useEffect(() => { void reload(); }, []);
  return { items, waste, loading, reload };
}

function InventoryPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [importOpen, setImportOpen] = useState(false);
  const [externalOpen, setExternalOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [wasteOpen, setWasteOpen] = useState(false);
  const data = useInventoryData();

  return (
    <main className="p-6 max-w-[1400px] mx-auto">
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
          <button onClick={() => setExternalOpen(true)} className="h-10 px-4 rounded-md border-2 border-[#0D9488] text-[#0D9488] hover:bg-[#0D9488]/5 text-sm font-semibold inline-flex items-center gap-2 bg-white">
            <ClipboardList className="size-4" /> Log External Order
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`h-10 px-4 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition ${active ? "bg-[#0D9488] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B] hover:bg-gray-50"}`}>
              {t.icon} {t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && <DashboardTab data={data} onAdd={() => setAddOpen(true)} onQuick={() => setQuickOpen(true)} onWaste={() => setWasteOpen(true)} />}
      {tab === "stock" && <StockTab data={data} onAdd={() => setAddOpen(true)} />}
      {tab === "recipes" && <RecipesTab />}
      {tab === "usage" && <UsageTab items={data.items} waste={data.waste} />}
      {tab === "procurement" && <ProcurementTab items={data.items} onReload={data.reload} />}
      {tab === "ai" && <AIInsightsTab items={data.items} />}
      {tab === "waste" && <WasteTab data={data} onLog={() => setWasteOpen(true)} />}

      {importOpen && <SmartImportModal onClose={() => setImportOpen(false)} onDone={data.reload} />}
      {externalOpen && <ExternalOrderModal onClose={() => setExternalOpen(false)} onDone={data.reload} />}
      {addOpen && <AddItemModal onClose={() => setAddOpen(false)} onDone={data.reload} />}
      {quickOpen && <QuickStockModal items={data.items} onClose={() => setQuickOpen(false)} onDone={data.reload} />}
      {wasteOpen && <LogWasteModal items={data.items} onClose={() => setWasteOpen(false)} onDone={data.reload} />}
    </main>
  );
}

/* ---------- Dashboard ---------- */
function DashboardTab({ data, onAdd, onQuick, onWaste }: { data: ReturnType<typeof useInventoryData>; onAdd: () => void; onQuick: () => void; onWaste: () => void }) {
  const { items, waste } = data;
  const totalValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0);
  const lowStock = items.filter((i) => Number(i.quantity) <= Number(i.low_stock_threshold));
  const suppliers = new Set(items.map((i) => i.supplier).filter(Boolean)).size;
  const wasteThisMonth = waste.filter((w) => new Date(w.created_at).getMonth() === new Date().getMonth() && new Date(w.created_at).getFullYear() === new Date().getFullYear());
  const wasteValue = wasteThisMonth.reduce((s, w) => {
    const it = items.find((i) => i.name === w.item_name); return s + Number(w.quantity) * Number(it?.unit_cost ?? 0);
  }, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <BigCta onClick={onAdd} color="#16A34A" hover="#15803D" icon={<Plus className="size-5" />} label="Add Item" />
        <BigCta onClick={onQuick} color="#F59E0B" hover="#D97706" icon={<Zap className="size-5" />} label="Quick Stock" />
        <BigCta onClick={onWaste} color="#DC2626" hover="#B91C1C" icon={<Trash2 className="size-5" />} label="Log Waste" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="TOTAL ITEMS" value={String(items.length)} color="#0D9488" icon={<Package className="size-4" />} />
        <StatCard label="LOW STOCK" value={String(lowStock.length)} color="#F59E0B" icon={<TrendingUp className="size-4" />} />
        <StatCard label="TOTAL VALUE" value={formatINR(totalValue)} color="#16A34A" icon={<ArrowUpDown className="size-4" />} />
        <StatCard label="SUPPLIERS" value={String(suppliers)} color="#2563EB" icon={<ShoppingCart className="size-4" />} />
        <StatCard label="WASTAGE" value={formatINR(wasteValue)} color="#DC2626" icon={<Recycle className="size-4" />} />
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <h3 className="text-sm font-bold text-[#111827] mb-3">Low Stock Items</h3>
        {lowStock.length === 0 ? (
          <div className="py-10 text-center"><p className="text-sm text-[#64748B]">All items are well-stocked. Nice work!</p></div>
        ) : (
          <div className="divide-y divide-[#F1F5F9]">
            {lowStock.map((i) => (
              <div key={i.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-[#FEF3C7] text-[#F59E0B] inline-flex items-center justify-center"><AlertTriangle className="size-4" /></div>
                  <div><div className="text-sm font-semibold text-[#111827]">{i.name}</div><div className="text-xs text-[#64748B]">{i.category} · {i.supplier ?? "No supplier"}</div></div>
                </div>
                <div className="text-right"><div className="text-sm font-bold text-[#DC2626]">{i.quantity} {i.unit}</div><div className="text-xs text-[#64748B]">min {i.low_stock_threshold}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Stock ---------- */
function StockTab({ data, onAdd }: { data: ReturnType<typeof useInventoryData>; onAdd: () => void }) {
  const { items } = data;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<"name" | "stock" | "value">("name");
  const [dir, setDir] = useState<1 | -1>(1);
  const cats = useMemo(() => Array.from(new Set(items.map((i) => i.category))).sort(), [items]);
  const totalValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0);
  const lowStock = items.filter((i) => Number(i.quantity) <= Number(i.low_stock_threshold)).length;
  let visible = items.filter((i) => (cat === "all" || i.category === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
  visible = visible.slice().sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name) * dir;
    if (sort === "stock") return (Number(a.quantity) - Number(b.quantity)) * dir;
    return (Number(a.quantity) * Number(a.unit_cost) - Number(b.quantity) * Number(b.unit_cost)) * dir;
  });
  const exportCSV = () => {
    const rows = [["Name", "Category", "Qty", "Unit", "Unit Cost", "Value", "Supplier"], ...visible.map((i) => [i.name, i.category, String(i.quantity), i.unit, String(i.unit_cost), String(Number(i.quantity) * Number(i.unit_cost)), i.supplier ?? ""])];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "stock.csv"; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="TOTAL ITEMS" value={String(items.length)} color="#0D9488" icon={<Package className="size-4" />} />
        <StatCard label="LOW STOCK" value={String(lowStock)} color="#F59E0B" icon={<TrendingUp className="size-4" />} />
        <StatCard label="VALUE" value={formatINR(totalValue)} color="#16A34A" icon={<ArrowUpDown className="size-4" />} />
        <StatCard label="CATEGORIES" value={String(cats.length)} color="#2563EB" icon={<ClipboardList className="size-4" />} />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#64748B]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items..." className="w-full h-10 pl-10 pr-3 rounded-md border border-[#E2E8F0] bg-white text-sm" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm">
          <option value="all">All Categories</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm">
          <option value="name">Name</option><option value="stock">Stock</option><option value="value">Value</option>
        </select>
        <button onClick={() => setDir((d) => (d === 1 ? -1 : 1))} className="size-10 rounded-md border border-[#E2E8F0] bg-white inline-flex items-center justify-center text-[#64748B] hover:bg-gray-50"><ArrowUpDown className="size-4" /></button>
        <button onClick={onAdd} className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2"><Plus className="size-4" /> Add Item</button>
        <button onClick={exportCSV} className="h-10 px-4 rounded-md border-2 border-[#0D9488] text-[#0D9488] bg-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#0D9488]/5"><Download className="size-4" /> Export CSV</button>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <Package className="size-12 text-[#94A3B8] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-[#111827] mb-1">No inventory items found</h3>
          <p className="text-sm text-[#64748B] mb-5">Get started by adding your first inventory item.</p>
          <button onClick={onAdd} className="h-11 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2"><Plus className="size-4" /> Add Your First Item</button>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F9FAFB] text-[11px] uppercase text-[#6B7280]"><tr>
              <th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Category</th><th className="text-right px-3 py-2">Qty</th><th className="text-right px-3 py-2">Unit Cost</th><th className="text-right px-3 py-2">Value</th><th className="text-left px-3 py-2">Supplier</th><th className="text-right px-3 py-2">Status</th>
            </tr></thead>
            <tbody>
              {visible.map((i) => {
                const low = Number(i.quantity) <= Number(i.low_stock_threshold);
                return (
                  <tr key={i.id} className="border-t border-[#F1F5F9]">
                    <td className="px-3 py-2 font-semibold">{i.name}</td>
                    <td className="px-3 py-2">{i.category}</td>
                    <td className="px-3 py-2 text-right">{i.quantity} {i.unit}</td>
                    <td className="px-3 py-2 text-right">{formatINR(Number(i.unit_cost))}</td>
                    <td className="px-3 py-2 text-right">{formatINR(Number(i.quantity) * Number(i.unit_cost))}</td>
                    <td className="px-3 py-2">{i.supplier ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{low ? <span className="text-[11px] font-bold text-[#F59E0B] bg-[#FEF3C7] px-2 py-0.5 rounded-full">LOW</span> : <span className="text-[11px] font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded-full">OK</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Recipes / Usage / AI / Waste / Procurement ---------- */
function RecipesTab() {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <UtensilsCrossed className="size-12 text-[#94A3B8] mx-auto mb-3" strokeWidth={1.5} />
      <h3 className="text-base font-semibold text-[#111827] mb-1">Recipes</h3>
      <p className="text-sm text-[#64748B]">Recipe management is coming soon.</p>
    </div>
  );
}

function UsageTab({ items, waste }: { items: Item[]; waste: Waste[] }) {
  const [period, setPeriod] = useState<"today" | "7d" | "30d">("today");
  const cutoff = period === "today" ? new Date().setHours(0, 0, 0, 0) : Date.now() - (period === "7d" ? 7 : 30) * 86400000;
  const relevant = waste.filter((w) => new Date(w.created_at).getTime() >= cutoff);
  const byItem: Record<string, number> = {};
  relevant.forEach((w) => { byItem[w.item_name] = (byItem[w.item_name] ?? 0) + Number(w.quantity); });
  const ranked = Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {(["today", "7d", "30d"] as const).map((k) => (
          <button key={k} onClick={() => setPeriod(k)} className={`h-9 px-4 rounded-full text-sm font-semibold ${period === k ? "bg-[#0D9488] text-white" : "bg-white border border-[#E2E8F0] text-[#64748B]"}`}>{k === "today" ? "Today" : k === "7d" ? "7 Days" : "30 Days"}</button>
        ))}
      </div>
      {ranked.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-14 text-center">
          <Clock className="size-8 text-[#0D9488] mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-1">No usage data</h3>
          <p className="text-sm text-[#64748B]">Usage will appear here as inventory is consumed.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
          <div className="text-sm font-bold mb-3">Top consumed / wasted items</div>
          {ranked.map(([name, qty]) => {
            const it = items.find((i) => i.name === name);
            const max = ranked[0][1];
            return (
              <div key={name} className="mb-2">
                <div className="flex justify-between text-[13px]"><span>{name}</span><span className="font-semibold">{qty} {it?.unit ?? ""}</span></div>
                <div className="h-2 rounded-full bg-[#F1F5F9] mt-1 overflow-hidden"><div className="h-full bg-[#0D9488]" style={{ width: `${(qty / max) * 100}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProcurementTab({ items, onReload }: { items: Item[]; onReload: () => void }) {
  const subs = ["Suppliers", "Purchase Orders", "Requisitions", "Goods Receipt", "Invoices", "Returns", "Transfers"];
  const [sub, setSub] = useState("Suppliers");
  const [addOpen, setAddOpen] = useState(false);
  const suppliers = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    for (const i of items) {
      const key = i.supplier || "Unassigned";
      if (!map[key]) map[key] = { count: 0, value: 0 };
      map[key].count += 1;
      map[key].value += Number(i.quantity) * Number(i.unit_cost);
    }
    return Object.entries(map);
  }, [items]);
  return (
    <div className="space-y-5">
      <div className="flex gap-1 flex-wrap border-b border-[#E2E8F0]">
        {subs.map((s) => (
          <button key={s} onClick={() => setSub(s)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${sub === s ? "border-[#0D9488] text-[#0D9488]" : "border-transparent text-[#64748B]"}`}>{s}</button>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold">{sub}</h3>
        {sub === "Suppliers" && <button onClick={() => setAddOpen(true)} className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="size-4" /> Add Supplier</button>}
      </div>
      {sub === "Suppliers" ? (
        suppliers.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center text-sm text-[#64748B]">No suppliers yet.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {suppliers.map(([name, s]) => (
              <div key={name} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                <div className="text-sm font-bold text-[#111827]">{name}</div>
                <div className="text-xs text-[#64748B] mt-1">{s.count} items · {formatINR(s.value)}</div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center text-sm text-[#64748B]">{sub} coming soon.</div>
      )}
      {addOpen && <AddSupplierModal items={items} onClose={() => setAddOpen(false)} onDone={onReload} />}
    </div>
  );
}

function AIInsightsTab({ items }: { items: Item[] }) {
  const lowStock = items.filter((i) => Number(i.quantity) <= Number(i.low_stock_threshold));
  const estLoss = lowStock.reduce((s, i) => s + Number(i.unit_cost) * Math.max(0, Number(i.low_stock_threshold) - Number(i.quantity)), 0);
  const critical = lowStock.filter((i) => Number(i.quantity) === 0).length;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4" style={{ background: "linear-gradient(90deg,#0D9488,#3B82F6)" }}>
        <div className="text-white">
          <h3 className="text-lg font-bold">AI Inventory Insights</h3>
          <p className="text-sm opacity-90 mt-1">{lowStock.length} items at risk with an estimated loss of {formatINR(estLoss)}. {lowStock.length} reorder suggestions available.</p>
        </div>
        <div className="bg-white rounded-xl px-5 py-3 text-center">
          <div className="text-xs font-bold text-[#64748B]">ACTION ITEMS</div>
          <div className="text-3xl font-bold text-[#111827]">{lowStock.length}</div>
        </div>
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h4 className="text-sm font-bold mb-3">Reorder Suggestions <span className="text-gray-400">[{lowStock.length}]</span></h4>
        {lowStock.length === 0 ? <p className="text-sm text-gray-500 py-4 text-center">No suggestions right now.</p> : (
          <div className="space-y-2">
            {lowStock.map((i) => {
              const suggested = Math.max(Number(i.low_stock_threshold) * 2, Number(i.low_stock_threshold) + 5);
              const cost = suggested * Number(i.unit_cost);
              return (
                <div key={i.id} className="flex items-center justify-between border border-[#F1F5F9] rounded-lg p-3">
                  <div>
                    <div className="text-sm font-semibold text-[#111827]">{i.name}</div>
                    <div className="text-xs text-[#64748B]">Current: {i.quantity} {i.unit} · Reorder to {suggested} {i.unit}</div>
                  </div>
                  <div className="text-right"><div className="text-sm font-bold">{formatINR(cost)}</div><div className="text-xs text-[#64748B]">{i.supplier ?? "No supplier"}</div></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h4 className="text-sm font-bold mb-3">Waste Predictions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="ITEMS AT RISK" value={String(lowStock.length)} color="#F59E0B" icon={<TrendingUp className="size-4" />} />
          <StatCard label="ESTIMATED LOSS" value={formatINR(estLoss)} color="#DC2626" icon={<TrendingUp className="size-4" />} />
          <StatCard label="CRITICAL (OUT)" value={String(critical)} color="#DC2626" icon={<TrendingUp className="size-4" />} />
        </div>
      </div>
    </div>
  );
}

function WasteTab({ data, onLog }: { data: ReturnType<typeof useInventoryData>; onLog: () => void }) {
  const { waste, items, reload } = data;
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const startOfWeek = now - 7 * 86400000;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const valueOf = (w: Waste) => Number(w.quantity) * Number(items.find((i) => i.name === w.item_name)?.unit_cost ?? 0);
  const today = waste.filter((w) => new Date(w.created_at).getTime() >= startOfDay);
  const week = waste.filter((w) => new Date(w.created_at).getTime() >= startOfWeek);
  const month = waste.filter((w) => new Date(w.created_at).getTime() >= startOfMonth);
  const top: Record<string, number> = {};
  month.forEach((w) => { top[w.item_name] = (top[w.item_name] ?? 0) + valueOf(w); });
  const topName = Object.entries(top).sort((a, b) => b[1] - a[1])[0];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["TODAY", "#0D9488", today.reduce((s, w) => s + valueOf(w), 0), today.length],
          ["THIS WEEK", "#2563EB", week.reduce((s, w) => s + valueOf(w), 0), week.length],
          ["THIS MONTH", "#F59E0B", month.reduce((s, w) => s + valueOf(w), 0), month.length],
          ["TOP WASTED", "#DC2626", topName?.[1] ?? 0, 0],
        ].map(([l, c, v, n], idx) => (
          <div key={l as string} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <div className="text-[10px] font-bold tracking-wider" style={{ color: c as string }}>{l as string}</div>
            <div className="text-2xl font-bold mt-1">{formatINR(v as number)}</div>
            <div className="text-xs text-gray-500">{idx === 3 ? (topName?.[0] ?? "—") : `${n as number} entries`}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onLog} className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="size-4" /> Log Waste</button>
        <button onClick={reload} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold inline-flex items-center gap-1.5"><RefreshCw className="size-4" /> Refresh</button>
      </div>
      {waste.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center">
          <CheckCircle2 className="size-12 text-[#16A34A] mx-auto mb-3" />
          <h3 className="text-base font-bold mb-1">No waste entries</h3>
          <p className="text-sm text-gray-500">Less waste = more profit.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#F9FAFB] text-[11px] uppercase text-[#6B7280]"><tr>
              <th className="text-left px-3 py-2">Item</th><th className="text-right px-3 py-2">Qty</th><th className="text-left px-3 py-2">Reason</th><th className="text-right px-3 py-2">Value</th><th className="text-left px-3 py-2">When</th>
            </tr></thead>
            <tbody>
              {waste.slice(0, 100).map((w) => (
                <tr key={w.id} className="border-t border-[#F1F5F9]">
                  <td className="px-3 py-2 font-semibold">{w.item_name}</td>
                  <td className="px-3 py-2 text-right">{w.quantity}</td>
                  <td className="px-3 py-2">{w.reason}</td>
                  <td className="px-3 py-2 text-right">{formatINR(valueOf(w))}</td>
                  <td className="px-3 py-2 text-[#64748B]">{new Date(w.created_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Shared ---------- */
function BigCta({ color, hover, icon, label, onClick }: { color: string; hover: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="h-20 rounded-2xl text-white text-lg font-bold inline-flex items-center justify-center gap-3 shadow-sm transition" style={{ backgroundColor: color }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = color)}>
      {icon} {label}
    </button>
  );
}
function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-bold tracking-wider text-[#64748B]">{label}</div>
        <div className="size-7 rounded-md inline-flex items-center justify-center" style={{ backgroundColor: `${color}1A`, color }}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-[#111827] mt-2 tabular-nums">{value}</div>
    </div>
  );
}
function Modal({ title, onClose, children, width = "max-w-lg", headerColor }: { title: string; onClose: () => void; children: React.ReactNode; width?: string; headerColor?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className={`px-5 py-3 flex items-center justify-between ${headerColor ? "text-white" : "border-b"}`} style={headerColor ? { backgroundColor: headerColor } : undefined}>
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className={`size-8 rounded inline-flex items-center justify-center ${headerColor ? "hover:bg-white/10" : "hover:bg-gray-100"}`}><X className="size-4" /></button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">{label}</div>{children}</div>;
}

/* ---------- Modals ---------- */
const UNITS = ["kg", "g", "l", "ml", "pcs", "box", "bottle", "case", "packet", "dozen"];
const CATEGORIES = ["Ingredient", "Vegetables", "Meat & Seafood", "Dairy", "Dry Goods", "Beverages", "Spices", "Packaging", "Cleaning", "Other"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[#0D9488]">{title}</div>
      {children}
    </div>
  );
}

function AddItemModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<"manual" | "scan" | "paste">("manual");
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [name, setName] = useState(""); const [category, setCategory] = useState("");
  const [unit, setUnit] = useState(""); const [purchaseUnit, setPurchaseUnit] = useState("");
  const [qty, setQty] = useState(0); const [cost, setCost] = useState(0);
  const [minStock, setMinStock] = useState(5); const [maxStock, setMaxStock] = useState(0);
  const [supplier, setSupplier] = useState(""); const [barcode, setBarcode] = useState("");
  const [mfgDate, setMfgDate] = useState(""); const [expiryDays, setExpiryDays] = useState<number | "">("");
  const [useExpiryDate, setUseExpiryDate] = useState(false); const [expiryDate, setExpiryDate] = useState("");
  const [location, setLocation] = useState(""); const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("inventory_items").select("supplier");
      const list = Array.from(new Set((data ?? []).map((r) => (r as { supplier: string | null }).supplier).filter((s): s is string => !!s)));
      setSuppliers(list);
    })();
  }, []);

  const save = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    const { error } = await supabase.from("inventory_items").insert({
      name: name.trim(),
      category: category || "Other",
      quantity: Number(qty) || 0,
      unit: unit || "pcs",
      purchase_unit: purchaseUnit || null,
      unit_cost: Number(cost) || 0,
      low_stock_threshold: Number(minStock) || 0,
      max_stock: maxStock ? Number(maxStock) : null,
      supplier: supplier || null,
      barcode: barcode || null,
      mfg_date: mfgDate || null,
      expiry_days: !useExpiryDate && expiryDays !== "" ? Number(expiryDays) : null,
      expiry_date: useExpiryDate && expiryDate ? expiryDate : null,
      location: location || null,
      description: description || null,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Item added"); onDone(); onClose();
  };

  const inputCls = "w-full h-10 px-3 rounded-md border border-[#E2E8F0] text-sm";

  return (
    <Modal title="Add Inventory Item" onClose={onClose} width="max-w-2xl" headerColor="#16A34A">
      <div className="flex border-b">
        {(["manual", "scan", "paste"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 h-11 text-sm font-semibold capitalize ${tab === t ? "border-b-2 border-[#0D9488] text-[#0D9488]" : "text-gray-500"}`}>{t === "scan" ? "Scan Invoice" : t === "paste" ? "Paste Text" : "Manual"}</button>
        ))}
      </div>
      <div className="p-5 space-y-5">
        {tab === "manual" && (<>
          <Section title="Basic Info">
            <Fld label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className={inputCls} /></Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Fld>
              <Fld label="Stock / Usage Unit">
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls}>
                  <option value="">Select unit</option>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Fld>
            </div>
            <Fld label="Purchase Unit (optional)">
              <select value={purchaseUnit} onChange={(e) => setPurchaseUnit(e.target.value)} className={inputCls}>
                <option value="">Same as stock unit</option>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <div className="text-[11px] text-[#64748B] mt-1">Buy in this unit (e.g. bottle, case), track/deduct in the stock unit.</div>
            </Fld>
          </Section>

          <Section title="Stock & Pricing">
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Current Stock"><input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className={inputCls} /></Fld>
              <Fld label="Cost Per Unit (₹)"><input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className={inputCls} /></Fld>
              <Fld label="Min Stock"><input type="number" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} className={inputCls} /></Fld>
              <Fld label="Max Stock"><input type="number" value={maxStock} onChange={(e) => setMaxStock(Number(e.target.value))} className={inputCls} /></Fld>
            </div>
          </Section>

          <Section title="Tracking">
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Supplier">
                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls}>
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Fld>
              <Fld label="Barcode"><input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or enter barcode" className={inputCls} /></Fld>
              <Fld label="MFG Date"><input type="date" value={mfgDate} onChange={(e) => setMfgDate(e.target.value)} className={inputCls} /></Fld>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{useExpiryDate ? "Expiry Date" : "Expiry Days"}</div>
                  <button type="button" onClick={() => setUseExpiryDate((v) => !v)} className="text-[11px] font-semibold text-[#0D9488] hover:underline">
                    {useExpiryDate ? "Use days instead" : "Use date instead"}
                  </button>
                </div>
                {useExpiryDate
                  ? <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputCls} />
                  : <input type="number" value={expiryDays} onChange={(e) => setExpiryDays(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 30" className={inputCls} />}
              </div>
            </div>
            <Fld label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Walk-in cooler, Shelf A" className={inputCls} /></Fld>
            <Fld label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes about this item" className="w-full min-h-[80px] p-3 rounded-md border border-[#E2E8F0] text-sm" /></Fld>
          </Section>
        </>)}
        {tab === "scan" && <div className="border-2 border-dashed rounded-xl p-10 text-center"><Upload className="size-10 mx-auto text-gray-400 mb-3" /><p className="text-sm">Upload invoice PDF/JPG (coming soon)</p></div>}
        {tab === "paste" && <textarea placeholder="Paste inventory list, one per line: Name, Qty, Unit, Cost" className="w-full min-h-[180px] p-3 border rounded-md text-sm" />}
      </div>
      <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">Cancel</button>
        <button disabled={saving} onClick={save} className="h-10 px-5 rounded-md bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold disabled:opacity-50">{saving ? "Adding…" : "Add Item"}</button>
      </div>
    </Modal>
  );
}

function QuickStockModal({ items, onClose, onDone }: { items: Item[]; onClose: () => void; onDone: () => void }) {
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.id, Number(i.quantity)])));
  const [saving, setSaving] = useState(false);

  const visible = items.filter((i) => i.name.toLowerCase().includes(search.trim().toLowerCase()));
  const changed = items.filter((i) => Number(values[i.id]) !== Number(i.quantity));

  const saveAll = async () => {
    if (!changed.length) return toast.error("No changes to save");
    setSaving(true);
    const results = await Promise.all(
      changed.map((i) => supabase.from("inventory_items").update({ quantity: Math.max(0, Number(values[i.id]) || 0) } as never).eq("id", i.id)),
    );
    setSaving(false);
    const err = results.find((r) => r.error)?.error;
    if (err) return toast.error(err.message);
    toast.success(`${changed.length} item${changed.length > 1 ? "s" : ""} updated`);
    onDone(); onClose();
  };

  return (
    <Modal title="Quick Stock Update" onClose={onClose} width="max-w-xl" headerColor="#16A34A">
      <div className="p-5 space-y-3">
        <div className="text-[13px] text-[#64748B]">Adjust stock levels for your daily check-in. Changed items are highlighted.</div>
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..." className="w-full h-10 pl-9 pr-3 rounded-md border border-[#E2E8F0] text-sm" />
        </div>
        <div className="max-h-[45vh] overflow-y-auto space-y-2">
          {visible.length === 0 && <div className="py-10 text-center text-sm text-[#64748B]">No items found</div>}
          {visible.map((i) => {
            const isChanged = Number(values[i.id]) !== Number(i.quantity);
            return (
              <div key={i.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition ${isChanged ? "border-[#16A34A] bg-[#F0FDF4]" : "border-[#E2E8F0] bg-white"}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#111827] truncate">{i.name}</div>
                  <div className="text-[11px] text-[#64748B]">{i.category} · was {i.quantity} {i.unit}</div>
                </div>
                <input type="number" value={values[i.id] ?? 0}
                  onChange={(e) => setValues((v) => ({ ...v, [i.id]: Number(e.target.value) }))}
                  className="w-24 h-10 px-2 rounded-md border border-[#E2E8F0] text-sm text-right tabular-nums" />
                <div className="w-10 text-[11px] text-[#64748B]">{i.unit}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">Cancel</button>
        <button disabled={saving} onClick={saveAll} className="h-10 px-5 rounded-md bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold disabled:opacity-50">
          {saving ? "Saving…" : `Save All Changes${changed.length ? ` (${changed.length})` : ""}`}
        </button>
      </div>
    </Modal>
  );
}


function LogWasteModal({ items, onClose, onDone }: { items: Item[]; onClose: () => void; onDone: () => void }) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [qty, setQty] = useState(1); const [reason, setReason] = useState("Expired");
  const [saving, setSaving] = useState(false);
  const reasons = ["Expired", "Spoiled", "Overcooked", "Dropped", "Customer return", "Other"];
  const save = async () => {
    const it = items.find((i) => i.id === itemId); if (!it) return toast.error("Pick item");
    setSaving(true);
    const [{ error: wErr }, { error: iErr }] = await Promise.all([
      supabase.from("waste_log").insert({ item_id: it.id, item_name: it.name, quantity: qty, reason } as never),
      supabase.from("inventory_items").update({ quantity: Math.max(0, Number(it.quantity) - qty) } as never).eq("id", it.id),
    ]);
    setSaving(false);
    if (wErr || iErr) return toast.error((wErr ?? iErr)!.message);
    toast.success("Waste logged"); onDone(); onClose();
  };
  return (
    <Modal title="Log Waste" onClose={onClose}>
      <div className="p-5 space-y-3">
        <Fld label="Item"><select value={itemId} onChange={(e) => setItemId(e.target.value)} className="w-full h-10 px-3 rounded-md border text-sm">{items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}</select></Fld>
        <Fld label="Quantity Wasted"><input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full h-10 px-3 rounded-md border text-sm" /></Fld>
        <Fld label="Reason"><div className="flex flex-wrap gap-1.5">{reasons.map((r) => (
          <button key={r} onClick={() => setReason(r)} className={`h-8 px-3 rounded-full text-[12px] font-semibold border ${reason === r ? "bg-[#DC2626] text-white border-[#DC2626]" : "bg-white border-[#E5E7EB]"}`}>{r}</button>
        ))}</div></Fld>
      </div>
      <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">Cancel</button>
        <button disabled={saving || !itemId} onClick={save} className="h-10 px-5 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold disabled:opacity-50">Log Waste</button>
      </div>
    </Modal>
  );
}

function SmartImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<"paste" | "invoice" | "file">("paste");
  const [text, setText] = useState(""); const [saving, setSaving] = useState(false);
  const parseAndSave = async () => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return toast.error("Paste some items");
    setSaving(true);
    const rows = lines.map((line) => {
      const [name, qty, unit = "pcs", cost = "0"] = line.split(/[,;\t]/).map((s) => s.trim());
      return { name, quantity: Number(qty) || 0, unit, unit_cost: Number(cost) || 0 };
    }).filter((r) => r.name);
    const { error } = await supabase.from("inventory_items").insert(rows as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${rows.length} items`); onDone(); onClose();
  };
  return (
    <Modal title="Smart Import" onClose={onClose} width="max-w-2xl">
      <div className="flex border-b">
        {(["paste", "invoice", "file"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 h-11 text-sm font-semibold capitalize ${tab === t ? "border-b-2 border-[#0D9488] text-[#0D9488]" : "text-gray-500"}`}>
            {t === "paste" ? "Paste Text" : t === "invoice" ? "Upload Invoice" : "Upload File"}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === "paste" && (<>
          <p className="text-xs text-[#64748B] mb-2">Format per line: Name, Qty, Unit, Cost</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full min-h-[180px] p-3 border rounded-md text-sm font-mono" placeholder="Tomato, 10, kg, 40&#10;Rice, 25, kg, 65" />
        </>)}
        {tab === "invoice" && <div className="border-2 border-dashed rounded-xl p-10 text-center"><Upload className="size-10 mx-auto text-gray-400 mb-3" /><p className="text-sm">Upload invoice (PDF/JPG/PNG) — OCR coming soon</p></div>}
        {tab === "file" && <div className="border-2 border-dashed rounded-xl p-10 text-center"><Upload className="size-10 mx-auto text-gray-400 mb-3" /><p className="text-sm">Drop CSV/XLSX here — coming soon</p></div>}
      </div>
      <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">Cancel</button>
        <button disabled={saving || tab !== "paste"} onClick={parseAndSave} className="h-10 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold disabled:opacity-50">Import</button>
      </div>
    </Modal>
  );
}

function ExternalOrderModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<"manual" | "paste" | "photo">("manual");
  const [name, setName] = useState(""); const [qty, setQty] = useState(0); const [unit, setUnit] = useState("kg"); const [cost, setCost] = useState(0); const [supplier, setSupplier] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name) return toast.error("Name required");
    setSaving(true);
    const { data: existing } = await supabase.from("inventory_items").select("id,quantity").eq("name", name).maybeSingle();
    let error;
    if (existing) {
      ({ error } = await supabase.from("inventory_items").update({ quantity: Number(existing.quantity) + qty, unit_cost: cost, supplier: supplier || null } as never).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("inventory_items").insert({ name, quantity: qty, unit, unit_cost: cost, supplier: supplier || null } as never));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Order logged"); onDone(); onClose();
  };
  return (
    <Modal title="Log External Order" onClose={onClose}>
      <div className="flex border-b">
        {(["manual", "paste", "photo"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 h-11 text-sm font-semibold capitalize ${tab === t ? "border-b-2 border-[#0D9488] text-[#0D9488]" : "text-gray-500"}`}>{t === "photo" ? "Upload Photo" : t === "paste" ? "Paste Text" : "Manual"}</button>
        ))}
      </div>
      <div className="p-5 space-y-3">
        {tab === "manual" && (<>
          <Fld label="Item Name"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-md border text-sm" /></Fld>
          <Fld label="Supplier"><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full h-10 px-3 rounded-md border text-sm" /></Fld>
          <div className="grid grid-cols-3 gap-3">
            <Fld label="Qty"><input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full h-10 px-3 rounded-md border text-sm" /></Fld>
            <Fld label="Unit"><select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full h-10 px-3 rounded-md border text-sm">{["kg", "g", "l", "ml", "pcs", "box"].map((u) => <option key={u}>{u}</option>)}</select></Fld>
            <Fld label="Unit Cost"><input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="w-full h-10 px-3 rounded-md border text-sm" /></Fld>
          </div>
        </>)}
        {tab === "paste" && <textarea placeholder="Paste order text" className="w-full min-h-[160px] p-3 border rounded-md text-sm" />}
        {tab === "photo" && <div className="border-2 border-dashed rounded-xl p-10 text-center"><Upload className="size-10 mx-auto text-gray-400 mb-3" /><p className="text-sm">Upload photo — OCR coming soon</p></div>}
      </div>
      <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">Cancel</button>
        <button disabled={saving || tab !== "manual"} onClick={save} className="h-10 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold disabled:opacity-50">Log Order</button>
      </div>
    </Modal>
  );
}

