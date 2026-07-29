import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer, Plus, QrCode, RotateCcw, CalendarPlus, Armchair, Bell, Truck, ShoppingBag, X, Download, Copy, Check, ChevronLeft, ChevronRight, Calendar, Pencil, ArrowUp, ArrowDown, Timer, Merge, Users, LayoutGrid, LayoutTemplate, Settings as SettingsIcon, Sparkles, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { formatINR, elapsedMinutes } from "@/lib/format";
import { toast } from "sonner";

type TableStatus = "available" | "occupied" | "bill_requested" | "reserved" | "cleaning";
interface TableRow {
  id: string;
  number: string;
  floor: string;
  seats: number;
  status: TableStatus;
  occupied_since: string | null;
}
interface OrderTotal { table_id: string | null; total: number }

export const Route = createFileRoute("/_authenticated/tables")({
  component: TablesPage,
  head: () => ({ meta: [{ title: "Tables — Fudiyo" }] }),
});

function TablesPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [activeFloor, setActiveFloor] = useState<string>("all");
  const [section, setSection] = useState<"tables" | "delivery">("tables");
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "delivery" | "takeaway">("all");
  const [, force] = useState(0);
  const [bookOpen, setBookOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [datePopOpen, setDatePopOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState<string | null>(null);
  const [turnOpen, setTurnOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [layoutView, setLayoutView] = useState<"grid" | "layout">("grid");
  const [tableMenu, setTableMenu] = useState<TableRow | null>(null);
  const [editingTable, setEditingTable] = useState<TableRow | null>(null);

  // ticking for elapsed time
  useEffect(() => {
    const i = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("tables").select("*").order("number");
      if (data) {
        const sorted = [...(data as TableRow[])].sort((a, b) => {
          const an = parseInt(a.number, 10);
          const bn = parseInt(b.number, 10);
          if (!isNaN(an) && !isNaN(bn)) return an - bn;
          return a.number.localeCompare(b.number);
        });
        setTables(sorted);
      }
      const { data: o } = await supabase
        .from("orders")
        .select("table_id,total,status")
        .in("status", ["pending", "cooking", "ready"]);
      if (o) {
        const map: Record<string, number> = {};
        for (const row of o as OrderTotal[]) {
          if (!row.table_id) continue;
          map[row.table_id] = (map[row.table_id] ?? 0) + Number(row.total ?? 0);
        }
        setTotals(map);
      }
    };
    load();
    const ch = supabase
      .channel("tables-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const floors = useMemo(() => {
    const set = new Set(tables.map((t) => t.floor));
    return Array.from(set);
  }, [tables]);

  const visible = activeFloor === "all" ? tables : tables.filter((t) => t.floor === activeFloor);

  const counts = useMemo(() => {
    let avail = 0, occ = 0, bill = 0;
    for (const t of tables) {
      if (t.status === "available") avail++;
      else if (t.status === "occupied") occ++;
      else if (t.status === "bill_requested") bill++;
    }
    return { total: tables.length, avail, occ, bill };
  }, [tables]);

  const takeOrder = async (t: TableRow) => {
    if (t.status === "available") {
      await supabase
        .from("tables")
        .update({ status: "occupied", occupied_since: new Date().toISOString() })
        .eq("id", t.id);
    }
    navigate({ to: "/orders", search: { table: t.id } as never });
  };

  const doResetAll = async () => {
    const { error } = await supabase
      .from("tables")
      .update({ status: "available", occupied_since: null })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast.error(error.message);
    else toast.success("All tables reset");
    setResetOpen(false);
  };

  return (
    <main className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Table Management"
        subtitle="Fudiyo Kitchen"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setBookOpen(true)}><CalendarPlus /> Book</Button>
            <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}><RotateCcw /> Reset All</Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}><Plus /> Add</Button>
            <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}><QrCode /> QR Codes</Button>
            <Button variant="outline" size="sm" onClick={() => setTurnOpen(true)}><Timer /> Turn Times</Button>
            <Button variant="outline" size="sm" onClick={() => setMergeOpen(true)}><Merge /> Merge</Button>
            <Button variant="outline" size="sm" onClick={() => setWaitlistOpen(true)}><Users /> Waitlist</Button>
          </>
        }
      />

      {bookOpen && <BookWizard tables={tables} onClose={() => setBookOpen(false)} />}
      {resetOpen && <ResetConfirm onCancel={() => setResetOpen(false)} onConfirm={doResetAll} />}
      {addOpen && <AddTableModal floors={floors} onClose={() => setAddOpen(false)} />}
      {qrOpen && <QrCodesModal tables={tables} onClose={() => setQrOpen(false)} />}
      {editingFloor && <EditFloorModal floor={editingFloor} floors={floors} onClose={() => setEditingFloor(null)} />}
      {turnOpen && <PlaceholderModal title="Turn Times" body="Track how long parties stay per table. Coming soon." onClose={() => setTurnOpen(false)} />}
      {mergeOpen && <PlaceholderModal title="Merge Tables" body="Combine two or more tables into one check. Coming soon." onClose={() => setMergeOpen(false)} />}
      {waitlistOpen && <PlaceholderModal title="Waitlist" body="Manage walk-in queues and estimated wait times. Coming soon." onClose={() => setWaitlistOpen(false)} />}
      {tableMenu && (
        <TableActionModal
          table={tableMenu}
          onClose={() => setTableMenu(null)}
          onTakeOrder={() => { const t = tableMenu; setTableMenu(null); takeOrder(t); }}
          onEdit={() => { setEditingTable(tableMenu); setTableMenu(null); }}
          onStatus={async (s) => {
            await supabase.from("tables").update({ status: s, occupied_since: null } as never).eq("id", tableMenu.id);
            toast.success(`Marked ${s === "cleaning" ? "for cleaning" : "out of service"}`);
            setTableMenu(null);
          }}
          onBook={() => { setTableMenu(null); setBookOpen(true); }}
        />
      )}
      {editingTable && <EditTableModal table={editingTable} floors={floors} onClose={() => setEditingTable(null)} />}

      {/* Date navigation */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setSelectedDate((d) => new Date(d.getTime() - 86400000))}
          className="size-9 rounded-md border border-[#E2E8F0] bg-white inline-flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB]">
          <ChevronLeft className="size-4" />
        </button>
        <div className="relative">
          <button onClick={() => setDatePopOpen((v) => !v)}
            className={`h-9 px-4 inline-flex items-center gap-2 rounded-full text-[13px] font-semibold ${isToday(selectedDate) ? "bg-[#0D9488] text-white" : "bg-white border border-[#E2E8F0] text-[#374151]"}`}>
            <Calendar className="size-4" />
            {isToday(selectedDate) ? "Today" : selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </button>
          {datePopOpen && <DatePopover value={selectedDate} onChange={(d) => { setSelectedDate(d); setDatePopOpen(false); }} onClose={() => setDatePopOpen(false)} />}
        </div>
        <button onClick={() => setSelectedDate((d) => new Date(d.getTime() + 86400000))}
          className="size-9 rounded-md border border-[#E2E8F0] bg-white inline-flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB]">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Section tabs (toggle, underline) */}
      <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] mb-5">
        <div className="flex items-center gap-1">
          <SectionTab active={section === "tables"} onClick={() => setSection("tables")}
            label={<span className="inline-flex items-center gap-2">🪑 Table Management</span>} />
          <SectionTab active={section === "delivery"} onClick={() => setSection("delivery")}
            label={<span className="inline-flex items-center gap-2">🚗 Delivery / Takeaway</span>} />
        </div>
        <div className="inline-flex border border-[#E2E8F0] rounded-lg overflow-hidden mb-2">
          <button onClick={() => setLayoutView("grid")} className={`size-9 inline-flex items-center justify-center ${layoutView === "grid" ? "bg-[#0D9488] text-white" : "bg-white text-[#6B7280]"}`} aria-label="Grid view"><LayoutGrid className="size-4" /></button>
          <button onClick={() => setLayoutView("layout")} className={`size-9 inline-flex items-center justify-center ${layoutView === "layout" ? "bg-[#0D9488] text-white" : "bg-white text-[#6B7280]"}`} aria-label="Layout view"><LayoutTemplate className="size-4" /></button>
        </div>
      </div>

      {section === "tables" ? (
        <>
          {/* Stats bar */}
          <div className="rounded-xl border bg-card shadow-card px-5 py-4 mb-4 flex flex-wrap items-center gap-6 text-sm">
            <Stat label="Total" value={counts.total} dot="bg-foreground/40" />
            <Stat label="Available" value={counts.avail} dot="bg-table-available" />
            <Stat label="Occupied" value={counts.occ} dot="bg-table-occupied" />
            <Stat label="Bill Requested" value={counts.bill} dot="bg-table-bill" />
          </div>

          {/* Floor tabs */}
          {activeFloor !== "all" && (
            <div className="flex items-center justify-between mb-3">
              <div className="text-[14px] font-semibold text-[#111827]">
                {activeFloor} · <span className="text-[#64748B] font-normal">{tables.filter((t) => t.floor === activeFloor).length} tables</span>
              </div>
              <button onClick={() => setEditingFloor(activeFloor)}
                className="size-8 rounded-md hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#6B7280]" title="Edit floor">
                <Pencil className="size-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <FloorTab active={activeFloor === "all"} onClick={() => setActiveFloor("all")} label="All Floors" count={tables.length} />
            {floors.map((f) => (
              <FloorTab
                key={f}
                active={activeFloor === f}
                onClick={() => setActiveFloor(f)}
                label={f}
                count={tables.filter((t) => t.floor === f).length}
              />
            ))}
            <button className="px-3 py-1.5 text-xs rounded-full border border-dashed text-muted-foreground hover:bg-accent">
              + Floor
            </button>
          </div>

          {/* Grid / Layout */}
          {layoutView === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
              {visible.map((t) => (
                <TableCard
                  key={t.id}
                  table={t}
                  total={totals[t.id] ?? 0}
                  onTake={() => takeOrder(t)}
                  onAdd={() => navigate({ to: "/orders", search: { table: t.id } as never })}
                  onBill={() => navigate({ to: "/history", search: { table: t.id } as never })}
                  onGear={() => setTableMenu(t)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white p-16 text-center">
              <LayoutTemplate className="size-12 mx-auto text-[#CBD5E1] mb-3" strokeWidth={1.5} />
              <p className="text-[15px] font-semibold text-[#111827]">Floor Layout Editor</p>
              <p className="text-[13px] text-[#6B7280] mt-1">Drag-and-drop layout view is coming soon.</p>
            </div>
          )}
        </>
      ) : (
        <DeliverySection filter={deliveryFilter} setFilter={setDeliveryFilter} />
      )}
    </main>
  );
}

function SectionTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-11 px-4 text-sm font-semibold transition ${
        active ? "text-[#0D9488]" : "text-[#64748B] hover:text-[#111827]"
      }`}
    >
      {label}
      {active && <span className="absolute left-0 right-0 -bottom-px h-[3px] bg-[#0D9488] rounded-t" />}
    </button>
  );
}

function DeliverySection({ filter, setFilter }: { filter: "all" | "delivery" | "takeaway"; setFilter: (v: "all" | "delivery" | "takeaway") => void }) {
  return (
    <div>
      <div className="rounded-xl border bg-card shadow-card px-5 py-4 mb-4 flex flex-wrap items-center gap-6 text-sm">
        <Stat label="Total" value={0} dot="bg-foreground/40" />
        <Stat label="Preparing" value={0} dot="bg-[#F59E0B]" />
        <Stat label="Ready" value={0} dot="bg-[#16A34A]" />
      </div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <DPill active={filter === "all"} onClick={() => setFilter("all")} label="All" count={0} />
        <DPill active={filter === "delivery"} onClick={() => setFilter("delivery")} label={<span className="inline-flex items-center gap-1"><Truck className="size-3.5" /> Delivery</span>} count={0} />
        <DPill active={filter === "takeaway"} onClick={() => setFilter("takeaway")} label={<span className="inline-flex items-center gap-1"><ShoppingBag className="size-3.5" /> Takeaway</span>} count={0} />
      </div>
      <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-card py-16 text-center">
        <Bell className="size-10 mx-auto text-muted-foreground mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-foreground">No active delivery or takeaway orders</p>
        <p className="text-xs text-muted-foreground mt-1">New orders will appear here when they come in.</p>
      </div>
    </div>
  );
}

function DPill({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: React.ReactNode; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
        active ? "bg-[#0D9488] text-white" : "bg-card border border-border text-foreground hover:bg-accent"
      }`}
    >
      {label} <span className="opacity-80 ml-1">{count}</span>
    </button>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block size-2.5 rounded-full ${dot}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function FloorTab({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card border border-border text-foreground hover:bg-accent"
      }`}
    >
      {label} <span className="opacity-70 ml-1">{count}</span>
    </button>
  );
}

function TableCard({
  table, total, onTake, onAdd, onBill, onGear,
}: {
  table: TableRow; total: number;
  onTake: () => void; onAdd: () => void; onBill: () => void; onGear: () => void;
}) {
  const dot =
    table.status === "available" ? "bg-table-available" :
    table.status === "occupied" ? "bg-table-occupied" :
    table.status === "bill_requested" ? "bg-table-bill" :
    table.status === "cleaning" ? "bg-[#F59E0B]" :
    (table.status as string) === "out_of_service" ? "bg-[#9CA3AF]" :
    "bg-muted-foreground";

  const border =
    table.status === "occupied" ? "border-dashed border-table-bill" :
    table.status === "bill_requested" ? "border-table-bill" :
    table.status === "cleaning" ? "border-[#F59E0B]" :
    (table.status as string) === "out_of_service" ? "border-[#9CA3AF] opacity-70" :
    "border-border";

  return (
    <div className={`relative rounded-xl border ${border} bg-card shadow-card p-3 flex flex-col`}>
      <button onClick={onGear} aria-label="Table options" className="absolute top-1.5 right-1.5 size-7 rounded-md inline-flex items-center justify-center text-[#6B7280] hover:bg-[#F1F5F9] z-10">
        <SettingsIcon className="size-3.5" />
      </button>
      {/* header row */}
      <div className="flex items-start justify-between mb-1 gap-2 pr-7">
        <span className="font-bold text-foreground">{table.number}</span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {table.status === "occupied" && table.occupied_since && (
            <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-[#F59E0B]/15 text-[#D97706]">
              {elapsedMinutes(table.occupied_since)}
            </span>
          )}
          {table.status === "occupied" ? (
            <span className="text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-table-occupied/10 text-table-occupied">
              Occupied
            </span>
          ) : table.status === "bill_requested" ? (
            <span className="text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-table-bill/15 text-table-bill">
              Bill Requested
            </span>
          ) : table.status === "cleaning" ? (
            <span className="text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-[#F59E0B]/15 text-[#D97706]">Cleaning</span>
          ) : (table.status as string) === "out_of_service" ? (
            <span className="text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-[#9CA3AF]/20 text-[#4B5563]">Out of Service</span>
          ) : (
            <span className={`size-2.5 rounded-full ${dot}`} />
          )}
        </div>
      </div>

      {/* center area */}
      <div className="flex flex-col items-center justify-center py-2 min-h-[72px]">
        {table.status === "available" || table.status === "reserved" || table.status === "cleaning" ? (
          <Armchair className="size-8 text-muted-foreground/30" strokeWidth={1.5} />
        ) : (
          <>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</div>
            <div className="text-lg font-bold text-table-bill tabular-nums">{formatINR(total)}</div>
            {table.occupied_since && (
              <div className="text-[10px] text-muted-foreground mt-0.5">{elapsedMinutes(table.occupied_since)}</div>
            )}
          </>
        )}
      </div>

      <div className="text-[10px] text-muted-foreground text-center mb-2">{table.seats} Seats</div>

      {/* actions */}
      {table.status === "available" && (
        <button
          onClick={onTake}
          className="w-full text-xs font-semibold py-2 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white transition-colors"
        >
          Take Order
        </button>
      )}
      {table.status === "occupied" && (
        <div className="grid grid-cols-3 gap-1">
          <button title="Print KOT" className="flex items-center justify-center text-xs py-1.5 rounded-md border hover:bg-accent">
            <Printer className="size-3.5" />
          </button>
          <button onClick={onAdd} className="flex items-center justify-center gap-0.5 text-xs py-1.5 rounded-md border hover:bg-accent">
            <Plus className="size-3" /> Add
          </button>
          <button onClick={onBill} className="text-xs font-semibold py-1.5 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Bill
          </button>
        </div>
      )}
      {table.status === "bill_requested" && (
        <button
          onClick={onBill}
          className="w-full text-xs font-semibold py-2 rounded-md bg-cta text-cta-foreground hover:bg-cta-hover"
        >
          Generate Bill
        </button>
      )}
    </div>
  );
}
/* ============== Modals ============== */

function ModalShell({ children, onClose, width = "max-w-lg" }: { children: React.ReactNode; onClose: () => void; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        {children}
      </div>
    </div>
  );
}

function ResetConfirm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <ModalShell onClose={onCancel} width="max-w-md">
      <div className="p-6">
        <h2 className="text-lg font-bold text-[#111827] mb-1">Reset all tables?</h2>
        <p className="text-sm text-[#64748B] mb-6">This will clear all occupied table states. This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="h-10 px-4 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="h-10 px-4 rounded-md bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold">Reset All</button>
        </div>
      </div>
    </ModalShell>
  );
}

function isToday(d: Date) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function DatePopover({ value, onChange, onClose }: { value: Date; onChange: (d: Date) => void; onClose: () => void }) {
  const [from, setFrom] = useState(value.toISOString().slice(0, 10));
  const [to, setTo] = useState(value.toISOString().slice(0, 10));
  const setPreset = (days: number) => { const d = new Date(); d.setDate(d.getDate() - (days - 1)); onChange(d); };
  const pills: { k: string; days: number; label: string; active: boolean }[] = [
    { k: "today", days: 1, label: "Today", active: isToday(value) },
    { k: "7", days: 7, label: "7 Days", active: false },
    { k: "30", days: 30, label: "30 Days", active: false },
    { k: "90", days: 90, label: "90 Days", active: false },
  ];
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute left-0 mt-2 w-[340px] bg-white rounded-xl shadow-lg border border-[#E2E8F0] z-40 p-4">
        <div className="text-[14px] font-bold text-[#111827]">Select Time Period</div>
        <div className="text-[12px] text-[#64748B] mb-3">Choose a date range for your data</div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {pills.map((p) => (
            <button key={p.k} onClick={() => { if (p.k === "today") onChange(new Date()); else setPreset(p.days); }}
              className={`h-11 rounded-xl border text-[13px] font-semibold inline-flex items-center justify-center gap-2 ${p.active ? "border-[#0D9488] bg-[#0D9488] text-white" : "border-[#E2E8F0] bg-white text-[#374151] hover:bg-[#F8FAFC]"}`}>
              <Calendar className="size-4" /> {p.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] font-semibold uppercase text-[#94A3B8] mb-2">Custom Range</div>
        <div className="flex items-center gap-2 mb-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 h-10 rounded-md border border-[#E2E8F0] px-2 text-[13px]" />
          <span className="text-[#94A3B8]">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 h-10 rounded-md border border-[#E2E8F0] px-2 text-[13px]" />
        </div>
        <button onClick={() => { const d = new Date(from); if (!isNaN(d.getTime())) onChange(d); }}
          className="w-full h-11 rounded-md bg-[#0D9488] hover:bg-[#0F766E] text-white text-[13px] font-semibold">Apply Custom Range</button>
      </div>
    </>
  );
}

function EditFloorModal({ floor, floors, onClose }: { floor: string; floors: string[]; onClose: () => void }) {
  const [tab, setTab] = useState<"details" | "order">("details");
  const [name, setName] = useState(floor);
  const [desc, setDesc] = useState("");
  const [area, setArea] = useState<"none" | "standard" | "premium">("none");
  const [order, setOrder] = useState<string[]>(floors);

  const move = (i: number, dir: -1 | 1) => {
    const next = [...order];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  return (
    <ModalShell onClose={onClose} width="max-w-lg">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h2 className="text-base font-bold">Edit Floor</h2>
        <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
      </div>
      <div className="flex border-b">
        <button onClick={() => setTab("details")}
          className={`flex-1 h-11 text-[13px] font-semibold ${tab === "details" ? "text-[#0D9488] border-b-2 border-[#0D9488]" : "text-[#64748B]"}`}>
          Details
        </button>
        <button onClick={() => setTab("order")}
          className={`flex-1 h-11 text-[13px] font-semibold ${tab === "order" ? "text-[#0D9488] border-b-2 border-[#0D9488]" : "text-[#64748B]"}`}>
          Floor Order
        </button>
      </div>
      <div className="p-6 space-y-4">
        {tab === "details" ? (
          <>
            <div>
              <label className="text-[12px] font-semibold text-[#64748B]">Floor Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full h-10 rounded-md border border-[#E2E8F0] px-3 text-[14px]" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#64748B]">Description</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-[14px] resize-none" />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#64748B]">Area Charge</label>
              <select value={area} onChange={(e) => setArea(e.target.value as "none" | "standard" | "premium")}
                className="mt-1 w-full h-10 rounded-md border border-[#E2E8F0] px-3 text-[14px] bg-white">
                <option value="none">None</option><option value="standard">Standard</option><option value="premium">Premium</option>
              </select>
            </div>
            <button onClick={() => { toast.success("Floor updated"); onClose(); }}
              className="w-full h-11 rounded-md bg-[#0D9488] hover:bg-[#0F766E] text-white text-[14px] font-semibold">
              Update Floor
            </button>
          </>
        ) : (
          <>
            <p className="text-[13px] text-[#64748B]">Drag floors up or down to set display order on dashboard and tables page.</p>
            <ul className="space-y-2">
              {order.map((f, i) => (
                <li key={f} className="flex items-center gap-2 h-11 px-3 rounded-md border border-[#E2E8F0] bg-white">
                  <span className="flex-1 text-[14px] font-medium">{f}</span>
                  <button onClick={() => move(i, -1)} className="size-8 rounded hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#64748B]"><ArrowUp className="size-4" /></button>
                  <button onClick={() => move(i, 1)} className="size-8 rounded hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#64748B]"><ArrowDown className="size-4" /></button>
                </li>
              ))}
            </ul>
            <button onClick={() => { toast.success("Order saved"); onClose(); }}
              className="w-full h-11 rounded-md bg-[#0D9488] hover:bg-[#0F766E] text-white text-[14px] font-semibold">
              Save Order
            </button>
          </>
        )}
      </div>
    </ModalShell>
  );
}

function BookWizard({ tables, onClose }: { tables: TableRow[]; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [party, setParty] = useState(2);
  const [tableId, setTableId] = useState<string | null>(null);
  const slots: string[] = [];
  for (let h = 10; h < 24; h++) for (const m of [0, 30]) slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);

  const confirm = async () => {
    if (!tableId || !slot) return;
    const { error } = await supabase.from("bookings").insert({
      table_id: tableId, guest_name: name, phone, party_size: party,
      booking_time: `${date}T${slot}:00`, status: "confirmed",
    } as never);
    if (error) toast.error(error.message); else { toast.success("Booking confirmed"); onClose(); }
  };

  const StepDot = ({ n, label }: { n: number; label: string }) => (
    <div className="flex items-center gap-2">
      <div className={`size-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${step >= n ? "bg-[#0D9488] text-white" : "bg-gray-200 text-gray-500"}`}>{n}</div>
      <span className={`text-xs font-semibold ${step >= n ? "text-[#0D9488]" : "text-gray-500"}`}>{label}</span>
    </div>
  );

  return (
    <ModalShell onClose={onClose} width="max-w-2xl">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h2 className="text-base font-bold">New Booking</h2>
        <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
      </div>
      <div className="px-6 py-4 flex items-center gap-4 border-b">
        <StepDot n={1} label="When" /><span className="text-gray-300">›</span>
        <StepDot n={2} label="Who" /><span className="text-gray-300">›</span>
        <StepDot n={3} label="Where" />
      </div>
      <div className="p-6">
        {step === 1 && (
          <>
            <label className="text-xs font-bold text-[#64748B] uppercase">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full h-10 px-3 rounded-md border mt-1 mb-4 text-sm" />
            <label className="text-xs font-bold text-[#64748B] uppercase">Time Slot</label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {slots.map((s) => (
                <button key={s} onClick={() => setSlot(s)} className={`h-10 text-sm font-semibold rounded-md border ${slot === s ? "bg-[#0D9488] border-[#0D9488] text-white" : "bg-white border-gray-200 hover:border-[#0D9488]"}`}>{s}</button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <div><label className="text-xs font-bold text-[#64748B] uppercase">Guest Name</label><input value={name} onChange={(e) => setName(e.target.value)} className="block w-full h-10 px-3 rounded-md border mt-1 text-sm" /></div>
            <div><label className="text-xs font-bold text-[#64748B] uppercase">Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="block w-full h-10 px-3 rounded-md border mt-1 text-sm" /></div>
            <div><label className="text-xs font-bold text-[#64748B] uppercase">Party Size</label><input type="number" min={1} value={party} onChange={(e) => setParty(Number(e.target.value))} className="block w-full h-10 px-3 rounded-md border mt-1 text-sm" /></div>
          </div>
        )}
        {step === 3 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {tables.filter((t) => t.status === "available" && t.seats >= party).map((t) => (
              <button key={t.id} onClick={() => setTableId(t.id)} className={`p-3 rounded-lg border text-center ${tableId === t.id ? "border-[#0D9488] bg-[#0D9488]/5" : "border-gray-200"}`}>
                <div className="font-bold">{t.number}</div>
                <div className="text-[11px] text-gray-500">{t.floor} · {t.seats} seats</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-6 py-4 border-t flex justify-between bg-gray-50">
        <button onClick={() => step === 1 ? onClose() : setStep(step - 1)} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">{step === 1 ? "Cancel" : "‹ Back"}</button>
        {step < 3 ? (
          <button disabled={(step === 1 && !slot) || (step === 2 && !name)} onClick={() => setStep(step + 1)} className="h-10 px-5 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-semibold disabled:opacity-50">Next ›</button>
        ) : (
          <button disabled={!tableId} onClick={confirm} className="h-10 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold disabled:opacity-50">Confirm Booking ✓</button>
        )}
      </div>
    </ModalShell>
  );
}

function AddTableModal({ floors, onClose }: { floors: string[]; onClose: () => void }) {
  const [tab, setTab] = useState<"single" | "bulk">("single");
  const [floor, setFloor] = useState(floors[0] ?? "Ground");
  const [name, setName] = useState("");
  const [cap, setCap] = useState(4);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(5);
  const [seats, setSeats] = useState(4);

  const restaurantId = async () => {
    const { data } = await supabase.from("restaurants").select("id").limit(1).maybeSingle();
    return data?.id;
  };

  const addOne = async () => {
    const rid = await restaurantId();
    if (!rid) return toast.error("No restaurant configured");
    const { error } = await supabase.from("tables").insert({ number: name, floor, seats: cap, status: "available", restaurant_id: rid } as never);
    if (error) toast.error(error.message); else { toast.success("Table added"); onClose(); }
  };
  const addBulk = async () => {
    const rid = await restaurantId();
    if (!rid) return toast.error("No restaurant configured");
    const rows = [];
    for (let i = from; i <= to; i++) rows.push({ number: String(i), floor, seats, status: "available", restaurant_id: rid });
    const { error } = await supabase.from("tables").insert(rows as never);
    if (error) toast.error(error.message); else { toast.success(`Created ${rows.length} tables`); onClose(); }
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h2 className="text-base font-bold">Add Tables</h2>
        <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
      </div>
      <div className="flex border-b">
        {(["single", "bulk"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 h-11 text-sm font-semibold ${tab === t ? "border-b-2 border-[#0D9488] text-[#0D9488]" : "text-gray-500"}`}>
            {t === "single" ? "Single Table" : "Bulk Add"}
          </button>
        ))}
      </div>
      <div className="p-6 space-y-3">
        <div><label className="text-xs font-bold uppercase text-gray-500">Floor</label>
          <input value={floor} onChange={(e) => setFloor(e.target.value)} className="block w-full h-10 px-3 rounded-md border mt-1 text-sm" />
        </div>
        {tab === "single" ? (
          <>
            <div><label className="text-xs font-bold uppercase text-gray-500">Table Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. T1, VIP 1" className="block w-full h-10 px-3 rounded-md border mt-1 text-sm" /></div>
            <div><label className="text-xs font-bold uppercase text-gray-500">Capacity</label>
              <input type="number" value={cap} onChange={(e) => setCap(Number(e.target.value))} className="block w-full h-10 px-3 rounded-md border mt-1 text-sm" /></div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-bold uppercase text-gray-500">From #</label><input type="number" value={from} onChange={(e) => setFrom(Number(e.target.value))} className="w-full h-10 px-3 rounded-md border mt-1 text-sm" /></div>
            <div><label className="text-xs font-bold uppercase text-gray-500">To #</label><input type="number" value={to} onChange={(e) => setTo(Number(e.target.value))} className="w-full h-10 px-3 rounded-md border mt-1 text-sm" /></div>
            <div><label className="text-xs font-bold uppercase text-gray-500">Seats</label><input type="number" value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="w-full h-10 px-3 rounded-md border mt-1 text-sm" /></div>
          </div>
        )}
      </div>
      <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50">
        <button onClick={onClose} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">Cancel</button>
        {tab === "single" ? (
          <button disabled={!name.trim()} onClick={addOne} className="h-10 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold disabled:opacity-50">Add Table</button>
        ) : (
          <button onClick={addBulk} className="h-10 px-5 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold">Create Tables</button>
        )}
      </div>
    </ModalShell>
  );
}

