import { useEffect, useMemo, useRef, useState } from "react";
import { Square, RectangleHorizontal, Circle, RotateCw, RotateCcw, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LayoutShape = "square" | "rect" | "circle";
export interface TableLayout { x: number; y: number; w: number; h: number; shape: LayoutShape; rotation: number }

interface LayoutTable { id: string; number: string; floor: string; seats: number; status: string; layout?: unknown }

const DEFAULT: TableLayout = { x: 24, y: 24, w: 110, h: 90, shape: "square", rotation: 0 };
const CANVAS_H = 560;

function readLayout(t: LayoutTable, i: number): TableLayout {
  const l = (t.layout ?? {}) as Partial<TableLayout>;
  return {
    x: Number.isFinite(l.x) ? Number(l.x) : 24 + (i % 6) * 130,
    y: Number.isFinite(l.y) ? Number(l.y) : 24 + Math.floor(i / 6) * 110,
    w: Number(l.w) || DEFAULT.w,
    h: Number(l.h) || DEFAULT.h,
    shape: (l.shape as LayoutShape) || DEFAULT.shape,
    rotation: Number(l.rotation) || 0,
  };
}

function statusColors(status: string) {
  if (status === "occupied") return { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" };
  if (status === "bill_requested") return { bg: "#FFE4E6", border: "#F43F5E", text: "#9F1239" };
  if (status === "reserved") return { bg: "#EDE9FE", border: "#8B5CF6", text: "#5B21B6" };
  return { bg: "#DCFCE7", border: "#16A34A", text: "#166534" };
}

/** Read-only positioned floor map shared by Table Management and Dashboard Billing. */
export function FloorMapView({ tables, onTableClick, totals, height = CANVAS_H }: {
  tables: LayoutTable[];
  onTableClick?: (t: LayoutTable) => void;
  totals?: Record<string, number>;
  height?: number;
}) {
  return (
    <div
      className="relative rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-auto"
      style={{ height, backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)", backgroundSize: "24px 24px" }}
    >
      {tables.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#94A3B8]">No tables on this floor yet.</div>
      )}
      {tables.map((t, i) => {
        const l = readLayout(t, i);
        const c = statusColors(t.status);
        const tot = totals?.[t.id] ?? 0;
        return (
          <button
            key={t.id}
            onClick={() => onTableClick?.(t)}
            className="absolute select-none flex flex-col items-center justify-center transition hover:shadow-lg"
            style={{
              left: l.x, top: l.y, width: l.w, height: l.h,
              transform: `rotate(${l.rotation}deg)`,
              background: c.bg,
              border: `2px solid ${c.border}`,
              borderRadius: l.shape === "circle" ? "9999px" : 12,
              cursor: onTableClick ? "pointer" : "default",
            }}
          >
            <span className="text-[14px] font-bold" style={{ color: c.text }}>{t.number}</span>
            <span className="text-[11px]" style={{ color: c.text }}>{t.seats} seats</span>
            {tot > 0 && <span className="text-[12px] font-bold" style={{ color: c.text }}>₹{tot.toLocaleString("en-IN")}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function FloorLayoutEditor({ tables, floor, onSaved, onTableClick }: { tables: LayoutTable[]; floor: string; onSaved?: () => void; onTableClick?: (t: LayoutTable) => void }) {
  const readOnly = floor === "all";
  const canvasRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState<Record<string, TableLayout>>({});
  const drag = useRef<{ id: string; mode: "move" | "resize"; sx: number; sy: number; start: TableLayout } | null>(null);

  const base = useMemo(() => {
    const m: Record<string, TableLayout> = {};
    tables.forEach((t, i) => { m[t.id] = readLayout(t, i); });
    return m;
  }, [tables]);

  useEffect(() => { setPos(base); setSel(null); }, [base]);
  useEffect(() => { if (readOnly) { setEditing(false); setSel(null); } }, [readOnly]);

  useEffect(() => {
    if (!editing) return;
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      setPos((p) => {
        const cur = p[d.id] ?? d.start;
        if (d.mode === "move") {
          return { ...p, [d.id]: { ...cur, x: Math.max(0, d.start.x + dx), y: Math.max(0, d.start.y + dy) } };
        }
        return { ...p, [d.id]: { ...cur, w: Math.max(60, d.start.w + dx), h: Math.max(50, d.start.h + dy) } };
      });
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [editing]);

  const patch = (id: string, p: Partial<TableLayout>) =>
    setPos((s) => ({ ...s, [id]: { ...(s[id] ?? DEFAULT), ...p } }));

  const save = async () => {
    setSaving(true);
    for (const t of tables) {
      const l = pos[t.id];
      if (!l) continue;
      await supabase.from("tables").update({ layout: l as never }).eq("id", t.id);
    }
    setSaving(false);
    setEditing(false);
    setSel(null);
    toast.success(`Layout saved for ${floor}`);
    onSaved?.();
  };

  const cancel = () => { setPos(base); setEditing(false); setSel(null); };
  const selected = sel ? tables.find((t) => t.id === sel) : null;
  const selLayout = sel ? pos[sel] : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="text-[13px] text-[#6B7280]">
          {readOnly
            ? "All Floors — read-only overview. Select a floor to edit its layout."
            : editing ? "Drag to move, drag the corner handle to resize, click a table to edit its shape and rotation." : `${floor} layout`}
        </div>
        {!readOnly && (
          editing ? (
            <div className="flex items-center gap-2">
              <button onClick={cancel} className="h-9 px-3 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-semibold inline-flex items-center gap-1.5"><X className="size-4" /> Cancel</button>
              <button disabled={saving} onClick={save} className="h-9 px-3 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"><Save className="size-4" /> {saving ? "Saving…" : "Save Layout"}</button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="h-9 px-3 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-[13px] font-semibold">Edit Layout</button>
          )
        )}
      </div>

      {editing && selected && selLayout && (
        <div className="flex items-center gap-3 flex-wrap mb-3 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5">
          <span className="text-[13px] font-bold text-[#111827]">Table {selected.number}</span>
          <div className="inline-flex border border-[#E2E8F0] rounded-lg overflow-hidden">
            {([["square", Square], ["rect", RectangleHorizontal], ["circle", Circle]] as const).map(([s, Icon]) => (
              <button key={s} onClick={() => patch(selected.id, { shape: s, ...(s === "rect" ? { w: Math.max(selLayout.w, 150) } : {}) })}
                aria-label={s}
                className={`size-9 inline-flex items-center justify-center ${selLayout.shape === s ? "bg-[#0D9488] text-white" : "bg-white text-[#6B7280]"}`}>
                <Icon className="size-4" />
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-1.5">
            <button onClick={() => patch(selected.id, { rotation: (selLayout.rotation - 15 + 360) % 360 })}
              className="size-9 rounded-lg border border-[#E2E8F0] inline-flex items-center justify-center text-[#6B7280]" aria-label="Rotate counter-clockwise"><RotateCcw className="size-4" /></button>
            <span className="w-12 text-center text-[13px] font-semibold tabular-nums">{selLayout.rotation}°</span>
            <button onClick={() => patch(selected.id, { rotation: (selLayout.rotation + 15) % 360 })}
              className="size-9 rounded-lg border border-[#E2E8F0] inline-flex items-center justify-center text-[#6B7280]" aria-label="Rotate clockwise"><RotateCw className="size-4" /></button>
          </div>
        </div>
      )}

      <div
        ref={canvasRef}
        onPointerDown={(e) => { if (e.target === canvasRef.current) setSel(null); }}
        className="relative rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden"
        style={{ height: CANVAS_H, backgroundImage: "radial-gradient(#CBD5E1 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      >
        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-[13px] text-[#94A3B8]">No tables on this floor yet.</div>
        )}
        {tables.map((t) => {
          const l = pos[t.id] ?? DEFAULT;
          const c = statusColors(t.status);
          const isSel = sel === t.id;
          return (
            <div
              key={t.id}
              onClick={() => { if (!editing) onTableClick?.(t); }}
              onPointerDown={(e) => {
                if (!editing) return;
                setSel(t.id);
                drag.current = { id: t.id, mode: "move", sx: e.clientX, sy: e.clientY, start: l };
              }}
              className="absolute select-none flex flex-col items-center justify-center"
              style={{
                left: l.x, top: l.y, width: l.w, height: l.h,
                transform: `rotate(${l.rotation}deg)`,
                background: c.bg,
                border: `2px solid ${isSel ? "#0D9488" : c.border}`,
                borderRadius: l.shape === "circle" ? "9999px" : 12,
                boxShadow: isSel ? "0 0 0 3px rgba(13,148,136,0.2)" : "none",
                cursor: editing ? "move" : onTableClick ? "pointer" : "default",
              }}
            >
              <span className="text-[14px] font-bold" style={{ color: c.text }}>{t.number}</span>
              <span className="text-[11px]" style={{ color: c.text }}>{t.seats} seats</span>
              {readOnly && <span className="text-[10px] text-[#64748B]">{t.floor}</span>}
              {editing && isSel && (
                <div
                  onPointerDown={(e) => { e.stopPropagation(); drag.current = { id: t.id, mode: "resize", sx: e.clientX, sy: e.clientY, start: l }; }}
                  className="absolute -right-1.5 -bottom-1.5 size-4 rounded-sm bg-[#0D9488] border-2 border-white"
                  style={{ cursor: "nwse-resize" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
