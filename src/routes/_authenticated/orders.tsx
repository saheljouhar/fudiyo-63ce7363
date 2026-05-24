import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { Search, Minus, Plus, Trash2, ShoppingCart, Mic } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/orders")({
  validateSearch: (s: Record<string, unknown>) => ({ table: (s.table as string) ?? undefined }),
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Orders — ORBIS" }] }),
});

interface Dish { id: string; name: string; category: string; price: number; is_available: boolean; description: string | null; photo_url: string | null; restaurant_id: string }
interface CartItem { id: string; name: string; price: number; qty: number }
type OrderType = "dine_in" | "takeaway" | "delivery";

function OrdersPage() {
  const { table: tableId } = Route.useSearch();
  const navigate = useNavigate();
  const { user, name } = useAuth();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tableNum, setTableNum] = useState<string>("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("dishes").select("*").eq("is_archived", false).order("category");
      if (data) setDishes(data as Dish[]);
      if (tableId) {
        const { data: t } = await supabase.from("tables").select("number").eq("id", tableId).maybeSingle();
        if (t) setTableNum(t.number);
      }
    })();
  }, [tableId]);

  const cats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of dishes) map[d.category] = (map[d.category] || 0) + 1;
    return map;
  }, [dishes]);

  const visible = dishes.filter((d) => {
    if (activeCat !== "all" && d.category !== activeCat) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const out: Record<string, Dish[]> = {};
    for (const d of visible) (out[d.category] ||= []).push(d);
    return out;
  }, [visible]);

  const addToCart = (d: Dish) => {
    if (!d.is_available) return;
    setCart((c) => {
      const ex = c.find((x) => x.id === d.id);
      if (ex) return c.map((x) => x.id === d.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { id: d.id, name: d.name, price: Number(d.price), qty: 1 }];
    });
  };
  const inc = (id: string) => setCart((c) => c.map((x) => x.id === id ? { ...x, qty: x.qty + 1 } : x));
  const dec = (id: string) => setCart((c) => c.map((x) => x.id === id ? { ...x, qty: x.qty - 1 } : x).filter((x) => x.qty > 0));
  const remove = (id: string) => setCart((c) => c.filter((x) => x.id !== id));

  const subtotal = cart.reduce((s, x) => s + x.price * x.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;

  const send = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setSending(true);
    const restaurantId = dishes[0]?.restaurant_id;
    const { error } = await supabase.from("orders").insert({
      restaurant_id: restaurantId,
      table_id: tableId ?? null,
      waiter_id: user?.id,
      waiter_name: name,
      items: cart,
      subtotal, tax, total, discount: 0,
      order_type: orderType,
      status: "pending",
      note: note || null,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Order sent to kitchen");
    setCart([]); setNote("");
    navigate({ to: "/tables" });
  };

  return (
    <div className="flex h-[calc(100vh-72px)] -mt-4 -mx-6">
      {/* LEFT: categories */}
      <aside className="w-[160px] shrink-0 bg-card border-r border-border overflow-y-auto">
        <div className="px-3 py-3 text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Categories</div>
        <CatItem label="All Items" count={dishes.length} active={activeCat === "all"} onClick={() => setActiveCat("all")} />
        {Object.entries(cats).map(([c, n]) => (
          <CatItem key={c} label={c} count={n} active={activeCat === c} onClick={() => setActiveCat(c)} />
        ))}
      </aside>

      {/* CENTER: dishes */}
      <section className="flex-1 bg-background overflow-y-auto">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">{tableNum ? `Table ${tableNum}` : "New Order"} — Round 1</h2>
            <div className="flex gap-1 rounded-md bg-muted p-0.5 text-xs">
              {(["dine_in", "takeaway", "delivery"] as OrderType[]).map((t) => (
                <button key={t} onClick={() => setOrderType(t)} className={`px-3 py-1.5 rounded font-medium ${orderType === t ? "bg-card shadow-card" : "text-muted-foreground"}`}>
                  {t === "dine_in" ? "Dine In" : t === "takeaway" ? "Takeaway" : "Delivery"}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu items, codes, or category..." className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-card text-sm" />
          </div>
        </div>
        <div className="p-4 space-y-6">
          {Object.entries(grouped).map(([cat, list]) => (
            <div key={cat}>
              <h3 className="font-semibold text-sm mb-3">{cat} <span className="text-muted-foreground font-normal">{list.length}</span></h3>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {list.map((d) => {
                  const inCart = cart.find((x) => x.id === d.id);
                  return (
                    <div key={d.id} className={`rounded-xl border border-border bg-card overflow-hidden ${!d.is_available ? "opacity-50" : ""}`}>
                      <div className="relative h-32 bg-primary/10 flex items-center justify-center">
                        {d.photo_url ? <img src={d.photo_url} alt={d.name} className="size-full object-cover" /> : <div className="text-primary text-3xl font-bold">{d.name[0]}</div>}
                        <span className="absolute top-1.5 left-1.5 size-2.5 rounded-full bg-[#16A34A] border-2 border-white" />
                        {!d.is_available && <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold bg-[#DC2626] text-white px-1.5 py-0.5 rounded">Unavailable</span>}
                      </div>
                      <div className="p-2.5">
                        <div className="font-semibold text-sm leading-tight line-clamp-1">{d.name}</div>
                        {d.description && <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{d.description}</div>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold text-primary">{formatINR(d.price)}</span>
                        </div>
                        {!d.is_available ? (
                          <button disabled className="mt-2 w-full h-8 rounded-md border border-border text-xs text-muted-foreground">Unavailable</button>
                        ) : inCart ? (
                          <div className="mt-2 flex items-center justify-between gap-1 h-8 bg-primary text-primary-foreground rounded-md px-1">
                            <button onClick={() => dec(d.id)} className="size-7 flex items-center justify-center"><Minus className="size-3.5" /></button>
                            <span className="font-semibold text-sm">{inCart.qty}</span>
                            <button onClick={() => inc(d.id)} className="size-7 flex items-center justify-center"><Plus className="size-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(d)} className="mt-2 w-full h-8 rounded-md border border-primary text-primary text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors">+ ADD</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => toast("Voice ordering coming soon")} className="fixed bottom-6 left-1/2 -translate-x-1/2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg inline-flex items-center gap-2">
          <Mic className="size-4" /> Voice Order
        </button>
      </section>

      {/* RIGHT: cart */}
      <aside className="w-[300px] shrink-0 bg-card border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-base">Order Summary</h2>
          <div className="flex items-center gap-2 mt-2 text-xs">
            {tableNum && <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded font-semibold">T{tableNum}</span>}
            <span className="text-muted-foreground">Waiter: {name || "—"}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">
              <ShoppingCart className="size-10 mx-auto mb-2 opacity-30" />
              <div className="font-semibold mb-1">Your cart is empty</div>
              <div className="text-xs">Add items from the menu to start</div>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((it) => (
                <div key={it.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.qty} × {formatINR(it.price)}</div>
                  </div>
                  <div className="text-sm font-semibold">{formatINR(it.qty * it.price)}</div>
                  <button onClick={() => remove(it.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                </div>
              ))}
              <div className="pt-3 border-t border-border space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>GST (5%)</span><span>{formatINR(tax)}</span></div>
                <div className="flex justify-between text-base font-bold pt-1"><span>TOTAL</span><span>{formatINR(total)}</span></div>
              </div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add order note..." className="w-full mt-3 h-16 rounded-md border border-input bg-background px-3 py-2 text-xs resize-none" />
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border space-y-2">
          <button onClick={send} disabled={sending || cart.length === 0} className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
            {sending ? "Sending..." : "Send to Kitchen"}
          </button>
          <button onClick={() => { setCart([]); setNote(""); }} className="w-full h-9 rounded-md border border-input text-sm font-semibold">Hold Order</button>
        </div>
      </aside>
    </div>
  );
}

function CatItem({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors text-left ${active ? "bg-primary/10 text-primary border-l-2 border-primary font-semibold" : "border-l-2 border-transparent text-foreground hover:bg-muted"}`}>
      <span className="truncate">{label}</span>
      <span className="text-[11px] text-muted-foreground bg-muted px-1.5 rounded">{count}</span>
    </button>
  );
}