function QrCodesModal({ tables, onClose }: { tables: TableRow[]; onClose: () => void }) {
  const [custom, setCustom] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const urlFor = (t: TableRow) => `${typeof window !== "undefined" ? window.location.origin : ""}/menu?t=${encodeURIComponent(t.number)}`;
  const qrFor = (url: string) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  return (
    <ModalShell onClose={onClose} width="max-w-5xl">
      <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
        <h2 className="text-base font-bold">Table QR Codes</h2>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-1.5">
            <Download className="size-4" /> Download All ({tables.length})
          </button>
          <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
        </div>
      </div>
      <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-2">
        <span className="text-xs font-bold uppercase text-gray-500">Generate Custom QR:</span>
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="https://..." className="flex-1 h-9 px-3 rounded-md border text-sm" />
        <button disabled={!custom} onClick={() => window.open(qrFor(custom), "_blank")} className="h-9 px-3 rounded-md bg-[#0D9488] text-white text-sm font-semibold disabled:opacity-50">Generate</button>
      </div>
      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((t) => {
          const url = urlFor(t);
          return (
            <div key={t.id} className="rounded-xl border bg-white p-4 text-center">
              <img src={qrFor(url)} alt={t.number} className="mx-auto rounded border" />
              <div className="mt-2 font-bold">{t.number}</div>
              <div className="text-[11px] text-gray-500 mb-2">{t.floor}</div>
              <div className="flex gap-1.5">
                <a href={qrFor(url)} download={`table-${t.number}.png`} className="flex-1 h-8 rounded border text-xs font-semibold inline-flex items-center justify-center gap-1 hover:bg-gray-50"><Download className="size-3" /> Download</a>
                <button onClick={() => { navigator.clipboard.writeText(url); setCopied(t.id); setTimeout(() => setCopied(null), 1500); }}
                  className="flex-1 h-8 rounded border text-xs font-semibold inline-flex items-center justify-center gap-1 hover:bg-gray-50">
                  {copied === t.id ? <><Check className="size-3 text-[#16A34A]" /> Copied</> : <><Copy className="size-3" /> Copy URL</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}

function PlaceholderModal({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <h2 className="text-[15px] font-bold">{title}</h2>
        <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
      </div>
      <div className="p-6 text-center">
        <Sparkles className="size-10 mx-auto text-[#0D9488] mb-3" strokeWidth={1.5} />
        <p className="text-[14px] text-[#374151]">{body}</p>
        <button onClick={onClose} className="mt-5 h-9 px-5 rounded-md bg-[#0D9488] text-white text-[13px] font-semibold">Close</button>
      </div>
    </ModalShell>
  );
}

function TableActionModal({
  table, onClose, onTakeOrder, onEdit, onStatus, onBook,
}: {
  table: TableRow; onClose: () => void; onTakeOrder: () => void; onEdit: () => void;
  onStatus: (s: "cleaning" | "out_of_service") => void; onBook: () => void;
}) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <div>
          <div className="text-[15px] font-bold text-[#111827]">Table {table.number}</div>
          <div className="text-[12px] text-[#6B7280] capitalize">{table.status.replace("_", " ")} · {table.seats} seats</div>
        </div>
        <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
      </div>
      <div className="p-5 space-y-4">
        <button onClick={onTakeOrder} className="w-full h-11 rounded-lg bg-[#0D9488] hover:bg-[#0B7F75] text-white text-[13px] font-bold">Take Order</button>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2">Parties & Splits</div>
          <button onClick={onTakeOrder} className="w-full h-10 rounded-md border border-[#E5E7EB] hover:border-[#0D9488] text-[13px] font-semibold text-left px-3">
            + New Party (B) <span className="text-[11px] text-[#6B7280] font-normal">— independent check</span>
          </button>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2">Manage</div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={onBook} className="h-10 rounded-md border border-[#E5E7EB] hover:border-[#0D9488] text-[12px] font-semibold">Book</button>
            <button onClick={onEdit} className="h-10 rounded-md border border-[#E5E7EB] hover:border-[#0D9488] text-[12px] font-semibold">Edit Table</button>
            <button onClick={() => toast.info("Split coming soon")} className="h-10 rounded-md border border-[#E5E7EB] hover:border-[#0D9488] text-[12px] font-semibold">Split (A/B/C)</button>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mb-2">Status</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onStatus("cleaning")} className="h-10 rounded-md border border-[#F59E0B] text-[#B45309] hover:bg-[#FEF3C7] text-[12px] font-semibold">Mark Cleaning</button>
            <button onClick={() => onStatus("out_of_service")} className="h-10 rounded-md border border-[#9CA3AF] text-[#4B5563] hover:bg-[#F3F4F6] text-[12px] font-semibold inline-flex items-center justify-center gap-1"><Ban className="size-3.5" /> Out of Service</button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function EditTableModal({ table, floors, onClose }: { table: TableRow; floors: string[]; onClose: () => void }) {
  const [number, setNumber] = useState(table.number);
  const [floor, setFloor] = useState(table.floor);
  const [seats, setSeats] = useState(table.seats);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("tables").update({ number, floor, seats } as never).eq("id", table.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Table updated");
    onClose();
  };
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <h2 className="text-[15px] font-bold">Edit Table {table.number}</h2>
        <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
      </div>
      <div className="p-5 space-y-3 text-[13px]">
        <label className="block"><span className="text-[11px] font-bold uppercase text-[#6B7280]">Number</span>
          <input value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-[#E5E7EB]" />
        </label>
        <label className="block"><span className="text-[11px] font-bold uppercase text-[#6B7280]">Floor</span>
          <select value={floor} onChange={(e) => setFloor(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-md border border-[#E5E7EB]">
            {floors.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="block"><span className="text-[11px] font-bold uppercase text-[#6B7280]">Seats</span>
          <input type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="mt-1 w-full h-10 px-3 rounded-md border border-[#E5E7EB]" />
        </label>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-md border bg-white text-[13px] font-semibold">Cancel</button>
          <button disabled={saving} onClick={save} className="flex-1 h-10 rounded-md bg-[#0D9488] text-white text-[13px] font-semibold disabled:opacity-50">Save</button>
        </div>
      </div>
    </ModalShell>
  );
}
