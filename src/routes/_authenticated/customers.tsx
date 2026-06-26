import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { UserRound, Upload, Plus, Search, X, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Customers — Fudiyo" }] }),
});

type Tab = "customers" | "offers" | "loyalty" | "reports" | "app" | "yourapp";
const TABS: { key: Tab; label: string }[] = [
  { key: "customers", label: "Customers" },
  { key: "offers", label: "Offers & Discounts" },
  { key: "loyalty", label: "Loyalty Program" },
  { key: "reports", label: "Reports" },
  { key: "app", label: "App Settings" },
  { key: "yourapp", label: "Your App" },
];

function CustomersPage() {
  const [tab, setTab] = useState<Tab>("customers");
  return (
    <main className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="size-12 rounded-xl bg-[#0D9488]/10 inline-flex items-center justify-center">
          <UserRound className="size-6 text-[#0D9488]" />
        </div>
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-[#111827]">Customers</h1>
          <p className="text-sm text-[#64748B]">Manage customers, offers and loyalty</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-6 bg-[#F0FDFA] rounded-xl p-1.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`h-10 px-4 rounded-lg text-sm font-semibold ${tab === t.key ? "bg-[#0D9488] text-white" : "text-[#0D9488] hover:bg-white"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "customers" && <CustomersTab />}
      {tab === "offers" && <OffersTab />}
      {tab === "loyalty" && <LoyaltyTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "app" && <AppSettingsTab />}
      {tab === "yourapp" && <YourAppTab />}
    </main>
  );
}

function CustomersTab() {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">All Customers</h2>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-md border bg-white text-sm font-semibold inline-flex items-center gap-1.5"><Upload className="size-4" /> Import</button>
          <button onClick={() => setAdding(true)} className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="size-4" /> Add Customer</button>
        </div>
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h3 className="text-sm font-bold mb-2">Groups</h3>
        <p className="text-sm text-gray-500 mb-3">No groups yet. Create one to segment your customers.</p>
        <button className="h-9 px-3 rounded-md border bg-white text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="size-4" /> New Group</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input placeholder="Search by name, phone, email, or city... (press Enter)" className="w-full h-10 pl-10 pr-3 rounded-md border text-sm" />
        </div>
        <button className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold">Search</button>
        <input type="date" className="h-10 px-3 rounded-md border text-sm" />
        <input type="date" className="h-10 px-3 rounded-md border text-sm" />
        <select className="h-10 px-3 rounded-md border text-sm"><option>Last Order</option><option>Name</option><option>Total Spent</option></select>
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-14 text-center">
        <UserRound className="size-14 text-[#94A3B8] mx-auto mb-3" strokeWidth={1.5} />
        <h3 className="text-base font-bold mb-1">No customers yet</h3>
        <p className="text-sm text-gray-500 mb-4">Start by adding your first customer</p>
        <button onClick={() => setAdding(true)} className="h-11 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="size-4" /> Add First Customer</button>
      </div>
      {adding && <AddCustomerModal onClose={() => setAdding(false)} />}
    </div>
  );
}

function AddCustomerModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-bold">Add Customer</h2>
          <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-md bg-[#DBEAFE] border border-[#93C5FD] p-3 text-sm text-[#1E40AF]">
            Either Name or Phone Number is required. Email, City, and Date of Birth are optional.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[["Name *", "name"], ["Phone Number *", "phone"], ["Email", "email"], ["City", "city"], ["Date of Birth", "dob", "date"], ["Anniversary", "anniv", "date"], ["Address", "address"], ["Locality", "locality"], ["GST Number", "gst"]].map(([label, k, type]) => (
              <div key={k as string}><label className="text-xs font-bold uppercase text-gray-500">{label as string}</label>
                <input type={(type as string) ?? "text"} className="block w-full h-10 px-3 mt-1 rounded-md border text-sm" /></div>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">Cancel</button>
          <button onClick={() => { toast.success("Customer saved"); onClose(); }} className="h-10 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold">Save</button>
        </div>
      </div>
    </div>
  );
}

function OffersTab() {
  const [sub, setSub] = useState<"offers" | "groups" | "coupons">("offers");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Offers & Promotions</h2>
        <button className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="size-4" /> Create Offer</button>
      </div>
      <div className="flex gap-1 border-b">
        {(["offers", "groups", "coupons"] as const).map((s) => (
          <button key={s} onClick={() => setSub(s)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px capitalize ${sub === s ? "border-[#0D9488] text-[#0D9488]" : "border-transparent text-gray-500"}`}>
            {s}{s === "groups" ? "(0)" : ""}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h3 className="text-sm font-bold mb-3">Offer Settings</h3>
        <div className="space-y-3 max-w-xl">
          <Toggle label="Auto-apply Best Offer" />
          <Toggle label="Allow Multiple Offers" />
          <div><label className="text-xs font-bold uppercase text-gray-500">Max Offers per Order</label>
            <input type="number" defaultValue={1} className="block w-32 h-10 px-3 mt-1 rounded-md border text-sm" /></div>
        </div>
        <button className="mt-4 h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold">Save Settings</button>
      </div>
      <div className="rounded-md bg-[#FFFBEB] border border-[#FCD34D] p-3 text-sm text-[#92400E]">
        Note: Offers will apply at checkout based on your auto-apply settings.
      </div>
    </div>
  );
}

function LoyaltyTab() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Loyalty & Rewards</h3>
          <button className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold">Save</button>
        </div>
        <div className="rounded-md bg-[#FFFBEB] border border-[#FCD34D] p-3 text-sm text-[#92400E] mb-4">
          <b>How it works:</b> Customers order through your online order page, earn loyalty points based on order value, and redeem them on future orders.
        </div>
        <Toggle label="Enable Loyalty Points System" />
      </div>
    </div>
  );
}

function ReportsTab() {
  const [period, setPeriod] = useState("week");
  const opts: [string, string][] = [["week", "This Week"], ["month", "This Month"], ["last", "Last Month"], ["3m", "Last 3 Months"], ["custom", "Custom"]];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select className="h-10 px-3 rounded-md border text-sm"><option>My Restaurant</option></select>
        <div className="flex gap-2 flex-wrap">
          {opts.map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)} className={`h-9 px-3 rounded-full text-sm font-semibold ${period === k ? "bg-[#0D9488] text-white" : "bg-white border text-gray-500"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["TOTAL CUSTOMERS", "0"], ["TOTAL REVENUE", "₹0"], ["TOTAL DISCOUNTS", "₹0"], ["AVG ORDER VALUE", "₹0"]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border bg-white p-4">
            <div className="text-[10px] font-bold tracking-wider text-gray-500">{l}</div>
            <div className="text-2xl font-bold mt-1">{v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-white p-12 text-center text-sm text-gray-500">No order data found for the selected period.</div>
    </div>
  );
}

function AppSettingsTab() {
  const [enabled, setEnabled] = useState(false);
  const [code, setCode] = useState("");
  const [slug, setSlug] = useState("");
  const gen = () => setCode(Math.random().toString(36).slice(2, 8).toUpperCase());
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="text-base font-bold mb-4">General Settings</h3>
        <div className="space-y-4">
          <Toggle label="Enable Customer App" checked={enabled} onChange={setEnabled} />
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Restaurant Code</label>
            <div className="flex gap-2 mt-1">
              <input value={code} readOnly placeholder="—" className="flex-1 h-10 px-3 rounded-md border text-sm bg-gray-50" />
              <button onClick={gen} className="h-10 px-3 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold">Generate</button>
              <button disabled={!code} onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }} className="size-10 rounded-md border inline-flex items-center justify-center disabled:opacity-50"><Copy className="size-4" /></button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Custom URL (Short Link)</label>
            <div className="flex gap-2 mt-1">
              <span className="h-10 px-3 rounded-md border bg-gray-50 inline-flex items-center text-sm text-gray-500">fudiyo.com/</span>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="your-slug" className="flex-1 h-10 px-3 rounded-md border text-sm" />
              <button className="h-10 px-3 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold">Save</button>
            </div>
            {slug && <div className="text-xs text-[#16A34A] mt-1">✓ Available</div>}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="text-base font-bold mb-4">QR Code for Online Ordering</h3>
        <div className="aspect-square max-w-[280px] mx-auto bg-gray-50 rounded-xl border flex items-center justify-center text-gray-400 text-sm">
          {code ? <img src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent("fudiyo.com/" + (slug || code))}`} alt="QR" /> : "QR will appear here"}
        </div>
        <button disabled={!code} className={`mt-4 w-full h-10 rounded-md text-sm font-semibold ${code ? "bg-[#0D9488] hover:bg-[#0B7F75] text-white" : "bg-gray-200 text-gray-500"}`}>
          {code ? "Download QR" : "Generate Code First"}
        </button>
        <p className="text-xs text-gray-500 mt-3">Print and place this QR at tables for self-ordering.</p>
      </div>
    </div>
  );
}

function YourAppTab() {
  return (
    <div className="rounded-2xl border bg-white p-14 text-center">
      <div className="size-16 rounded-2xl bg-[#0D9488]/10 inline-flex items-center justify-center mb-3">
        <UserRound className="size-8 text-[#0D9488]" />
      </div>
      <h3 className="text-lg font-bold mb-1">Your App</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto">Customer-facing app coming soon. Configure your app settings in the App Settings tab.</p>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked?: boolean; onChange?: (v: boolean) => void }) {
  const [local, setLocal] = useState(checked ?? false);
  const val = checked ?? local;
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm font-medium">{label}</span>
      <button type="button" onClick={() => { const n = !val; setLocal(n); onChange?.(n); }}
        className={`relative w-11 h-6 rounded-full transition ${val ? "bg-[#0D9488]" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 left-0.5 size-5 bg-white rounded-full transition ${val ? "translate-x-5" : ""}`} />
      </button>
    </label>
  );
}
