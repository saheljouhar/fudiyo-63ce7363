import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/lib/i18n";
import { Copy, Mail, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Fudiyo" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (s.tab as Tab | undefined) ?? undefined,
  }),
});

type Tab = "general" | "tax" | "print" | "payment" | "customer" | "about";
const TABS: [Tab, string][] = [["general","General"],["tax","Tax & Billing"],["print","Print"],["payment","Payment"],["customer","Customer App"],["about","About"]];

interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  business_type: string;
  gst_number: string | null;
  tax_rate: number;
  bill_header: string | null;
  bill_footer: string | null;
  paper_size: string;
  auto_print_kot: boolean;
  auto_print_bill: boolean;
  accept_cash: boolean;
  accept_card: boolean;
  accept_upi: boolean;
  upi_id: string | null;
  show_upi_qr: boolean;
  share_live_data: boolean;
}

function SettingsPage() {
  const { tab: initialTab } = Route.useSearch();
  const [tab, setTab] = useState<Tab>(initialTab ?? "general");
  const [r, setR] = useState<Restaurant | null>(null);
  const reload = async () => {
    const { data } = await supabase.from("restaurants").select("*").limit(1).maybeSingle();
    if (data) setR(data as unknown as Restaurant);
  };
  useEffect(() => { void reload(); }, []);

  const save = async (patch: Partial<Restaurant>) => {
    if (!r) return;
    const { error } = await supabase.from("restaurants").update(patch as never).eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); void reload(); }
  };

  return (
    <main className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Settings" subtitle="Restaurant, billing, printers, language" />
      <div className="border-b border-border mb-6 flex gap-1 flex-wrap">
        {TABS.map(([t,l]) => (
          <button key={t} onClick={()=>setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab===t?"border-primary text-primary":"border-transparent text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>
      {!r ? <div className="text-sm text-muted-foreground">Loading…</div>
        : tab==="general" ? <General r={r} save={save} />
        : tab==="tax" ? <Tax r={r} save={save} />
        : tab==="print" ? <Print r={r} save={save} />
        : tab==="payment" ? <Payment r={r} save={save} />
        : tab==="customer" ? <Customer r={r} save={save} />
        : <About r={r} />}
    </main>
  );
}

function General({ r, save }: { r: Restaurant; save: (p: Partial<Restaurant>) => void }) {
  const [form, setForm] = useState({ name: r.name, address: r.address ?? "", phone: r.phone ?? "" });
  const [lang, setLang] = useLang();
  const [biz, setBiz] = useState(r.business_type);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold mb-4">General Settings</h3>
        <Field label="Restaurant name"><input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="input" /></Field>
        <Field label="Address"><textarea value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})} className="input min-h-[70px]" /></Field>
        <Field label="Phone number"><input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} className="input" /></Field>
        <div className="mt-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Language</div>
          <div className="flex gap-2">
            {(["en","ml"] as const).map((l) => (
              <button key={l} onClick={()=>setLang(l)} className={`h-9 px-4 rounded-full text-sm font-semibold ${lang===l?"bg-primary text-primary-foreground":"border border-input bg-card"}`}>{l==="en"?"English":"മലയാളം"}</button>
            ))}
          </div>
        </div>
        <button onClick={()=>save(form)} className="mt-5 w-full h-11 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save & Apply</button>
        <Style />
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-base font-semibold mb-4">Dashboard Customization</h3>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Business type</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {["restaurant","cafe","bar","bakery","ice_cream","qsr"].map((b) => (
            <button key={b} onClick={()=>setBiz(b)} className={`h-8 px-3 rounded-full text-xs font-semibold capitalize ${biz===b?"bg-foreground text-background":"border border-input"}`}>{b.replace("_"," ")}</button>
          ))}
        </div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Order types</div>
        <div className="space-y-2 text-sm">
          {["Dine-in","Takeaway","Delivery"].map((o) => <label key={o} className="flex items-center justify-between"><span>{o}</span><input type="checkbox" defaultChecked className="size-4 accent-primary" /></label>)}
        </div>
        <button onClick={()=>save({ business_type: biz as never })} className="mt-5 h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save</button>
      </div>
    </div>
  );
}

