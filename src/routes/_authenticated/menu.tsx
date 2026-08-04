import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/lib/format";
import { Plus, ShoppingBag, Bike, Pencil, Trash2, Copy, Search, Eye, Star, Upload, QrCode, Image as ImageIcon, ImageOff, LayoutGrid, List, X, Download, MoreHorizontal, EyeOff, UtensilsCrossed } from "lucide-react";
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
  is_veg: boolean;
  short_code: string | null;
  hsn_code: string | null;
  tax_pricing: string | null;
  hide_image: boolean;
  images: unknown;
  variants: unknown;
  modifier_groups: unknown;
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
  const [viewing, setViewing] = useState<Dish | null>(null);

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

  const toggleHideImage = async (d: Dish) => {
    const { error } = await supabase.from("dishes").update({ hide_image: !d.hide_image }).eq("id", d.id);
    if (error) toast.error(error.message);
    else toast.success(d.hide_image ? "Image shown" : "Image hidden");
  };

  const toggleFeatured = async (d: Dish) => {
    const { error } = await supabase.from("dishes").update({ is_featured: !d.is_featured }).eq("id", d.id);
    if (error) toast.error(error.message);
    else toast.success(d.is_featured ? "Removed from favorites" : "Added to favorites");
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
            <DishCard
              key={d.id}
              d={d}
              index={i + 1}
              hideImage={hideImages || d.hide_image}
              onEdit={() => setEditing(d)}
              onDup={() => duplicate(d)}
              onDel={() => del(d)}
              onToggle={() => toggleAvail(d)}
              onView={() => setViewing(d)}
              onHideImage={() => toggleHideImage(d)}
              onFavorite={() => toggleFeatured(d)}
            />
          ))}
        </div>
      )}

      {editing && <DishDrawer initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {viewing && (
        <ViewDetailsModal
          d={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onMarkOut={async () => { await toggleAvail(viewing); setViewing(null); }}
          onDelete={async () => { await del(viewing); setViewing(null); }}
        />
      )}
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

function DishCard({ d, index, hideImage, onEdit, onDup, onDel, onToggle, onView, onHideImage, onFavorite }: {
  d: Dish; index: number; hideImage?: boolean;
  onEdit: () => void; onDup: () => void; onDel: () => void; onToggle: () => void;
  onView: () => void; onHideImage: () => void; onFavorite: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden shadow-card transition ${!d.is_available ? "opacity-70" : ""}`}>
      {!hideImage && (
        <div className="relative h-44 bg-[#0D9488]/10 flex items-center justify-center">
          {d.photo_url ? (
            <img src={d.photo_url} alt={d.name} className="size-full object-cover" />
          ) : (
            <div className="text-[#0D9488] text-5xl font-bold">{d.name[0]?.toUpperCase()}</div>
          )}
          <VegMark isVeg={d.is_veg} className="absolute top-2 left-2" />
          {!d.is_available && (
            <span className="absolute top-2 right-2 text-[10px] font-bold bg-[#DC2626] text-white px-2 py-0.5 rounded-full">Out of stock</span>
          )}
          {d.is_featured && (
            <span className="absolute bottom-2 left-2 text-[10px] font-bold bg-[#F59E0B] text-white px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Star className="size-3" /> Featured</span>
          )}
          <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded-full">#{index}</span>
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-[16px] leading-tight flex items-center gap-1.5">
            {hideImage && <VegMark isVeg={d.is_veg} />}
            {d.name}
          </div>
          <div className="text-base font-bold text-[#0D9488] tabular-nums">{formatINR(d.price)}</div>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{d.category}</span>
          {d.short_code && <span className="text-[11px] font-semibold text-[#0D9488] bg-[#0D9488]/10 px-2 py-0.5 rounded">{d.short_code}</span>}
        </div>
        {d.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</div>}
        <div className="flex items-center gap-1.5 mt-3">
          <button onClick={onEdit} className="flex-1 h-9 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5">
            <Pencil className="size-3.5" /> Edit
          </button>
          <button onClick={onToggle} className={`flex-1 h-9 rounded-lg text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${d.is_available ? "bg-[#F59E0B] hover:bg-[#D97706]" : "bg-[#16A34A] hover:bg-[#15803D]"}`}>
            {d.is_available ? <><EyeOff className="size-3.5" /> Hide</> : <><Eye className="size-3.5" /> Show</>}
          </button>
          <IconBtn title="View details" onClick={onView} className="text-[#0D9488] border border-border size-9"><Eye className="size-4" /></IconBtn>
          <div className="relative">
            <IconBtn title="More" onClick={() => setMenuOpen((v) => !v)} className="text-muted-foreground border border-border size-9"><MoreHorizontal className="size-4" /></IconBtn>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 bottom-full mb-1 z-40 w-[176px] bg-white rounded-xl border border-border shadow-lg py-1">
                  <MenuItem icon={<ImageOff className="size-4 text-[#7C3AED]" />} label={d.hide_image ? "Show image" : "Hide image"} onClick={() => { setMenuOpen(false); onHideImage(); }} />
                  <MenuItem icon={<Copy className="size-4 text-[#16A34A]" />} label="Duplicate" onClick={() => { setMenuOpen(false); onDup(); }} />
                  <MenuItem icon={<Star className="size-4 text-[#F59E0B]" />} label={d.is_featured ? "Unfavorite" : "Mark favorite"} onClick={() => { setMenuOpen(false); onFavorite(); }} />
                  <MenuItem icon={<Trash2 className="size-4 text-[#DC2626]" />} label="Delete" onClick={() => { setMenuOpen(false); onDel(); }} danger />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VegMark({ isVeg, className = "" }: { isVeg: boolean; className?: string }) {
  const color = isVeg ? "#16A34A" : "#DC2626";
  return (
    <span
      title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
      className={`inline-flex items-center justify-center size-4 rounded-[3px] border-2 bg-white shrink-0 ${className}`}
      style={{ borderColor: color }}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full px-3 h-9 flex items-center gap-2 text-xs font-semibold hover:bg-muted ${danger ? "text-[#DC2626]" : "text-[#374151]"}`}>
      {icon} {label}
    </button>
  );
}

function ViewDetailsModal({ d, onClose, onEdit, onMarkOut, onDelete }: {
  d: Dish; onClose: () => void; onEdit: () => void; onMarkOut: () => void; onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#0D9488] text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Item Details</h2>
          <button onClick={onClose} className="size-8 inline-flex items-center justify-center rounded hover:bg-white/10"><X className="size-4" /></button>
        </div>
        <div className="overflow-y-auto">
          {!d.hide_image && (
            <div className="h-44 bg-[#0D9488]/10 flex items-center justify-center">
              {d.photo_url
                ? <img src={d.photo_url} alt={d.name} className="size-full object-cover" />
                : <UtensilsCrossed className="size-12 text-[#0D9488]" />}
            </div>
          )}
          <div className="p-6 text-center border-b border-border">
            <div className="flex items-center justify-center gap-2">
              <VegMark isVeg={d.is_veg} />
              <h3 className="text-lg font-bold text-[#111827]">{d.name}</h3>
            </div>
            <div className="text-3xl font-extrabold text-[#DC2626] tabular-nums mt-2">{formatINR(d.price)}</div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
              <Pill color={d.is_available ? "#16A34A" : "#DC2626"}>{d.is_available ? "Available" : "Out of stock"}</Pill>
              <Pill color="#0D9488">{d.category}</Pill>
              <Pill color={d.is_veg ? "#16A34A" : "#DC2626"}>{d.is_veg ? "Veg" : "Non-Veg"}</Pill>
              {d.is_featured && <Pill color="#F59E0B">Featured</Pill>}
            </div>
          </div>
          <div className="p-5 space-y-2 text-sm">
            {d.description && <p className="text-muted-foreground">{d.description}</p>}
            <Row label="Short code" value={d.short_code || "—"} />
            <Row label="HSN / SAC" value={d.hsn_code || "—"} />
            <Row label="Tax pricing" value={d.tax_pricing === "inclusive" ? "Tax inclusive" : d.tax_pricing === "exclusive" ? "Tax exclusive" : "Follow restaurant setting"} />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t bg-gray-50">
          <button onClick={onEdit} className="flex-1 h-11 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"><Pencil className="size-4" /> Edit</button>
          <button onClick={onMarkOut} className="flex-1 h-11 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-semibold">{d.is_available ? "Mark out of stock" : "Mark available"}</button>
          <button onClick={onDelete} className="h-11 px-3 rounded-md border border-[#DC2626] text-[#DC2626] text-sm font-semibold"><Trash2 className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color, backgroundColor: `${color}1A` }}>{children}</span>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-border/60 py-1.5"><span className="text-xs text-muted-foreground">{label}</span><span className="text-xs font-semibold text-[#111827]">{value}</span></div>;
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
    is_veg: initial.is_veg ?? true,
    short_code: initial.short_code ?? "",
    hsn_code: initial.hsn_code ?? "",
    tax_pricing: initial.tax_pricing ?? "follow_restaurant",
    hide_image: initial.hide_image ?? false,
    track_stock: (initial as { track_stock?: boolean }).track_stock ?? false,
    sold_by_weight: (initial as { sold_by_weight?: boolean }).sold_by_weight ?? false,
  });
  const initialChannels = ((initial as { channel_prices?: Record<string, number> }).channel_prices ?? {}) as Record<string, number>;
  const [channels, setChannels] = useState({
    dine_in: initialChannels.dine_in != null ? String(initialChannels.dine_in) : "",
    takeaway: initialChannels.takeaway != null ? String(initialChannels.takeaway) : "",
    delivery: initialChannels.delivery != null ? String(initialChannels.delivery) : "",
  });
  const [images, setImages] = useState<string[]>(() => {
    const arr = Array.isArray(initial.images) ? (initial.images as string[]) : [];
    if (arr.length) return arr;
    return initial.photo_url ? [initial.photo_url] : [];
  });
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState<{ name: string; price: number }[]>(
    Array.isArray(initial.variants) ? (initial.variants as { name: string; price: number }[]) : [],
  );
  const [modifiers, setModifiers] = useState<{ name: string; price: number }[]>(
    Array.isArray(initial.modifier_groups) ? (initial.modifier_groups as { name: string; price: number }[]) : [],
  );
  const [saving, setSaving] = useState(false);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = 4 - images.length;
    if (room <= 0) { toast.error("Maximum 4 images"); return; }
    setUploading(true);
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("dish-photos").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data: signed } = await supabase.storage.from("dish-photos").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signed?.signedUrl) next.push(signed.signedUrl);
    }
    setImages((cur) => [...cur, ...next]);
    setUploading(false);
    if (next.length) toast.success(`${next.length} image${next.length > 1 ? "s" : ""} uploaded`);
  };

  const save = async () => {
    if (!form.name.trim() || !form.category.trim() || Number(form.price) <= 0) {
      toast.error("Name, category and price are required");
      return;
    }
    setSaving(true);
    let restaurantId = initial.restaurant_id;
    if (!restaurantId) {
      const { data } = await supabase.from("restaurants").select("id").limit(1).maybeSingle();
      restaurantId = data?.id;
    }
    if (!restaurantId) { toast.error("No restaurant configured"); setSaving(false); return; }

    const cp: Record<string, number> = {};
    (["dine_in", "takeaway", "delivery"] as const).forEach((k) => {
      const raw = channels[k];
      const v = Number(raw);
      if (raw !== "" && !Number.isNaN(v) && v > 0) cp[k] = v;
    });

    const payload = {
      ...form,
      short_code: form.short_code || null,
      hsn_code: form.hsn_code || null,
      price: Number(form.price),
      restaurant_id: restaurantId,
      photo_url: images[0] ?? null,
      images,
      channel_prices: cp,
      variants: variants.filter((v) => v.name.trim()),
      modifier_groups: modifiers.filter((m) => m.name.trim()),
    };
    const { error } = initial.id
      ? await supabase.from("dishes").update(payload).eq("id", initial.id)
      : await supabase.from("dishes").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(initial.id ? "Dish updated" : "Dish added"); onSaved(); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#0D9488] text-white px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold">{initial.id ? "Edit Dish" : "Add New Dish"}</h2>
          <button onClick={onClose} className="size-8 inline-flex items-center justify-center rounded hover:bg-white/10"><X className="size-4" /></button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto items-start">
          {/* LEFT COLUMN */}
          <div className="space-y-4">
            <Field label="Item Name *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Short Code"><input className="input" value={form.short_code} onChange={(e) => setForm({ ...form, short_code: e.target.value })} placeholder="e.g. CB01" /></Field>
              <Field label="HSN / SAC Code"><input className="input" value={form.hsn_code} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} placeholder="e.g. 996331" /></Field>
            </div>
            <Field label="Category *"><input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Rice Items" /></Field>
            <Field label="Food type">
              <div className="flex gap-2">
                {[{ v: true, l: "Veg", c: "#16A34A" }, { v: false, l: "Non-Veg", c: "#DC2626" }].map((o) => (
                  <button key={o.l} type="button" onClick={() => setForm({ ...form, is_veg: o.v })}
                    className="flex-1 h-10 rounded-md border-2 text-sm font-semibold inline-flex items-center justify-center gap-2"
                    style={form.is_veg === o.v ? { borderColor: o.c, color: o.c, backgroundColor: `${o.c}12` } : { borderColor: "#E5E7EB", color: "#6B7280" }}>
                    <VegMark isVeg={o.v} /> {o.l}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Description"><textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹) *"><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
              <Field label="Tax Pricing">
                <select className="input" value={form.tax_pricing} onChange={(e) => setForm({ ...form, tax_pricing: e.target.value })}>
                  <option value="follow_restaurant">Follow restaurant setting</option>
                  <option value="inclusive">Tax inclusive</option>
                  <option value="exclusive">Tax exclusive</option>
                </select>
              </Field>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Channel Prices (optional)</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { k: "dine_in" as const, label: "Dine-In", icon: <UtensilsCrossed className="size-3.5 text-[#0D9488]" /> },
                  { k: "takeaway" as const, label: "Takeaway", icon: <ShoppingBag className="size-3.5 text-[#F59E0B]" /> },
                  { k: "delivery" as const, label: "Delivery", icon: <Bike className="size-3.5 text-[#2563EB]" /> },
                ]).map((c) => (
                  <div key={c.k}>
                    <div className="text-[11px] font-semibold text-[#374151] mb-1 inline-flex items-center gap-1">{c.icon} {c.label}</div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                      <input type="number" className="input" style={{ paddingLeft: 22 }} placeholder={String(form.price || 0)}
                        value={channels[c.k]} onChange={(e) => setChannels({ ...channels, [c.k]: e.target.value })} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5">
                Empty zones inherit Dine-In price. Empty channels use base price.{" "}
                <span className="text-[#0D9488] font-semibold cursor-pointer underline-offset-2 hover:underline">Admin → Pricing Rules</span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] p-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={form.track_stock} onChange={(e) => setForm({ ...form, track_stock: e.target.checked })} />
              <span>
                <span className="block text-sm font-semibold text-[#1E3A8A]">Track Stock Count</span>
                <span className="block text-[11px] text-[#2563EB]">Synced with Inventory — auto-deducts on orders</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] p-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={form.sold_by_weight} onChange={(e) => setForm({ ...form, sold_by_weight: e.target.checked })} />
              <span>
                <span className="block text-sm font-semibold text-[#1E3A8A]">Sold by Weight</span>
                <span className="block text-[11px] text-[#2563EB]">Enable for items priced per kg/lb (requires weighing scale)</span>
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} />
              Available
            </label>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Item Images</div>
              <label className="block rounded-lg border-2 border-dashed border-[#CBD5E1] hover:border-[#0D9488] transition p-6 text-center cursor-pointer bg-[#F8FAFC]">
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploading || images.length >= 4}
                  onChange={(e) => { void uploadFiles(e.target.files); e.currentTarget.value = ""; }} />
                <Upload className="size-6 mx-auto text-[#0D9488]" />
                <div className="text-sm font-semibold mt-2">{uploading ? "Uploading..." : "Upload Images"}</div>
                <div className="text-[11px] text-muted-foreground">{Math.max(0, 4 - images.length)} more allowed (max 4)</div>
                <div className="text-[11px] text-muted-foreground mt-1">Drag &amp; drop or click to select</div>
              </label>
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {images.map((src, i) => (
                    <div key={i} className="relative rounded-md overflow-hidden border border-border aspect-square">
                      <img src={src} alt={`${form.name || "Dish"} image ${i + 1}`} className="size-full object-cover" />
                      <button type="button" onClick={() => setImages((cur) => cur.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 size-5 rounded-full bg-[#DC2626] text-white inline-flex items-center justify-center"><X className="size-3" /></button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 text-sm mt-2">
                <input type="checkbox" checked={form.hide_image} onChange={(e) => setForm({ ...form, hide_image: e.target.checked })} />
                Hide image
              </label>
            </div>

            <RowEditor title="Variants" hint="e.g., Half, Full" rows={variants} setRows={setVariants} />
            <RowEditor title="Modifier Groups" hint="e.g., Extra cheese" rows={modifiers} setRows={setModifiers} />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="flex-1 h-11 rounded-md border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-semibold disabled:opacity-50">{saving ? "Saving..." : initial.id ? "Save Changes" : "Add Dish"}</button>
        </div>
      </div>
      <style>{`.input { width: 100%; height: 38px; padding: 0 12px; border-radius: 6px; border: 1px solid var(--input); background: var(--background); font-size: 14px; } textarea.input { padding: 8px 12px; height: auto; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>{children}</div>;
}

function RowEditor({ title, hint, rows, setRows }: {
  title: string; hint: string;
  rows: { name: string; price: number }[];
  setRows: React.Dispatch<React.SetStateAction<{ name: string; price: number }[]>>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-semibold text-muted-foreground">{title}</div>
        <button type="button" onClick={() => setRows((r) => [...r, { name: "", price: 0 }])}
          className="text-xs font-semibold text-[#0D9488] inline-flex items-center gap-1"><Plus className="size-3.5" /> Add</button>
      </div>
      {rows.length === 0 ? (
        <div className="text-[11px] text-muted-foreground bg-muted rounded-md px-3 py-2">None yet — {hint}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                <div className="text-[11px] font-semibold text-muted-foreground mb-1">Name</div>
                <input className="input" placeholder={hint} value={r.name}
                  onChange={(e) => setRows((list) => list.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              </div>
              <div className="w-28">
                <div className="text-[11px] font-semibold text-muted-foreground mb-1">Price</div>
                <input type="number" className="input" placeholder="₹ 0" value={r.price}
                  onChange={(e) => setRows((list) => list.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} />
              </div>
              <button type="button" onClick={() => setRows((list) => list.filter((_, j) => j !== i))}
                className="size-9 shrink-0 inline-flex items-center justify-center rounded-md border border-border text-[#DC2626]"><X className="size-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function CustomizeOverlay({ dishes, onClose }: { dishes: Dish[]; onClose: () => void }) {
  const themes = [
    { id: "default", name: "Default", desc: "Classic menu layout" },
    { id: "classic", name: "Classic", desc: "Modern list view with header" },
    { id: "bistro", name: "Bistro", desc: "Elegant book-style menu" },
    { id: "cube", name: "Cube", desc: "3D interactive cube menu" },
    { id: "book", name: "Book", desc: "3D book flip menu" },
  ];
  const [selected, setSelected] = useState<string>(() => localStorage.getItem("menu-theme") ?? "default");

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="h-14 px-6 border-b flex items-center justify-between">
        <h2 className="text-lg font-bold">Customize Public Menu</h2>
        <button onClick={onClose} className="size-9 rounded hover:bg-gray-100 inline-flex items-center justify-center"><X className="size-5" /></button>
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] overflow-hidden">
        <div className="border-r p-5 flex flex-col">
          <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">Select Theme</h3>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {themes.map((t) => (
              <button key={t.id} onClick={() => setSelected(t.id)}
                className={`w-full text-left p-4 rounded-lg border-2 ${selected === t.id ? "border-[#0D9488] bg-[#0D9488]/5" : "border-gray-200 hover:border-gray-300"}`}>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={() => { localStorage.setItem("menu-theme", selected); toast.success("Theme saved"); onClose(); }}
            className="mt-4 h-11 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold">Save Theme</button>
        </div>
        <div className="bg-gray-100 flex items-center justify-center p-6 overflow-auto">
          <div className="w-[340px] h-[640px] bg-white rounded-[40px] border-[12px] border-gray-900 shadow-2xl overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              <div className="text-center mb-4 pt-2">
                <h4 className="text-base font-bold">Our Menu</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{themes.find((t) => t.id === selected)?.name} Theme</p>
              </div>
              {dishes.slice(0, 8).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{d.name}</div>
                    <div className="text-[11px] text-gray-500 truncate">{d.category}</div>
                  </div>
                  <div className="text-sm font-bold text-[#0D9488] tabular-nums">{formatINR(d.price)}</div>
                </div>
              ))}
              {dishes.length === 0 && <p className="text-center text-xs text-gray-400 mt-10">Add dishes to see them here</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
