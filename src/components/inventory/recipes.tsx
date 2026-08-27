import { useState } from "react";
import { Plus, Search, UtensilsCrossed, Upload, FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { Modal, Fld, inputCls, areaCls, ModalFooter, useLocalList } from "./ui";

export const RECIPE_UNITS = ["kg", "g", "mg", "L", "ml", "cl", "fl oz", "oz", "lb", "pcs", "dozen", "bunch", "bottle", "can", "bag", "box", "pack", "case", "keg", "scoop", "tub", "peg", "shot"];

export interface RecipeIngredient { kind: "item" | "recipe"; ref: string; qty: number; unit: string }
export interface Recipe {
  id: string; name: string; description: string; category: string;
  servings: number; prepTime: number; cookTime: number;
  ingredients: RecipeIngredient[]; steps: string[]; notes: string; cost: number;
}

interface ItemLite { id: string; name: string; unit: string; unit_cost: number }

export function RecipesTab({ items }: { items: ItemLite[] }) {
  const { list, push } = useLocalList<Recipe>("fudiyo.recipes");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const visible = list.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.category.toLowerCase().includes(q.toLowerCase()));

  const download = (name: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  };
  const csv = () => {
    const rows = [["Name", "Category", "Servings", "Prep", "Cook", "Cost"], ...visible.map((r) => [r.name, r.category, String(r.servings), String(r.prepTime), String(r.cookTime), String(r.cost)])];
    download("recipes.csv", rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-[#111827]">Recipes</h3>
          <p className="text-sm text-[#64748B]">{visible.length} of {list.length} recipes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-md bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="size-4" /> Add Recipe</button>
          <button onClick={() => toast.info("Bulk import: drop a CSV of recipes (coming with procurement sync)")} className="h-10 px-4 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Upload className="size-4" /> Bulk Import</button>
          <button onClick={csv} className="h-10 px-4 rounded-md border border-[#E2E8F0] bg-white text-sm font-semibold inline-flex items-center gap-1.5"><FileSpreadsheet className="size-4 text-[#16A34A]" /> Cost Sheet (Excel)</button>
          <button onClick={csv} className="h-10 px-4 rounded-md border border-[#E2E8F0] bg-white text-sm font-semibold inline-flex items-center gap-1.5"><FileText className="size-4 text-[#0D9488]" /> CSV</button>
          <button onClick={() => window.print()} className="h-10 px-4 rounded-md border border-[#E2E8F0] bg-white text-sm font-semibold inline-flex items-center gap-1.5"><FileText className="size-4 text-[#DC2626]" /> Export PDF</button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#64748B]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes..." className="w-full h-10 pl-10 pr-3 rounded-md border border-[#E2E8F0] bg-white text-sm" />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <UtensilsCrossed className="size-12 text-[#94A3B8] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-base font-bold text-[#111827] mb-1">No recipes yet</h3>
          <p className="text-sm text-[#64748B] mb-5">Create your first recipe to track ingredient costs.</p>
          <button onClick={() => setOpen(true)} className="h-11 px-5 rounded-md bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold inline-flex items-center gap-2"><Plus className="size-4" /> Add Recipe</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-3">
          {visible.map((r) => (
            <div key={r.id} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-bold text-[#111827]">{r.name}</div>
                {r.cost > 0 && <div className="text-sm font-bold text-[#16A34A]">{formatINR(r.cost)}</div>}
              </div>
              <div className="text-xs text-[#64748B] mt-1">{r.category || "Uncategorised"} · {r.servings} servings</div>
              <div className="text-xs text-[#64748B] mt-1">{r.ingredients.length} ingredients · {r.prepTime + r.cookTime} min</div>
            </div>
          ))}
        </div>
      )}

      {open && <AddRecipeModal items={items} onClose={() => setOpen(false)} onSave={(r) => { push(r); toast.success("Recipe created"); }} />}
    </div>
  );
}

function AddRecipeModal({ items, onClose, onSave }: { items: ItemLite[]; onClose: () => void; onSave: (r: Recipe) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [servings, setServings] = useState(1);
  const [prepTime, setPrepTime] = useState(0);
  const [cookTime, setCookTime] = useState(0);
  const [ings, setIngs] = useState<RecipeIngredient[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const upd = (i: number, patch: Partial<RecipeIngredient>) => setIngs((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const cost = ings.reduce((s, g) => {
    const it = items.find((x) => x.id === g.ref);
    return s + (it ? Number(it.unit_cost) * Number(g.qty || 0) : 0);
  }, 0);

  const save = () => {
    if (!name.trim()) { toast.error("Recipe name is required"); return; }
    onSave({
      id: crypto.randomUUID(), name: name.trim(), description, category,
      servings, prepTime, cookTime, ingredients: ings, steps: steps.filter(Boolean), notes, cost,
    });
    onClose();
  };

  return (
    <Modal title="Add Recipe" onClose={onClose} width="max-w-2xl">
      <div className="p-5 space-y-3">
        <Fld label="Name *"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Recipe name" /></Fld>
        <Fld label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} className={areaCls} placeholder="Short description..." /></Fld>
        <div className="grid grid-cols-2 gap-3">
          <Fld label="Category"><input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} placeholder="e.g. Main Course" /></Fld>
          <Fld label="Servings"><input type="number" value={servings} onChange={(e) => setServings(Number(e.target.value))} className={inputCls} /></Fld>
          <Fld label="Prep Time (min)"><input type="number" value={prepTime} onChange={(e) => setPrepTime(Number(e.target.value))} className={inputCls} /></Fld>
          <Fld label="Cook Time (min)"><input type="number" value={cookTime} onChange={(e) => setCookTime(Number(e.target.value))} className={inputCls} /></Fld>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Ingredients</div>
            <button onClick={() => setIngs((l) => [...l, { kind: "item", ref: "", qty: 1, unit: "kg" }])} className="h-8 px-3 rounded-md bg-[#0D9488] text-white text-xs font-semibold inline-flex items-center gap-1"><Plus className="size-3.5" /> Add Ingredient</button>
          </div>
          {ings.length === 0 ? <div className="text-sm text-[#64748B] border rounded-md p-3">No ingredients added yet</div> : (
            <div className="space-y-2">
              {ings.map((g, i) => (
                <div key={i} className="flex gap-2">
                  <select value={g.kind} onChange={(e) => upd(i, { kind: e.target.value as "item" | "recipe" })} className="h-10 px-2 rounded-md border border-[#E2E8F0] text-sm w-24"><option value="item">Item</option><option value="recipe">Recipe</option></select>
                  <select value={g.ref} onChange={(e) => upd(i, { ref: e.target.value })} className="h-10 px-2 rounded-md border border-[#E2E8F0] text-sm flex-1">
                    <option value="">Select item</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                  <input type="number" value={g.qty} onChange={(e) => upd(i, { qty: Number(e.target.value) })} className="h-10 px-2 rounded-md border border-[#E2E8F0] text-sm w-20" />
                  <select value={g.unit} onChange={(e) => upd(i, { unit: e.target.value })} className="h-10 px-2 rounded-md border border-[#E2E8F0] text-sm w-24">
                    {RECIPE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={() => setIngs((l) => l.filter((_, j) => j !== i))} className="size-10 rounded-md border text-[#DC2626] inline-flex items-center justify-center"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Instructions</div>
            <button onClick={() => setSteps((l) => [...l, ""])} className="h-8 px-3 rounded-md bg-[#0D9488] text-white text-xs font-semibold inline-flex items-center gap-1"><Plus className="size-3.5" /> Add Step</button>
          </div>
          {steps.length === 0 ? <div className="text-sm text-[#64748B] border rounded-md p-3">No steps added yet</div> : (
            <div className="space-y-2">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-[#64748B] w-5">{i + 1}.</span>
                  <input value={s} onChange={(e) => setSteps((l) => l.map((x, j) => (j === i ? e.target.value : x)))} className={inputCls} placeholder={`Step ${i + 1}`} />
                  <button onClick={() => setSteps((l) => l.filter((_, j) => j !== i))} className="size-10 rounded-md border text-[#DC2626] inline-flex items-center justify-center shrink-0"><Trash2 className="size-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Fld label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={areaCls} placeholder="Optional notes..." /></Fld>
        {cost > 0 && <div className="text-sm font-semibold text-[#16A34A]">Estimated ingredient cost: {formatINR(cost)}</div>}
      </div>
      <ModalFooter onClose={onClose} onSave={save} saveLabel="Create Recipe" color="#16A34A" />
    </Modal>
  );
}
