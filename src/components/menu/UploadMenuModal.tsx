import { useRef, useState } from "react";
import { Upload, X, Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ParsedRow { name: string; category: string; price: number; description: string }

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of Object.keys(row)) {
    const norm = k.trim().toLowerCase().replace(/[\s_-]/g, "");
    if (keys.includes(norm)) {
      const v = row[k];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return "";
}

export function UploadMenuModal({ categories, onClose, onDone }: { categories: string[]; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error("Please upload an .xlsx or .csv file");
      return;
    }
    setParsing(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const parsed: ParsedRow[] = [];
      for (const r of json) {
        const name = pick(r, ["itemname", "name", "item", "dish", "dishname"]);
        if (!name) continue;
        parsed.push({
          name,
          category: pick(r, ["category", "cat", "section"]) || (categories[0] ?? "General"),
          price: Number(pick(r, ["price", "rate", "amount", "cost"]).replace(/[^\d.]/g, "")) || 0,
          description: pick(r, ["description", "desc", "details"]),
        });
      }
      if (!parsed.length) toast.error("No rows found. Expected columns: Item Name, Category, Price, Description");
      setRows(parsed);
      setFileName(file.name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    }
    setParsing(false);
  };

  const addAll = async () => {
    const valid = rows.filter((r) => r.name.trim() && r.category.trim());
    if (!valid.length) return toast.error("Nothing to add");
    setSaving(true);
    const { data: rest } = await supabase.from("restaurants").select("id").limit(1).maybeSingle();
    if (!rest?.id) { setSaving(false); return toast.error("No restaurant configured"); }
    const { error } = await supabase.from("dishes").insert(
      valid.map((r) => ({
        name: r.name.trim(),
        category: r.category.trim(),
        price: Number(r.price) || 0,
        description: r.description || null,
        restaurant_id: rest.id,
        is_available: true,
      })),
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${valid.length} item${valid.length > 1 ? "s" : ""} added to the menu`);
    onDone();
  };

  const update = (i: number, patch: Partial<ParsedRow>) =>
    setRows((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#0D9488] text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Upload Menu</h2>
          <button onClick={onClose} className="size-8 inline-flex items-center justify-center rounded hover:bg-white/10"><X className="size-4" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); void handleFile(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition ${dragOver ? "border-[#0D9488] bg-[#F0FDFA]" : "border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#0D9488]"}`}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => { void handleFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            <Upload className="size-7 mx-auto text-[#0D9488]" />
            <div className="text-sm font-semibold mt-2">{parsing ? "Reading file…" : "Click to upload or drag & drop"}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Excel (.xlsx) or CSV — columns: Item Name, Category, Price, Description (optional)</div>
            {fileName && <div className="text-[11px] text-[#0D9488] font-semibold mt-2 inline-flex items-center gap-1"><FileSpreadsheet className="size-3.5" /> {fileName}</div>}
          </div>

          {rows.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Review {rows.length} item{rows.length > 1 ? "s" : ""} before adding</div>
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Item name"
                      className="flex-1 h-9 px-2.5 rounded-md border border-border text-sm" />
                    <input value={r.category} onChange={(e) => update(i, { category: e.target.value })} placeholder="Category" list="upload-menu-cats"
                      className="w-40 h-9 px-2.5 rounded-md border border-border text-sm" />
                    <input type="number" value={r.price} onChange={(e) => update(i, { price: Number(e.target.value) })} placeholder="Price"
                      className="w-24 h-9 px-2.5 rounded-md border border-border text-sm" />
                    <button onClick={() => setRows((list) => list.filter((_, j) => j !== i))}
                      className="size-9 shrink-0 rounded-md border border-border text-[#DC2626] inline-flex items-center justify-center"><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </div>
              <datalist id="upload-menu-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="flex-1 h-11 rounded-md border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={addAll} disabled={saving || rows.length === 0}
            className="flex-1 h-11 rounded-md bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? "Adding…" : `Add All${rows.length ? ` (${rows.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
