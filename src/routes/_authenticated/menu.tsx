import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/lib/format";
import { Plus, Pencil, Trash2, Copy, Search, Camera, Eye, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/menu")({
  component: MenuPage,
  head: () => ({ meta: [{ title: "Menu — ORBIS" }] }),
});

interface Dish {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  is_available: boolean;
  is_featured: boolean;
  photo_url: string | null;
  restaurant_id: string;
}

function MenuPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Dish> | null>(null);

  const load = async () => {
    const { data } = await supabase.from("dishes").select("*").eq("is_archived", false).order("category").order("display_order");
    if (data) setDishes(data as Dish[]);
  };

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("dishes-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "dishes" }, () => load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  const categories = useMemo(() => Array.from(new Set(dishes.map((d) => d.category))), [dishes]);

  const visible = dishes.filter((d) => {
    if (cat !== "all" && d.category !== cat) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleAvail = async (d: Dish) => {
    const { error } = await supabase.from("dishes").update({ is_available: !d.is_available }).eq("id", d.id);
    if (error) toast.error(error.message);
    else toast.success(`${d.name} ${!d.is_available ? "enabled" : "disabled"}`);
  };

  const duplicate = async (d: Dish) => {
    const { error } = await supabase.from("dishes").insert({
      name: `${d.name} (copy)`, description: d.description, category: d.category, price: d.price,
      is_available: false, photo_url: d.photo_url, restaurant_id: d.restaurant_id,
    });
    if (error) toast.error(error.message);
    else toast.success("Dish duplicated");
  };

  const del = async (d: Dish) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    const { error } = await supabase.from("dishes").update({ is_archived: true }).eq("id", d.id);
    if (error) toast.error(error.message);
    else toast.success("Dish removed");
  };

  return (
    <main className="p-6 max-w-[1500px] mx-auto">
      <PageHeader
        title="Menu Management"
        subtitle={`${dishes.length} items · ORBIS Kitchen`}
        actions={
          <button onClick={() => setEditing({})} className="h-9 px-4 inline-flex items-center gap-2 rounded-md bg-cta text-cta-foreground text-sm font-semibold hover:bg-cta-hover">
            <Plus className="size-4" /> Add New Dish
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes, codes..."
            className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-card text-sm"
          />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-card text-sm">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No dishes match. <button onClick={() => setEditing({})} className="text-primary font-semibold">Add one</button>.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map((d, i) => (
            <DishCard key={d.id} d={d} index={i + 1} onEdit={() => setEditing(d)} onDup={() => duplicate(d)} onDel={() => del(d)} onToggle={() => toggleAvail(d)} />
          ))}
        </div>
      )}

      {editing && <DishDrawer initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </main>
  );
}

function DishCard({ d, index, onEdit, onDup, onDel, onToggle }: { d: Dish; index: number; onEdit: () => void; onDup: () => void; onDel: () => void; onToggle: () => void }) {
  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden shadow-card transition ${!d.is_available ? "opacity-70" : ""}`}>
      <div className="relative h-40 bg-primary/10 flex items-center justify-center">
        {d.photo_url ? (
          <img src={d.photo_url} alt={d.name} className="size-full object-cover" />
        ) : (
          <div className="text-primary text-4xl font-bold">{d.name[0]?.toUpperCase()}</div>
        )}
        <span className="absolute top-2 left-2 size-3 rounded-full bg-[#16A34A] border-2 border-white" title="Vegetarian" />
        <span className={`absolute top-2 right-2 size-3 rounded-full border-2 border-white ${d.is_available ? "bg-[#16A34A]" : "bg-[#DC2626]"}`} />
        <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded">#{index}</span>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-sm leading-tight">{d.name}</div>
          <div className="text-sm font-bold text-primary">{formatINR(d.price)}</div>
        </div>
        <div className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded inline-block mt-1">{d.category}</div>
        {d.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</div>}
        <div className="flex items-center justify-between mt-3 gap-1">
          <IconBtn title="View"><Eye className="size-4" /></IconBtn>
          <IconBtn title="Feature"><Star className="size-4" /></IconBtn>
          <IconBtn title="Edit" onClick={onEdit} className="text-[#2563EB]"><Pencil className="size-4" /></IconBtn>
          <IconBtn title="Duplicate" onClick={onDup} className="text-[#16A34A]"><Copy className="size-4" /></IconBtn>
          <IconBtn title="Toggle availability" onClick={onToggle} className={d.is_available ? "text-[#D97706]" : "text-[#16A34A]"}>
            <span className={`size-3 rounded-full ${d.is_available ? "bg-[#D97706]" : "bg-[#16A34A]"}`} />
          </IconBtn>
          <IconBtn title="Delete" onClick={onDel} className="text-[#DC2626]"><Trash2 className="size-4" /></IconBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, className = "" }: { children: React.ReactNode; onClick?: () => void; title: string; className?: string }) {
  return (
    <button title={title} onClick={onClick} className={`size-7 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground ${className}`}>
      {children}
    </button>
  );
}

function DishDrawer({ initial, onClose, onSaved }: { initial: Partial<Dish>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: initial.name ?? "",
    category: initial.category ?? "",
    description: initial.description ?? "",
    price: initial.price ?? 0,
    is_available: initial.is_available ?? true,
    photo_url: initial.photo_url ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.category.trim() || Number(form.price) <= 0) {
      toast.error("Name, category and price are required");
      return;
    }
    setSaving(true);
    // get restaurant_id from existing dishes or fetch first
    let restaurantId = initial.restaurant_id;
    if (!restaurantId) {
      const { data } = await supabase.from("restaurants").select("id").limit(1).maybeSingle();
      restaurantId = data?.id;
    }
    if (!restaurantId) { toast.error("No restaurant configured"); setSaving(false); return; }

    const payload = { ...form, price: Number(form.price), restaurant_id: restaurantId };
    const { error } = initial.id
      ? await supabase.from("dishes").update(payload).eq("id", initial.id)
      : await supabase.from("dishes").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(initial.id ? "Dish updated" : "Dish added"); onSaved(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <button className="flex-1 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="w-[420px] max-w-full bg-card border-l border-border overflow-y-auto p-6">
        <h2 className="text-lg font-semibold mb-4">{initial.id ? "Edit Dish" : "Add Dish"}</h2>
        <div className="space-y-4">
          <Field label="Dish name *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Category *"><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Rice Items" /></Field>
          <Field label="Description"><textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Price (₹) *"><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
          <Field label="Photo URL"><input className="input" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
            Available
          </label>
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground flex items-start gap-2">
            <Camera className="size-4 shrink-0 mt-0.5" />
            Photo upload to cloud storage ships next phase. For now paste an image URL.
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 h-10 rounded-md border border-input text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{saving ? "Saving..." : "Save Dish"}</button>
        </div>
      </div>
      <style>{`.input { width: 100%; height: 38px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--input); background: var(--background); font-size: 14px; } textarea.input { padding: 8px 12px; height: auto; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>{children}</div>;
}