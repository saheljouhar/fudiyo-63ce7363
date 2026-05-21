import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer, Plus, QrCode, RotateCcw, CalendarPlus, Armchair } from "lucide-react";
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
  head: () => ({ meta: [{ title: "Tables — ORBIS" }] }),
});

function TablesPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [activeFloor, setActiveFloor] = useState<string>("all");
  const [, force] = useState(0);

  // ticking for elapsed time
  useEffect(() => {
    const i = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("tables").select("*").order("number");
      if (data) setTables(data as TableRow[]);
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

  const resetAll = async () => {
    if (!confirm("Reset all tables to Available? This clears active table states.")) return;
    const { error } = await supabase
      .from("tables")
      .update({ status: "available", occupied_since: null })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) toast.error(error.message);
    else toast.success("All tables reset");
  };

  return (
    <main className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Table Management"
        subtitle="ORBIS Kitchen"
        actions={
          <>
            <Button variant="outline" size="sm"><CalendarPlus /> Book</Button>
            <Button variant="outline" size="sm" onClick={resetAll}><RotateCcw /> Reset All</Button>
            <Button variant="outline" size="sm"><Plus /> Add</Button>
            <Button variant="outline" size="sm"><QrCode /> QR Codes</Button>
          </>
        }
      />

      {/* Stats bar */}
      <div className="rounded-xl border bg-card shadow-card px-5 py-4 mb-5 flex flex-wrap items-center gap-6 text-sm">
        <Stat label="Total" value={counts.total} dot="bg-foreground/40" />
        <Stat label="Available" value={counts.avail} dot="bg-table-available" />
        <Stat label="Occupied" value={counts.occ} dot="bg-table-occupied" />
        <Stat label="Bill Requested" value={counts.bill} dot="bg-table-bill" />
      </div>

      {/* Floor tabs */}
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

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
        {visible.map((t) => (
          <TableCard
            key={t.id}
            table={t}
            total={totals[t.id] ?? 0}
            onTake={() => takeOrder(t)}
            onAdd={() => navigate({ to: "/orders", search: { table: t.id } as never })}
            onBill={() => navigate({ to: "/history", search: { table: t.id } as never })}
          />
        ))}
      </div>
    </main>
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
  table, total, onTake, onAdd, onBill,
}: {
  table: TableRow; total: number;
  onTake: () => void; onAdd: () => void; onBill: () => void;
}) {
  const dot =
    table.status === "available" ? "bg-table-available" :
    table.status === "occupied" ? "bg-table-occupied" :
    table.status === "bill_requested" ? "bg-table-bill" : "bg-muted-foreground";

  const border =
    table.status === "occupied" ? "border-dashed border-table-bill" :
    table.status === "bill_requested" ? "border-table-bill" : "border-border";

  return (
    <div className={`relative rounded-xl border ${border} bg-card shadow-card p-3 flex flex-col`}>
      {/* header row */}
      <div className="flex items-start justify-between mb-1">
        <span className="font-bold text-foreground">{table.number}</span>
        {table.status === "occupied" ? (
          <span className="text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-table-occupied/10 text-table-occupied">
            Occupied
          </span>
        ) : table.status === "bill_requested" ? (
          <span className="text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-table-bill/15 text-table-bill">
            Bill Requested
          </span>
        ) : (
          <span className={`size-2.5 rounded-full ${dot}`} />
        )}
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
          className="w-full text-xs font-semibold py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
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