function Tax({ r, save }: { r: Restaurant; save: (p: Partial<Restaurant>) => void }) {
  const [form, setForm] = useState({ gst_number: r.gst_number ?? "", tax_rate: r.tax_rate, bill_header: r.bill_header ?? "", bill_footer: r.bill_footer ?? "" });
  return (
    <div className="rounded-xl border border-border bg-card p-6 max-w-2xl space-y-4">
      <Field label="GST number"><input value={form.gst_number} onChange={(e)=>setForm({...form,gst_number:e.target.value})} className="input" /></Field>
      <Field label="Tax rate %"><input type="number" step="0.01" value={form.tax_rate} onChange={(e)=>setForm({...form,tax_rate:Number(e.target.value)})} className="input" /></Field>
      <h4 className="font-semibold pt-2">Bill customization</h4>
      <Field label="Bill header"><input value={form.bill_header} onChange={(e)=>setForm({...form,bill_header:e.target.value})} className="input" /></Field>
      <Field label="Footer message"><textarea value={form.bill_footer} onChange={(e)=>setForm({...form,bill_footer:e.target.value})} className="input min-h-[70px]" placeholder="Thank you for dining with us!" /></Field>
      <button onClick={()=>save(form)} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save Changes</button>
      <Style />
    </div>
  );
}

function Print({ r, save }: { r: Restaurant; save: (p: Partial<Restaurant>) => void }) {
  const [paper, setPaper] = useState(r.paper_size);
  return (
    <div className="rounded-xl border border-border bg-card p-6 max-w-2xl space-y-5">
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Paper size</div>
        <div className="flex gap-2">
          {["58mm","80mm"].map((p) => <button key={p} onClick={()=>setPaper(p)} className={`h-9 px-4 rounded-full text-sm font-semibold ${paper===p?"bg-primary text-primary-foreground":"border border-input"}`}>{p}</button>)}
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Printer type</div>
        <div className="flex gap-2">
          {["USB","Bluetooth","Network"].map((p) => <button key={p} className="h-9 px-4 rounded-full text-sm font-semibold border border-input">{p}</button>)}
        </div>
      </div>
      <button onClick={()=>toast.success("Test print queued")} className="h-9 px-4 rounded-md border border-input text-sm font-semibold">🖨 Test Print</button>
      <label className="flex items-center justify-between text-sm"><span>Auto-print KOT when order sent</span><input type="checkbox" defaultChecked={r.auto_print_kot} onChange={(e)=>save({auto_print_kot:e.target.checked})} className="size-4 accent-primary" /></label>
      <label className="flex items-center justify-between text-sm"><span>Auto-print bill when table cleared</span><input type="checkbox" defaultChecked={r.auto_print_bill} onChange={(e)=>save({auto_print_bill:e.target.checked})} className="size-4 accent-primary" /></label>
      <p className="text-xs text-muted-foreground">Printer setup requires the Fudiyo desktop app</p>
      <button onClick={()=>save({paper_size:paper})} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save</button>
    </div>
  );
}

