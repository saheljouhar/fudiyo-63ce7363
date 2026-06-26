import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/lib/format";
import { Plus, Pencil, Trash2, Copy, Search, Camera, Eye, Star, Upload, QrCode, Image as ImageIcon, ImageOff, LayoutGrid, List, X, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/menu")({
  component: MenuPage,
  head: () => ({ meta: [{ title: "Menu — Fudiyo" }] }),
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [hideImages, setHideImages] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
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
        subtitle={`${dishes.length} items · Fudiyo Kitchen`}
        actions={
          <button onClick={() => setEditing({})} className="h-9 px-4 inline-flex items-center gap-2 rounded-md bg-cta text-cta-foreground text-sm font-semibold hover:bg-cta-hover">
            <Plus className="size-4" /> Add New Dish
          </button>
        }
      />

      {/* Action toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <ToolBtn color="#DC2626" onClick={() => toast.info("Upload menu — coming soon")}><Upload className="size-4" /> Upload</ToolBtn>
        <ToolBtn color="#F59E0B" onClick={() => toast.info("Bulk photo upload — coming soon")}><Camera className="size-4" /> Photo</ToolBtn>
        <ToolBtn color="#0D9488" onClick={() => setShowQr(true)}><QrCode className="size-4" /> QR Code</ToolBtn>
        <ToolBtn outline color="#0D9488" onClick={() => setShowCustomize(true)}><Eye className="size-4" /> Customize</ToolBtn>
        <ToolBtn outline color="#16A34A" onClick={() => setHideImages((v) => !v)}>
          {hideImages ? <ImageIcon className="size-4" /> : <ImageOff className="size-4" />} {hideImages ? "Show Images" : "Hide Images"}
        </ToolBtn>
        <ToolBtn outline color="#DC2626" onClick={() => toast.error("Delete All requires confirmation in next phase")}><Trash2 className="size-4" /> Delete All</ToolBtn>
      </div>

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
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-card text-sm">
          <option value="all">All Types</option>
          <option value="veg">Veg</option>
          <option value="non_veg">Non-Veg</option>
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-card text-sm">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="inline-flex rounded-md border border-input bg-card overflow-hidden">
          <button onClick={() => setView("grid")} className={`size-10 inline-flex items-center justify-center ${view === "grid" ? "bg-[#0D9488] text-white" : "text-muted-foreground"}`} title="Grid"><LayoutGrid className="size-4" /></button>
          <button onClick={() => setView("list")} className={`size-10 inline-flex items-center justify-center ${view === "list" ? "bg-[#0D9488] text-white" : "text-muted-foreground"}`} title="List"><List className="size-4" /></button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No dishes match. <button onClick={() => setEditing({})} className="text-primary font-semibold">Add one</button>.
        </div>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "flex flex-col gap-2"}>
          {visible.map((d, i) => (
            <DishCard key={d.id} d={d} index={i + 1} hideImage={hideImages} onEdit={() => setEditing(d)} onDup={() => duplicate(d)} onDel={() => del(d)} onToggle={() => toggleAvail(d)} />
          ))}
        </div>
      )}

      {editing && <DishDrawer initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {showQr && <QrModal onClose={() => setShowQr(false)} />}
      {showCustomize && <CustomizeOverlay dishes={dishes} onClose={() => setShowCustomize(false)} />}
    </main>
  );
}

function ToolBtn({ children, onClick, color, outline }: { children: React.ReactNode; onClick: () => void; color: string; outline?: boolean }) {
  const style: React.CSSProperties = outline
    ? { borderColor: color, color }
    : { backgroundColor: color, color: "white" };
  return (
    <button
      onClick={onClick}
      className={`h-9 px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition ${outline ? "border-2 bg-white hover:bg-gray-50" : "hover:opacity-90"}`}
      style={style}
    >
      {children}
    </button>
  );
}

function QrModal({ onClose }: { onClose: () => void }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/menu` : "/menu";
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(url)}`;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-base font-bold">Menu QR Code</h2>
          <button onClick={onClose} className="size-8 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-4" /></button>
        </div>
        <div className="p-6 text-center">
          <img src={qrSrc} alt="Menu QR" className="mx-auto rounded-lg border" />
          <p className="text-xs text-muted-foreground mt-3 break-all">{url}</p>
        </div>
        <div className="p-4 bg-gray-50 flex gap-2 justify-end">
          <button
            onClick={() => { navigator.clipboard.writeText(url); toast.success("URL copied"); }}
            className="h-10 px-4 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-100 inline-flex items-center gap-2"
          >
            <Copy className="size-4" /> Copy URL
          </button>
          <a
            href={qrSrc}
            download="fudiyo-menu-qr.png"
            className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Download className="size-4" /> Download
          </a>
        </div>
      </div>
    </div>
  );
}

function DishCard({ d, index, hideImage, onEdit, onDup, onDel, onToggle }: { d: Dish; index: number; hideImage?: boolean; onEdit: () => void; onDup: () => void; onDel: () => void; onToggle: () => void }) {
  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden shadow-card transition ${!d.is_available ? "opacity-70" : ""}`}>
      {!hideImage && (
        <div className="relative h-44 bg-[#0D9488]/10 flex items-center justify-center">
          {d.photo_url ? (
            <img src={d.photo_url} alt={d.name} className="size-full object-cover" />
          ) : (
            <div className="text-[#0D9488] text-5xl font-bold">{d.name[0]?.toUpperCase()}</div>
          )}
          <span className="absolute top-2 left-2 size-3.5 rounded-full bg-[#16A34A] border-2 border-white shadow" title="Vegetarian" />
          <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded-full">#{index}</span>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-[16px] leading-tight">{d.name}</div>
          <div className="text-base font-bold text-[#0D9488] tabular-nums">{formatINR(d.price)}</div>
        </div>
        <div className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded inline-block mt-1.5">{d.category}</div>
        {d.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</div>}
        <div className="flex items-center justify-between mt-3 gap-1">
          <IconBtn title="Edit" onClick={onEdit} className="text-[#2563EB]"><Pencil className="size-4" /></IconBtn>
          <IconBtn title="Hide" onClick={onToggle} className={d.is_available ? "text-[#F59E0B]" : "text-[#16A34A]"}>
            <span className={`size-3 rounded-full ${d.is_available ? "bg-[#F59E0B]" : "bg-[#16A34A]"}`} />
          </IconBtn>
          <IconBtn title="Hide Image" className="text-[#7C3AED]"><ImageOff className="size-4" /></IconBtn>
          <IconBtn title="Duplicate" onClick={onDup} className="text-[#16A34A]"><Copy className="size-4" /></IconBtn>
          <IconBtn title="Feature"><Star className="size-4" /></IconBtn>
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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#0D9488] text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{initial.id ? "Edit Dish" : "Add New Dish"}</h2>
          <button onClick={onClose} className="size-8 inline-flex items-center justify-center rounded hover:bg-white/10"><X className="size-4" /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <Field label="Dish name *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Category *"><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Rice Items" /></Field>
          <Field label="Description"><textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Price (₹) *"><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
          <Field label="Photo URL"><input className="input" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
            Available
          </label>
          <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-500 flex items-start gap-2">
            <Camera className="size-4 shrink-0 mt-0.5" />
            Photo upload to cloud storage ships next phase. For now paste an image URL.
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="flex-1 h-11 rounded-md border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-semibold disabled:opacity-50">{saving ? "Saving..." : "Add Dish"}</button>
        </div>
      </div>
      <style>{`.input { width: 100%; height: 38px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--input); background: var(--background); font-size: 14px; } textarea.input { padding: 8px 12px; height: auto; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>{children}</div>;
}