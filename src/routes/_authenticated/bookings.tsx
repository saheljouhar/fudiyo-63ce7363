import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bookings")({
  component: BookingsPage,
  head: () => ({ meta: [{ title: "Bookings — Fudiyo" }] }),
});

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  table_id: string | null;
  booking_time: string;
  status: "confirmed" | "arrived" | "no_show" | "cancelled";
  source: string;
}
interface TableRow { id: string; number: string; floor: string }

function BookingsPage() {
  const [tab, setTab] = useState<"bookings"|"settings">("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [adding, setAdding] = useState<Partial<Booking> | null>(null);

  const load = async () => {
    const [{ data: b }, { data: t }] = await Promise.all([
      supabase.from("bookings").select("*").order("booking_time"),
      supabase.from("tables").select("id,number,floor"),
    ]);
    if (b) setBookings(b as unknown as Booking[]);
    if (t) setTables(t as TableRow[]);
  };
  useEffect(() => { void load(); }, []);

  const today = useMemo(() => bookings.filter((b) => b.booking_time.slice(0,10) === date), [bookings, date]);

  const seat = async (b: Booking) => {
    if (!b.table_id) return toast.error("No table assigned");
    await supabase.from("tables").update({ status: "occupied", occupied_since: new Date().toISOString() }).eq("id", b.table_id);
    await supabase.from("bookings").update({ status: "arrived" }).eq("id", b.id);
    toast.success("Customer seated");
    void load();
  };

  const subtitle = today.length === 0 ? "All clear today" : `${today.length} bookings today`;

  return (
    <main className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Bookings" subtitle={subtitle} actions={
        <button onClick={() => setAdding({})} className="h-9 px-4 inline-flex items-center gap-2 rounded-md bg-cta text-cta-foreground text-sm font-semibold hover:bg-cta-hover">
          <Plus className="size-4" /> Add Booking
        </button>
      } />
      <div className="border-b border-border mb-6 flex gap-1">
        {(["bookings","settings"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize ${tab===t?"border-primary text-primary":"border-transparent text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      {tab === "bookings" ? (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setDate(new Date(new Date(date).getTime() - 86400000).toISOString().slice(0,10))} className="size-9 rounded-md border border-input hover:bg-muted inline-flex items-center justify-center"><ChevronLeft className="size-4" /></button>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card text-sm" />
            <button onClick={() => setDate(new Date(new Date(date).getTime() + 86400000).toISOString().slice(0,10))} className="size-9 rounded-md border border-input hover:bg-muted inline-flex items-center justify-center"><ChevronRight className="size-4" /></button>
            <button onClick={()=>setDate(new Date().toISOString().slice(0,10))} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Today</button>
            <button onClick={()=>setDate(new Date(Date.now()+86400000).toISOString().slice(0,10))} className="h-9 px-3 rounded-md border border-input text-sm">Tomorrow</button>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary mb-4">📱 Bookings from the Fudiyo customer app appear here automatically</div>
          {today.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Calendar className="size-12 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
              <p className="text-base font-semibold">Your schedule is clear</p>
              <p className="text-sm text-muted-foreground mb-4">No bookings for this day</p>
              <button onClick={() => setAdding({})} className="h-9 px-4 rounded-md bg-cta text-cta-foreground text-sm font-semibold">+ Add Manual Booking</button>
            </div>
          ) : (
            <div className="space-y-2">
              {today.map((b) => {
                const t = tables.find((x) => x.id === b.table_id);
                return (
                  <div key={b.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[140px]">
                      <div className="font-semibold">{b.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{b.customer_phone ?? "—"} · 👥 {b.party_size}</div>
                    </div>
                    <div className="text-sm">
                      {t && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-semibold mr-2">T{t.number}</span>}
                      {new Date(b.booking_time).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                      {t && <div className="text-xs text-muted-foreground">{t.floor}</div>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${b.status==="confirmed"?"bg-primary/15 text-primary":b.status==="arrived"?"bg-green-500/15 text-green-600":b.status==="no_show"?"bg-red-500/15 text-red-600":"bg-gray-500/15 text-gray-600"}`}>{b.status}</span>
                    <div className="flex gap-1">
                      {b.status === "confirmed" && <button onClick={()=>seat(b)} className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-semibold">Seat Now</button>}
                      <button onClick={()=>supabase.from("bookings").update({status:"cancelled"}).eq("id",b.id).then(load)} className="h-8 px-3 rounded border border-input text-xs">Cancel</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <BookingSettings />
      )}
      {adding && <BookingModal initial={adding} tables={tables} date={date} onClose={() => setAdding(null)} onSaved={() => { setAdding(null); load(); }} />}
    </main>
  );
}

function BookingSettings() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 max-w-xl space-y-4">
      <div><label className="text-xs font-semibold text-muted-foreground">Booking window (days ahead)</label><input defaultValue={30} type="number" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" /> Deposit required</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> Auto-confirm bookings</label>
      <button className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save</button>
    </div>
  );
}

function BookingModal({ initial, tables, date, onClose, onSaved }: { initial: Partial<Booking>; tables: TableRow[]; date: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    customer_name: initial.customer_name ?? "",
    customer_phone: initial.customer_phone ?? "",
    party_size: initial.party_size ?? 2,
    table_id: initial.table_id ?? tables[0]?.id ?? "",
    booking_time: initial.booking_time ?? `${date}T19:00`,
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!form.customer_name.trim()) return toast.error("Name required");
    setSaving(true);
    const { data: r } = await supabase.from("restaurants").select("id").limit(1).maybeSingle();
    const { error } = await supabase.from("bookings").insert({ ...form, booking_time: new Date(form.booking_time).toISOString(), restaurant_id: r?.id, source: "manual" });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Booking saved"); onSaved(); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Add Booking</h2>
        <div className="space-y-3 text-sm">
          <input placeholder="Customer name *" value={form.customer_name} onChange={(e)=>setForm({...form,customer_name:e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background" />
          <input placeholder="Phone" value={form.customer_phone} onChange={(e)=>setForm({...form,customer_phone:e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background" />
          <select value={form.table_id} onChange={(e)=>setForm({...form,table_id:e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background">
            {tables.map((t)=><option key={t.id} value={t.id}>Table {t.number} ({t.floor})</option>)}
          </select>
          <input type="datetime-local" value={form.booking_time} onChange={(e)=>setForm({...form,booking_time:e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background" />
          <input type="number" min={1} value={form.party_size} onChange={(e)=>setForm({...form,party_size:Number(e.target.value)})} className="w-full h-10 px-3 rounded-md border border-input bg-background" />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 h-10 rounded-md border border-input text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold">{saving?"Saving...":"Save Booking"}</button>
        </div>
      </div>
    </div>
  );
}