function Payment({ r, save }: { r: Restaurant; save: (p: Partial<Restaurant>) => void }) {
  const [form, setForm] = useState({ accept_cash: r.accept_cash, accept_upi: r.accept_upi, accept_card: r.accept_card, upi_id: r.upi_id ?? "", show_upi_qr: r.show_upi_qr });
  return (
    <div className="rounded-xl border border-border bg-card p-6 max-w-2xl space-y-4">
      <h4 className="font-semibold">Accepted payment methods</h4>
      <label className="flex items-center justify-between text-sm"><span>Cash</span><input type="checkbox" checked={form.accept_cash} onChange={(e)=>setForm({...form,accept_cash:e.target.checked})} className="size-4 accent-primary" /></label>
      <label className="flex items-center justify-between text-sm"><span>UPI</span><input type="checkbox" checked={form.accept_upi} onChange={(e)=>setForm({...form,accept_upi:e.target.checked})} className="size-4 accent-primary" /></label>
      <label className="flex items-center justify-between text-sm"><span>Card</span><input type="checkbox" checked={form.accept_card} onChange={(e)=>setForm({...form,accept_card:e.target.checked})} className="size-4 accent-primary" /></label>
      {form.accept_upi && <Field label="UPI ID"><input value={form.upi_id} onChange={(e)=>setForm({...form,upi_id:e.target.value})} className="input" placeholder="yourname@bank" /></Field>}
      <label className="flex items-center justify-between text-sm"><span>Show UPI QR on printed bill</span><input type="checkbox" checked={form.show_upi_qr} onChange={(e)=>setForm({...form,show_upi_qr:e.target.checked})} className="size-4 accent-primary" /></label>
      <button onClick={()=>save(form)} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save Changes</button>
      <Style />
    </div>
  );
}

function Customer({ r, save }: { r: Restaurant; save: (p: Partial<Restaurant>) => void }) {
  const endpoint = "/api/public/restaurant-status";
  return (
    <div className="rounded-xl border border-border bg-card p-6 max-w-2xl space-y-4">
      <div>
        <h3 className="font-semibold">Live data feed for Fudiyo customer app</h3>
        <p className="text-xs text-muted-foreground">Control what customers see in real time</p>
      </div>
      <label className="flex items-center justify-between text-sm font-semibold"><span>Share live data with customer app</span><input type="checkbox" checked={r.share_live_data} onChange={(e)=>save({share_live_data:e.target.checked})} className="size-5 accent-primary" /></label>
      {r.share_live_data && (
        <ul className="text-sm space-y-1 pl-2">
          <li>✓ Table occupancy count <span className="text-xs text-primary ml-1">[live]</span></li>
          <li>✓ Estimated wait time <span className="text-xs text-primary ml-1">[live]</span></li>
          <li>✓ Dish availability <span className="text-xs text-primary ml-1">[live]</span></li>
        </ul>
      )}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-1">Public API endpoint</div>
        <div className="flex gap-2">
          <input readOnly value={endpoint} className="flex-1 h-10 px-3 rounded-md border border-input bg-muted font-mono text-xs" />
          <button onClick={()=>{navigator.clipboard.writeText(endpoint);toast.success("Copied");}} className="h-10 px-3 rounded-md border border-input"><Copy className="size-4" /></button>
        </div>
      </div>
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
        💡 This data powers the live crowd meter and dish availability in the Fudiyo customer app. Customers see how busy your restaurant is before they arrive.
      </div>
    </div>
  );
}

function About({ r }: { r: Restaurant }) {
  return (
    <div className="rounded-xl border border-border bg-card p-10 max-w-md mx-auto text-center space-y-4">
      <div className="size-20 mx-auto rounded-2xl bg-primary text-primary-foreground text-3xl font-bold flex items-center justify-center">F</div>
      <div>
        <h2 className="text-lg font-semibold">Fudiyo Restaurant Management</h2>
        <p className="text-xs text-muted-foreground">Version 1.0.0</p>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 break-all">Restaurant ID: {r.id}</p>
      </div>
      <div className="flex gap-2 justify-center">
        <a href="mailto:support@fudiyo.app" className="h-9 px-3 rounded-md border border-primary text-primary text-sm font-semibold inline-flex items-center gap-1"><Mail className="size-3" /> Contact Support</a>
        <button className="h-9 px-3 rounded-md border border-input text-sm font-semibold inline-flex items-center gap-1"><FileText className="size-3" /> Privacy Policy</button>
      </div>
      <p className="text-xs text-muted-foreground">Built with ❤ for Kerala restaurants</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-3"><div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>{children}</div>;
}
function Style() {
  return <style>{`.input{width:100%;height:40px;padding:0 12px;border-radius:6px;border:1px solid var(--input);background:var(--background);font-size:14px}textarea.input{padding:8px 12px;height:auto}`}</style>;
}