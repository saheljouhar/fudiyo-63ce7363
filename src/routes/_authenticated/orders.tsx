import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import {
  Search, Minus, Plus, Trash2, ShoppingCart, Mic, Bell, ClipboardList,
  Grid3x3, UtensilsCrossed, Flame, UserRound, Save, ChefHat, Menu as MenuIcon,
  Check, ChevronDown, LayoutGrid, Rows3, Square, StickyNote, X, Truck,
  CreditCard, Printer, Plus as PlusIcon, MapPin, Armchair, Volume2, VolumeX,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useSidebarDrawer } from "@/lib/sidebar";

export const Route = createFileRoute("/_authenticated/orders")({
  validateSearch: (s: Record<string, unknown>) => ({ table: (s.table as string) ?? undefined }),
  component: OrdersPage,
  head: () => ({ meta: [{ title: "Billing — Fudiyo" }] }),
});

interface Dish { id: string; name: string; category: string; price: number; is_available: boolean; description: string | null; photo_url: string | null; restaurant_id: string }
interface CartItem { id: string; name: string; price: number; qty: number; is_veg?: boolean; note?: string }
interface SavedCart { id: string; label: string; cart: CartItem[]; orderType: OrderType; at: string; code: string }
interface TableRow { id: string; number: string; seats: number; status: string }
type OrderType = "dine_in" | "takeaway" | "delivery";
type PayMethod = "cash" | "upi" | "card";
type GridMode = "compact" | "standard" | "large";
type PostState = { kind: "none" } | { kind: "kot" | "billed"; billNo: number; shortId: string; at: string; items: CartItem[]; subtotal: number; tax: number; total: number; orderType: OrderType; custName: string; pay: PayMethod };

const LS_GRID = "fudiyo.orders.grid";
const LS_TOPBAR = "fudiyo.orders.topbar";
const LS_SAVED = "fudiyo.orders.saved";
const LS_CODE = "fudiyo.orders.activeCode";
const LS_SOUND = "fudiyo.orders.notifSound";

function genCode() {
  // 4-char alphanumeric uppercase (digits weighted for shorter feel)
  const alphabet = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const c = genCode();
    const { data } = await supabase
      .from("orders")
      .select("id")
      .ilike("note", `%Code:${c}%`)
      .in("status", ["pending", "cooking", "ready"])
      .limit(1);
    if (!data || data.length === 0) return c;
  }
  return genCode();
}

function OrdersPage() {
  const { table: tableId } = Route.useSearch();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, name } = useAuth();
  const { toggle } = useSidebarDrawer();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [tableNum, setTableNum] = useState<string>("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [sending, setSending] = useState(false);
  const [mobile, setMobile] = useState("");
  const [custName, setCustName] = useState("");
  const [tableNo, setTableNo] = useState("");
  const [pay, setPay] = useState<PayMethod>("cash");

  // Order code — generated once per session, persisted
  const [orderCode, setOrderCode] = useState<string>("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(LS_CODE);
    if (existing) { setOrderCode(existing); return; }
    uniqueCode().then((c) => { setOrderCode(c); localStorage.setItem(LS_CODE, c); });
  }, []);
  const persistedRef = useRef(false);

  const [gridMode, setGridMode] = useState<GridMode>(() => (typeof window !== "undefined" ? (localStorage.getItem(LS_GRID) as GridMode) || "standard" : "standard"));
  const [topBarMode, setTopBarMode] = useState<boolean>(() => (typeof window !== "undefined" ? localStorage.getItem(LS_TOPBAR) === "1" : false));
  const [gridOpen, setGridOpen] = useState(false);
  const [saved, setSaved] = useState<SavedCart[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(LS_SAVED) || "[]"); } catch { return []; }
  });
  const [noteFor, setNoteFor] = useState<CartItem | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [post, setPost] = useState<PostState>({ kind: "none" });
  const [deliveryPerson, setDeliveryPerson] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddr, setDeliveryAddr] = useState("");
  const [showAddr, setShowAddr] = useState(false);
  const [addrForm, setAddrForm] = useState({ street: "", landmark: "", city: "", state: "", pincode: "" });

  const [showTables, setShowTables] = useState(false);
  const [tablesData, setTablesData] = useState<TableRow[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSound, setNotifSound] = useState<boolean>(() => (typeof window !== "undefined" ? localStorage.getItem(LS_SOUND) !== "0" : true));
  useEffect(() => { localStorage.setItem(LS_SOUND, notifSound ? "1" : "0"); }, [notifSound]);
  const [confirmNew, setConfirmNew] = useState(false);
  const [lookup, setLookup] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const catRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { localStorage.setItem(LS_GRID, gridMode); }, [gridMode]);
  useEffect(() => { localStorage.setItem(LS_TOPBAR, topBarMode ? "1" : "0"); }, [topBarMode]);
  useEffect(() => { localStorage.setItem(LS_SAVED, JSON.stringify(saved)); }, [saved]);
  useEffect(() => { setTableNo(tableNum); }, [tableNum]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("dishes").select("*").eq("is_archived", false).order("category");
      if (data) setDishes(data as Dish[]);
      const { data: tbls } = await supabase.from("tables").select("id, number, seats, status").order("number");
      if (tbls) setTablesData(tbls as TableRow[]);
      if (tableId) {
        const { data: t } = await supabase.from("tables").select("number").eq("id", tableId).maybeSingle();
        if (t) setTableNum(String(t.number));
      }
    })();
  }, [tableId]);

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setSearch(""); setNotifOpen(false); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);

  const cats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of dishes) map[d.category] = (map[d.category] || 0) + 1;
    return Object.keys(map).sort().reduce((a, k) => { a[k] = map[k]; return a; }, {} as Record<string, number>);
  }, [dishes]);

  const visible = dishes.filter((d) => {
    if (activeCat !== "all" && d.category !== activeCat) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!d.name.toLowerCase().includes(s) && !d.category.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const grouped = useMemo(() => {
    const out: Record<string, Dish[]> = {};
    const keys = Object.keys(cats);
    for (const k of keys) out[k] = [];
    for (const d of visible) (out[d.category] ||= []).push(d);
    for (const k of Object.keys(out)) if (out[k].length === 0) delete out[k];
    return out;
  }, [visible, cats]);

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

  const scrollToCat = (cat: string) => {
    setActiveCat(cat);
    if (cat === "all") { scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const el = catRefs.current[cat];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
    }
  };

  const saveCart = () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    const at = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    const id = `s_${Date.now()}`;
    setSaved((s) => [...s, { id, label: `Cart - ${at}`, cart, orderType, at, code: orderCode }]);
    setCart([]);
    toast.success(`Order saved at ${at}`);
  };

  const loadSaved = (s: SavedCart) => {
    setCart(s.cart); setOrderType(s.orderType);
    if (s.code) { setOrderCode(s.code); localStorage.setItem(LS_CODE, s.code); }
    setSaved((arr) => arr.filter((x) => x.id !== s.id));
  };
  const removeSaved = (id: string) => setSaved((arr) => arr.filter((x) => x.id !== id));

  const newOrder = async () => {
    setCart([]); setMobile(""); setCustName(""); setTableNo(tableNum);
    setPay("cash"); setOrderType("dine_in"); setPost({ kind: "none" });
    setDeliveryPerson(""); setDeliveryPhone(""); setDeliveryAddr(""); setShowAddr(false);
    persistedRef.current = false;
    const c = await uniqueCode();
    setOrderCode(c);
    localStorage.setItem(LS_CODE, c);
    toast.success(`New order #${c}`);
  };

  const handleNewOrderClick = () => {
    if (cart.length > 0) setConfirmNew(true);
    else newOrder();
  };

  const lookupOrder = async () => {
    const id = lookup.trim().toUpperCase().replace(/^#/, "");
    if (!id) return;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .ilike("note", `%Code:${id}%`)
      .in("status", ["pending", "cooking", "ready"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return toast.error(`Order #${id} not found`);
    const items = Array.isArray(data.items) ? (data.items as unknown as CartItem[]) : [];
    setCart(items);
    setOrderType((data.order_type as OrderType) || "dine_in");
    setOrderCode(id);
    localStorage.setItem(LS_CODE, id);
    toast.success(`Loaded order #${id}`);
    setLookup("");
  };

  const send = async (kind: "kot" | "billed") => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (!orderCode) return toast.error("Order ID not ready");
    setSending(true);
    const restaurantId = dishes[0]?.restaurant_id;
    const noteParts = [
      `Code:${orderCode}`,
      mobile && `Mobile:${mobile}`,
      custName && `Name:${custName}`,
      tableNo && `Table:${tableNo}`,
      `Pay:${pay}`,
      orderType === "delivery" && deliveryPerson && `Delivery:${deliveryPerson}/${deliveryPhone}`,
      orderType === "delivery" && deliveryAddr && `Addr:${deliveryAddr}`,
      ...cart.filter((c) => c.note).map((c) => `${c.name}:${c.note}`),
    ].filter(Boolean) as string[];
    const status = kind === "kot" ? "pending" : "billed";
    const { data, error } = await supabase.from("orders").insert({
      restaurant_id: restaurantId,
      table_id: tableId ?? null,
      waiter_id: user?.id,
      waiter_name: name,
      items: JSON.parse(JSON.stringify(cart)),
      subtotal, tax, total, discount: 0,
      order_type: orderType,
      status,
      payment_method: pay,
      note: noteParts.join(" | "),
    }).select("id").maybeSingle();
    setSending(false);
    if (error) return toast.error(error.message);
    if (tableId) {
      await supabase.from("tables").update({ status: kind === "kot" ? "occupied" : "available" }).eq("id", tableId);
    }
    const billNo = Math.floor(Math.random() * 9000) + 1000;
    setPost({ kind, billNo, shortId: orderCode, at: new Date().toLocaleString("en-IN"), items: cart, subtotal, tax, total, orderType, custName, pay });
    if (kind === "billed") {
      // Order completed — clear code so next view gets new ID
      localStorage.removeItem(LS_CODE);
    }
  };

  const resetAll = () => {
    setCart([]); setMobile(""); setCustName(""); setTableNo(tableNum);
    setPay("cash"); setPost({ kind: "none" });
    setDeliveryPerson(""); setDeliveryPhone(""); setDeliveryAddr(""); setShowAddr(false);
  };

  const startNewAndClearTable = async () => {
    if (tableId) await supabase.from("tables").update({ status: "available" }).eq("id", tableId);
    await newOrder();
  };

  const printRef = useRef<HTMLDivElement>(null);
  const printPanel = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`<html><head><title>Print</title><style>body{font-family:monospace;font-size:12px;padding:12px;white-space:pre-wrap}</style></head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close(); w.focus(); w.print(); w.close();
  };

  const pickTable = async (t: TableRow) => {
    setTableNo(String(t.number));
    setShowTables(false);
    await supabase.from("tables").update({ status: "occupied" }).eq("id", t.id);
    toast.success(`Table ${t.number} loaded`);
    // refresh tables list status optimistically
    setTablesData((arr) => arr.map((x) => x.id === t.id ? { ...x, status: "occupied" } : x));
  };

  const categoryKeys = Object.keys(grouped);

  return (
    <div className="fixed left-0 right-0 top-0 bottom-0">
      <TopNav
        toggleSidebar={toggle}
        search={search}
        setSearch={setSearch}
        tableNum={tableNum}
        orderCode={orderCode}
        onNewOrder={handleNewOrderClick}
        lookup={lookup}
        setLookup={setLookup}
        onLookup={lookupOrder}
        showTables={showTables}
        setShowTables={setShowTables}
        notifOpen={notifOpen}
        setNotifOpen={setNotifOpen}
        notifSound={notifSound}
        setNotifSound={setNotifSound}
      />
      <div className="flex bg-[#F9FAFB]" style={{ height: "calc(100vh - 56px)" }}>
        {showTables ? (
          <TablesPreview tables={tablesData} onPick={pickTable} />
        ) : (
          <>
            {/* LEFT */}
            {!topBarMode && (
              <aside className="w-[140px] shrink-0 bg-white border-r border-[#E5E7EB] overflow-y-auto">
                <div className="px-4 py-3 text-[11px] font-semibold uppercase text-[#6B7280] tracking-wider">Categories</div>
                <CatItem label="All Items" count={dishes.length} active={activeCat === "all"} onClick={() => scrollToCat("all")} />
                {Object.entries(cats).map(([c, n]) => (
                  <CatItem key={c} label={c} count={n} active={activeCat === c} onClick={() => scrollToCat(c)} />
                ))}
              </aside>
            )}

            {/* CENTER */}
            <section className="flex-1 min-w-0 flex flex-col">
              <div className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB] h-12 px-4 flex items-center justify-between shrink-0">
                <div className="font-bold text-[15px] text-[#111827] truncate">
                  {activeCat === "all" ? `All Items ${dishes.length}` : `${activeCat} ${cats[activeCat] || 0}`}
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-[13px] text-[#6B7280] select-none cursor-pointer">
                    <span>Top Bar</span>
                    <span className={`relative inline-block w-9 h-5 rounded-full transition ${topBarMode ? "bg-[#0D9488]" : "bg-[#CBD5E1]"}`}>
                      <input type="checkbox" className="sr-only" checked={topBarMode} onChange={(e) => setTopBarMode(e.target.checked)} />
                      <span className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full transition-transform ${topBarMode ? "translate-x-4" : ""}`} />
                    </span>
                  </label>
                  <div className="relative">
                    <button onClick={() => setGridOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] text-[#374151] hover:text-[#111827]">
                      {gridMode === "compact" && <Rows3 className="size-4" />}
                      {gridMode === "standard" && <LayoutGrid className="size-4" />}
                      {gridMode === "large" && <Square className="size-4" />}
                      <span className="capitalize">{gridMode}</span>
                      <ChevronDown className="size-4" />
                    </button>
                    {gridOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setGridOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 w-[200px] bg-white shadow-lg rounded-xl border border-[#E5E7EB] z-30 overflow-hidden">
                          {([
                            { k: "compact", t: "Compact", d: "Small, dense cards", I: Rows3 },
                            { k: "standard", t: "Standard", d: "Default card size", I: LayoutGrid },
                            { k: "large", t: "Large", d: "Bigger, spacious cards", I: Square },
                          ] as const).map(({ k, t, d, I }) => {
                            const active = gridMode === k;
                            return (
                              <button key={k} onClick={() => { setGridMode(k); setGridOpen(false); }}
                                className={`w-full h-14 px-4 flex items-center gap-3 hover:bg-[#F9FAFB] ${active ? "text-[#0D9488]" : "text-[#111827]"}`}>
                                <I className="size-4" />
                                <div className="flex-1 text-left">
                                  <div className="text-[13px] font-semibold">{t}</div>
                                  <div className="text-[12px] text-[#6B7280]">{d}</div>
                                </div>
                                {active && <Check className="size-4 text-[#0D9488]" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {topBarMode && (
                <div className="bg-white border-b border-[#E5E7EB] h-[52px] px-4 py-2 flex gap-2 items-center overflow-x-auto shrink-0 scrollbar-hide">
                  <Pill active={activeCat === "all"} onClick={() => scrollToCat("all")}>All Items</Pill>
                  {Object.keys(cats).map((c) => (
                    <Pill key={c} active={activeCat === c} onClick={() => scrollToCat(c)}>{c}</Pill>
                  ))}
                </div>
              )}

              <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
                <div className="pb-24">
                  {categoryKeys.length === 0 && (
                    <div className="text-center text-[#6B7280] py-12 text-sm">No dishes match.</div>
                  )}
                  {categoryKeys.map((cat) => (
                    <div key={cat} ref={(el) => { catRefs.current[cat] = el; }}>
                      <h3 className="font-bold text-[18px] text-[#111827] px-4 pt-4 pb-2 border-l-[3px] border-[#0D9488] ml-3 mt-2">
                        {cat} <span className="text-[#6B7280] font-normal">{grouped[cat].length}</span>
                      </h3>
                      <div className="px-4">
                        <DishGrid mode={gridMode} dishes={grouped[cat]} cart={cart} onAdd={addToCart} onInc={inc} onDec={dec} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sticky bottom-4 z-10 flex justify-center gap-3 px-4 pointer-events-none">
                  <div className="pointer-events-auto flex items-center gap-3">
                    <div className="bg-white shadow-lg rounded-full border border-[#E5E7EB] h-[52px] min-w-[320px] max-w-[480px] flex items-center px-4 gap-2">
                      <Search className="size-4 text-[#6B7280] shrink-0" />
                      <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search menu items, codes, or category..."
                        className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-[#111827] placeholder:text-[#9CA3AF]" />
                      <span className="text-[11px] bg-[#F1F5F9] text-[#6B7280] px-2 py-0.5 rounded font-semibold shrink-0">⌘K</span>
                    </div>
                    <button onClick={() => toast("Voice ordering coming soon")} aria-label="Voice order"
                      className="size-[52px] rounded-full bg-[#16A34A] text-white shadow-lg inline-flex items-center justify-center hover:bg-[#15803D]">
                      <Mic className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* RIGHT - Order summary (always visible) */}
        <aside className="w-[360px] shrink-0 bg-white border-l border-[#E5E7EB] flex flex-col">
          <div className="bg-[#0D9488] text-white px-4 py-3 shrink-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <ShoppingCart className="size-5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[15px] font-bold leading-tight">Order Summary {orderCode && <span className="opacity-90 text-[12px]">#{orderCode}</span>}</div>
                  <div className="text-[12px] opacity-90">{cart.length} items</div>
                </div>
              </div>
            </div>
            <div className="flex gap-1 bg-white/10 rounded-md p-0.5">
              {(["dine_in", "takeaway", "delivery"] as OrderType[]).map((t) => (
                <button key={t} onClick={() => setOrderType(t)}
                  className={`flex-1 h-8 rounded text-[12px] font-bold uppercase ${orderType === t ? "bg-white text-[#0D9488]" : "text-white/90"}`}>
                  {t === "dine_in" ? "Dine In" : t === "takeaway" ? "Takeaway" : "Delivery"}
                </button>
              ))}
            </div>
          </div>

          {orderType === "delivery" && post.kind === "none" && cart.length > 0 && (
            <div className="bg-[#FEF3C7] border-b border-[#FDE68A] px-4 py-3 shrink-0">
              <div className="text-[11px] uppercase font-bold text-[#92400E] flex items-center gap-1 mb-2">
                <Truck className="size-3.5" /> Delivery Details
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input value={deliveryPerson} onChange={(e) => setDeliveryPerson(e.target.value)} placeholder="Person" className="h-9 rounded border border-[#FCD34D] bg-white px-2 text-[12px]" />
                <input value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)} placeholder="Phone" className="h-9 rounded border border-[#FCD34D] bg-white px-2 text-[12px]" />
                <select value={pay} onChange={(e) => setPay(e.target.value as PayMethod)} className="h-9 rounded border border-[#FCD34D] bg-white px-2 text-[12px]">
                  <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option>
                </select>
              </div>
              {!showAddr && !deliveryAddr && (
                <div className="flex items-center justify-between text-[12px] text-[#92400E]">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> No delivery address</span>
                  <button onClick={() => setShowAddr(true)} className="size-7 rounded bg-[#0D9488] text-white inline-flex items-center justify-center"><PlusIcon className="size-3.5" /></button>
                </div>
              )}
              {!showAddr && deliveryAddr && (
                <div className="flex items-start justify-between gap-2 text-[12px] text-[#111827] bg-white rounded-lg border border-[#FCD34D] px-2 py-1.5">
                  <span className="inline-flex items-start gap-1.5 min-w-0"><MapPin className="size-3.5 mt-0.5 text-[#0D9488] shrink-0" /><span className="truncate">{deliveryAddr}</span></span>
                  <button onClick={() => { setDeliveryAddr(""); setAddrForm({ street: "", landmark: "", city: "", state: "", pincode: "" }); }} className="text-[#9CA3AF] hover:text-[#DC2626] shrink-0"><X className="size-3.5" /></button>
                </div>
              )}
              {showAddr && (
                <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase text-[#111827]">Delivery Address</span>
                    <button onClick={() => setShowAddr(false)} className="size-6 text-[#9CA3AF] hover:text-[#374151] inline-flex items-center justify-center"><X className="size-4" /></button>
                  </div>
                  <input value={addrForm.street} onChange={(e) => setAddrForm((f) => ({ ...f, street: e.target.value }))} placeholder="Building / Street" className="w-full h-9 rounded-lg border border-[#E5E7EB] px-2 text-[12px]" />
                  <input value={addrForm.landmark} onChange={(e) => setAddrForm((f) => ({ ...f, landmark: e.target.value }))} placeholder="Landmark" className="w-full h-9 rounded-lg border border-[#E5E7EB] px-2 text-[12px]" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={addrForm.city} onChange={(e) => setAddrForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" className="h-9 rounded-lg border border-[#E5E7EB] px-2 text-[12px]" />
                    <input value={addrForm.state} onChange={(e) => setAddrForm((f) => ({ ...f, state: e.target.value }))} placeholder="State" className="h-9 rounded-lg border border-[#E5E7EB] px-2 text-[12px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={addrForm.pincode} onChange={(e) => setAddrForm((f) => ({ ...f, pincode: e.target.value }))} placeholder="Pincode" className="h-11 rounded-lg border border-[#E5E7EB] px-2 text-[12px]" />
                    <button
                      onClick={() => {
                        const parts = [addrForm.street, addrForm.landmark, addrForm.city, addrForm.state, addrForm.pincode].filter(Boolean);
                        if (!parts.length) return;
                        setDeliveryAddr(parts.join(", "));
                        setShowAddr(false);
                      }}
                      className="h-11 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-[13px] font-semibold"
                    >Save</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {saved.length > 0 && post.kind === "none" && (
            <div className="px-3 py-2 border-b border-[#E5E7EB] shrink-0 flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-[#6B7280] font-semibold">💾 Saved:</span>
              {saved.map((s) => (
                <span key={s.id} className="inline-flex items-center gap-1 bg-[#F1F5F9] text-[#0D9488] text-[11px] px-2 py-0.5 rounded-full">
                  <button onClick={() => loadSaved(s)} className="font-semibold">{s.label}</button>
                  <button onClick={() => removeSaved(s.id)} className="hover:text-[#DC2626]"><X className="size-3" /></button>
                </span>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {post.kind !== "none" ? (
              <PostView post={post} printRef={printRef} onPrint={printPanel} onNew={post.kind === "billed" ? startNewAndClearTable : resetAll} />
            ) : cart.length === 0 ? (
              <EmptyCart />
            ) : (
              <div className="p-4 space-y-3">
                {cart.map((it) => (
                  <div key={it.id} className="border border-[#E5E7EB] rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-[#111827] truncate">{it.name}</span>
                          <span className="text-[9px] font-bold bg-[#16A34A] text-white px-1 rounded">V</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[11px] text-[#6B7280]">{formatINR(it.price)} × {it.qty}</span>
                          <span className="text-[13px] font-bold text-[#0D9488]">{formatINR(it.price * it.qty)}</span>
                        </div>
                        {it.note && <div className="text-[11px] text-[#92400E] mt-0.5 italic">📝 {it.note}</div>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setNoteFor(it); setNoteDraft(it.note || ""); }} className="size-8 rounded border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] inline-flex items-center justify-center"><StickyNote className="size-4" /></button>
                        <button onClick={() => remove(it.id)} className="size-8 rounded border border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] inline-flex items-center justify-center"><Trash2 className="size-4" /></button>
                      </div>
                      <div className="inline-flex items-center border border-[#E5E7EB] rounded-md h-8">
                        <button onClick={() => dec(it.id)} className="size-8 inline-flex items-center justify-center text-[#0D9488]"><Minus className="size-3.5" /></button>
                        <span className="w-8 text-center text-[13px] font-bold">{it.qty}</span>
                        <button onClick={() => inc(it.id)} className="size-8 inline-flex items-center justify-center text-[#0D9488]"><Plus className="size-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {post.kind === "none" && cart.length > 0 && (
            <div className="border-t border-[#E5E7EB] shrink-0">
              <div className="m-3 bg-[#0D9488] rounded-xl p-3 flex items-center justify-between text-white">
                <div>
                  <div className="text-[16px] font-bold leading-tight">Total</div>
                  <div className="text-[11px] opacity-90 leading-tight">Subtotal: {formatINR(subtotal)} · GST: {formatINR(tax)}</div>
                </div>
                <div className="text-[22px] font-bold">{formatINR(total)}</div>
              </div>
              <div className="px-3 pb-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile" className="h-10 rounded-lg border border-[#E5E7EB] px-2 text-[12px]" />
                  <input value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Name" className="h-10 rounded-lg border border-[#E5E7EB] px-2 text-[12px]" />
                  <input value={tableNo} onChange={(e) => setTableNo(e.target.value)} placeholder="Table" className="h-10 rounded-lg border border-[#E5E7EB] px-2 text-[12px]" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#111827] mb-1.5 inline-flex items-center gap-1"><CreditCard className="size-3.5" /> Payment Method</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["cash", "upi", "card"] as PayMethod[]).map((m) => {
                      const active = pay === m;
                      return (
                        <button key={m} onClick={() => setPay(m)}
                          className={`h-10 rounded-lg text-[12px] font-semibold capitalize ${active ? "bg-[#0D9488] text-white" : "bg-white border border-[#E5E7EB] text-[#64748B]"}`}>
                          {m === "upi" ? "UPI" : m[0].toUpperCase() + m.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveCart} disabled={sending}
                    className="flex-1 h-11 rounded-lg bg-[#F59E0B] text-white font-semibold text-[12px] inline-flex items-center justify-center gap-1 disabled:opacity-50">
                    <Save className="size-3.5" /> Save Order
                  </button>
                  <button onClick={() => send("kot")} disabled={sending}
                    className="flex-1 h-11 rounded-lg bg-[#111827] text-white font-semibold text-[12px] inline-flex items-center justify-center gap-1 disabled:opacity-50">
                    <ChefHat className="size-3.5" /> Place KOT
                  </button>
                </div>
                <button onClick={() => send("billed")} disabled={sending}
                  className="w-full h-12 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[14px] inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  <Check className="size-4" /> Complete Billing
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Note modal */}
      {noteFor && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setNoteFor(null)}>
          <div className="bg-white rounded-xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-[14px] font-bold mb-2">Add note for {noteFor.name}</div>
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="e.g. less spicy, no onion..." className="w-full h-24 rounded-lg border border-[#E5E7EB] p-2 text-[13px] resize-none" autoFocus />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setNoteFor(null)} className="h-9 px-3 rounded-lg border border-[#E5E7EB] text-[13px]">Cancel</button>
              <button onClick={() => { setCart((c) => c.map((x) => x.id === noteFor.id ? { ...x, note: noteDraft } : x)); setNoteFor(null); }} className="h-9 px-4 rounded-lg bg-[#0D9488] text-white text-[13px] font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm new order */}
      {confirmNew && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmNew(false)}>
          <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-[16px] font-bold mb-1 text-[#111827]">Discard current order?</div>
            <div className="text-[13px] text-[#6B7280] mb-4">Your current cart with {cart.length} item{cart.length !== 1 ? "s" : ""} will be cleared and a new order ID will be created.</div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmNew(false)} className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-[13px] font-semibold">Cancel</button>
              <button onClick={() => { setConfirmNew(false); newOrder(); }} className="h-10 px-4 rounded-lg bg-[#DC2626] text-white text-[13px] font-semibold">Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopNav({
  toggleSidebar, search, setSearch, tableNum, orderCode, onNewOrder,
  lookup, setLookup, onLookup, showTables, setShowTables,
  notifOpen, setNotifOpen, notifSound, setNotifSound,
}: {
  toggleSidebar: () => void; search: string; setSearch: (s: string) => void; tableNum: string;
  orderCode: string; onNewOrder: () => void;
  lookup: string; setLookup: (s: string) => void; onLookup: () => void;
  showTables: boolean; setShowTables: (b: boolean) => void;
  notifOpen: boolean; setNotifOpen: (b: boolean) => void;
  notifSound: boolean; setNotifSound: (b: boolean) => void;
}) {
  const items = [
    { key: "alerts", icon: Bell, label: "Alerts", active: notifOpen, onClick: () => setNotifOpen(!notifOpen) },
    { key: "orders", icon: ClipboardList, label: "Orders", to: "/history" as const },
    { key: "tables", icon: Grid3x3, label: "Tables", to: "/tables" as const },
    { key: "menu", icon: UtensilsCrossed, label: "Menu", to: "/menu" as const },
    { key: "kitchen", icon: Flame, label: "Kitchen", to: "/kitchen" as const },
    { key: "customers", icon: UserRound, label: "Customers", to: "/customers" as const },
  ];
  return (
    <div className="bg-white border-b border-[#E5E7EB] h-14 flex items-center gap-2 px-3 shrink-0 relative">
      <button onClick={toggleSidebar} aria-label="Menu" className="size-9 rounded-lg hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#374151]"><MenuIcon className="size-5" /></button>
      <span className="text-[16px] font-bold text-[#0D9488] hidden sm:inline">Fudiyo</span>
      <div className="relative w-[180px] hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu..." className="w-full h-9 pl-9 pr-3 rounded-full border border-[#E5E7EB] bg-white text-[13px]" />
      </div>
      <button onClick={onNewOrder} className="h-9 px-3 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-[13px] font-semibold inline-flex items-center gap-1"><PlusIcon className="size-4" /> New Order</button>
      {orderCode && <span className="hidden lg:inline-flex h-9 px-3 rounded-lg bg-[#F59E0B] text-white text-[13px] font-bold items-center">#{orderCode}</span>}
      <form onSubmit={(e) => { e.preventDefault(); onLookup(); }} className="hidden lg:flex">
        <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Order ID" className="h-9 w-[100px] px-2 rounded-lg border border-[#0D9488] text-[#0D9488] text-[13px] font-semibold placeholder:text-[#0D9488]/60 bg-white" />
      </form>
      <button onClick={() => toast("Voice ordering coming soon")} className="size-9 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center"><Mic className="size-4" /></button>
      <button onClick={() => setShowTables(!showTables)}
        className={`h-9 px-3 rounded-lg text-[13px] font-bold inline-flex items-center gap-1 ${showTables ? "bg-[#0D9488] text-white" : "border border-[#0D9488] text-[#0D9488] bg-white"}`}>
        {showTables ? <><ClipboardList className="size-4" /> ORDERS</> : <><Armchair className="size-4" /> {tableNum ? `T${tableNum}` : "TABLES"}</>}
      </button>
      {showTables && (
        <button onClick={() => setShowTables(false)} className="h-9 px-2 rounded-lg border border-[#0D9488] text-[#0D9488] text-[13px] font-semibold inline-flex items-center gap-1"><RotateCw className="size-3.5" /> Reset</button>
      )}
      <div className="ml-auto flex items-center">
        {items.map(({ key, icon: Icon, label, active, to, onClick }) => {
          const cls = `flex flex-col items-center justify-center w-[56px] h-14 shrink-0 text-[10px] font-semibold relative ${active ? "text-[#0D9488]" : "text-[#6B7280] hover:text-[#111827]"}`;
          const inner = (
            <>
              <Icon className="size-5 mb-0.5" />
              <span className="leading-none">{label}</span>
              {active && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0D9488] rounded-t" />}
            </>
          );
          if (to) return <Link key={key} to={to} className={cls}>{inner}</Link>;
          return <button key={key} onClick={onClick} className={cls}>{inner}</button>;
        })}
      </div>
      {notifOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
          <div className="absolute right-[260px] top-full mt-1 w-[320px] max-h-[400px] bg-white rounded-xl border border-[#E5E7EB] shadow-lg z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
              <div className="text-[16px] font-bold text-[#111827]">Notifications</div>
              <button onClick={() => setNotifSound(!notifSound)} aria-label="Toggle sound"
                className={`size-8 rounded-lg inline-flex items-center justify-center ${notifSound ? "text-[#16A34A]" : "text-[#9CA3AF]"} hover:bg-[#F1F5F9]`}>
                {notifSound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </button>
            </div>
            <div className="py-10 text-center px-4">
              <Bell className="size-12 mx-auto text-[#CBD5E1] mb-2" />
              <div className="text-[14px] text-[#6B7280]">No notifications yet</div>
              <div className="text-[12px] text-[#9CA3AF] mt-0.5">New orders will appear here</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TablesPreview({ tables, onPick }: { tables: TableRow[]; onPick: (t: TableRow) => void }) {
  return (
    <section className="flex-1 min-w-0 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <MapPin className="size-5 text-[#0D9488]" />
        <h2 className="text-[18px] font-bold text-[#111827]">Ground Floor</h2>
        <span className="bg-[#F0FDFA] text-[#0D9488] text-[12px] font-semibold px-2 py-0.5 rounded-full">{tables.length} Tables</span>
      </div>
      {tables.length === 0 ? (
        <div className="text-center text-[#6B7280] py-12 text-sm">No tables configured.</div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {tables.map((t) => {
            const dot = t.status === "available" ? "bg-[#16A34A]" : t.status === "occupied" ? "bg-[#F59E0B]" : "bg-[#9CA3AF]";
            return (
              <div key={t.id} className="bg-white rounded-xl border border-[#E5E7EB] p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[20px] font-bold text-[#111827]">T{t.number}</span>
                  <span className={`size-3 rounded-full ${dot}`} />
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280]"><Armchair className="size-4" /> {t.seats} seats</div>
                <button onClick={() => onPick(t)} className="mt-1 w-full h-10 rounded-lg bg-[#0D9488] hover:bg-[#0F766E] text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1">
                  <ClipboardList className="size-4" /> Take Order
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EmptyCart() {
  return (
    <div className="px-6 py-8 flex flex-col items-center text-center">
      <div className="relative mb-4">
        <div className="size-20 rounded-full bg-[#F0FDFA] border-2 border-dashed border-[#0D9488] inline-flex items-center justify-center">
          <ShoppingCart className="size-9 text-[#0D9488]" />
        </div>
        <span className="absolute -top-1 -right-2 size-2 rounded-full bg-[#A7F3D0]" />
        <span className="absolute -bottom-1 -left-2 size-1.5 rounded-full bg-[#A7F3D0]" />
      </div>
      <div className="text-[18px] font-bold text-[#111827]">Your cart is empty</div>
      <div className="text-[13px] text-[#6B7280] mt-1 max-w-[240px]">Add items from the menu to start building your order</div>
      <div className="w-full mt-5 space-y-2">
        {[
          { n: 1, t: "Browse menu items", active: true },
          { n: 2, t: "Click + ADD to add items", active: false },
          { n: 3, t: "Review & place order", active: false },
        ].map((s) => (
          <div key={s.n} className="bg-[#F9FAFB] rounded-lg h-12 px-4 flex items-center gap-3">
            <span className={`size-6 rounded-full inline-flex items-center justify-center text-[12px] font-bold ${s.active ? "bg-[#0D9488] text-white" : "bg-[#E5E7EB] text-[#9CA3AF]"}`}>{s.n}</span>
            <span className={`text-[13px] ${s.active ? "text-[#111827] font-semibold" : "text-[#6B7280]"}`}>{s.t}</span>
          </div>
        ))}
      </div>
      <button onClick={() => toast("Voice ordering coming soon")} className="mt-5 w-full h-12 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-[14px] inline-flex items-center justify-center gap-2">
        <Mic className="size-4" /> Start Voice Order
      </button>
    </div>
  );
}

function CatItem({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-4 min-h-12 py-2 text-[14px] transition-colors text-left border-l-[3px] ${active ? "bg-[#F0FDFA] text-[#0D9488] border-[#0D9488] font-semibold" : "border-transparent text-[#374151] hover:bg-[#F9FAFB]"}`}>
      <span className="truncate">{label}</span>
      <span className="text-[12px] text-[#6B7280] bg-[#F1F5F9] px-1.5 rounded-full ml-2">{count}</span>
    </button>
  );
}

function Pill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold transition-colors ${active ? "bg-[#0D9488] text-white" : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827]"}`}>{children}</button>
  );
}

function DishGrid({ mode, dishes, cart, onAdd, onInc, onDec }: { mode: GridMode; dishes: Dish[]; cart: CartItem[]; onAdd: (d: Dish) => void; onInc: (id: string) => void; onDec: (id: string) => void }) {
  if (mode === "compact") {
    return (
      <div className="space-y-1.5 pb-3">
        {dishes.map((d, i) => {
          const inCart = cart.find((x) => x.id === d.id);
          return (
            <div key={d.id} onClick={() => !inCart && d.is_available && onAdd(d)}
              className={`bg-white rounded-lg border border-[#E5E7EB] px-3 py-2 flex items-center gap-2 transition-all ${!d.is_available ? "opacity-50" : "cursor-pointer hover:shadow-md hover:scale-[1.01]"}`}>
              <span className="size-5 bg-[#F1F5F9] rounded-full text-[10px] font-bold text-[#6B7280] inline-flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="size-2 rounded-full bg-[#16A34A] shrink-0" />
              <span className="text-[14px] font-semibold text-[#111827] flex-1 truncate">{d.name}</span>
              <span className="text-[14px] font-semibold text-[#0D9488]">{formatINR(d.price)}</span>
              {!d.is_available ? <span className="text-[12px] text-[#9CA3AF]">Unavailable</span> :
                inCart ? (
                  <div className="inline-flex items-center border border-[#0D9488] rounded-md h-9" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onDec(d.id)} className="size-9 inline-flex items-center justify-center text-[#0D9488]"><Minus className="size-3.5" /></button>
                    <span className="w-7 text-center text-[13px] font-bold text-[#0D9488]">{inCart.qty}</span>
                    <button onClick={() => onInc(d.id)} className="size-9 inline-flex items-center justify-center text-[#0D9488]"><Plus className="size-3.5" /></button>
                  </div>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); onAdd(d); }} className="h-9 w-20 rounded-md border border-[#0D9488] text-[#0D9488] text-[13px] font-semibold hover:bg-[#0D9488] hover:text-white">+ Add</button>
                )}
            </div>
          );
        })}
      </div>
    );
  }

  if (mode === "large") {
    return (
      <div className="grid gap-4 pb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {dishes.map((d, i) => {
          const inCart = cart.find((x) => x.id === d.id);
          return (
            <div key={d.id} onClick={() => !inCart && d.is_available && onAdd(d)}
              className={`relative rounded-xl overflow-hidden border border-[#E5E7EB] bg-white h-[240px] transition-all ${!d.is_available ? "opacity-50" : "cursor-pointer hover:shadow-lg hover:scale-[1.02]"}`}>
              {d.photo_url ? <img src={d.photo_url} alt={d.name} className="absolute inset-0 size-full object-cover" /> : <div className="absolute inset-0 bg-[#0D9488] flex items-center justify-center text-white text-5xl font-bold">{d.name[0]}</div>}
              <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                <span className="bg-black/70 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{i + 1}</span>
                <span className="size-5 rounded-full bg-[#16A34A] border-2 border-white" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-white font-bold text-[15px] truncate">{d.name}</div>
                  <div className="text-white text-[16px] font-bold">{formatINR(d.price)}</div>
                </div>
                {!d.is_available ? <span className="text-white text-[12px]">Unavailable</span> :
                  inCart ? (
                    <div className="inline-flex items-center bg-[#0D9488] rounded-lg h-10 text-white" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => onDec(d.id)} className="size-10 inline-flex items-center justify-center"><Minus className="size-4" /></button>
                      <span className="w-8 text-center font-bold">{inCart.qty}</span>
                      <button onClick={() => onInc(d.id)} className="size-10 inline-flex items-center justify-center"><Plus className="size-4" /></button>
                    </div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); onAdd(d); }} className="h-10 px-4 rounded-lg bg-white text-[#0D9488] font-bold text-[13px]">+ ADD</button>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // standard
  return (
    <div className="grid gap-3 pb-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
      {dishes.map((d, i) => {
        const inCart = cart.find((x) => x.id === d.id);
        return (
          <div key={d.id} onClick={() => !inCart && d.is_available && onAdd(d)}
            className={`rounded-xl border border-[#E5E7EB] bg-white overflow-hidden shadow-sm transition-all ${!d.is_available ? "opacity-50" : "cursor-pointer hover:shadow-lg hover:scale-[1.02]"}`}>
            <div className="relative h-[160px] bg-[#0D9488]/10">
              {d.photo_url ? <img src={d.photo_url} alt={d.name} className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-[#0D9488] text-4xl font-bold">{d.name[0]}</div>}
              <span className="absolute top-1.5 left-1.5 size-6 rounded-full bg-[#16A34A] border-2 border-white" />
              <span className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{i + 1}</span>
            </div>
            <div className="px-3 py-2.5">
              <div className="font-semibold text-[14px] text-[#111827] truncate">{d.name}</div>
              <div className="text-[12px] text-[#6B7280] truncate">{d.description || "\u00A0"}</div>
              <div className="text-[15px] font-semibold text-[#0D9488] mt-1">{formatINR(d.price)}</div>
              {!d.is_available ? (
                <div className="mt-2 h-10 rounded-md flex items-center justify-center text-[#9CA3AF] text-[13px]">Unavailable</div>
              ) : inCart ? (
                <div className="mt-2 inline-flex items-center justify-between w-full border border-[#0D9488] rounded-md h-10 text-[#0D9488]" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onDec(d.id)} className="size-10 inline-flex items-center justify-center"><Minus className="size-4" /></button>
                  <span className="font-bold text-[14px]">{inCart.qty}</span>
                  <button onClick={() => onInc(d.id)} className="size-10 inline-flex items-center justify-center"><Plus className="size-4" /></button>
                </div>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); onAdd(d); }} className="mt-2 w-full h-10 rounded-md border border-[#0D9488] text-[#0D9488] text-[14px] font-semibold hover:bg-[#0D9488] hover:text-white transition-colors">+ ADD</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PostView({ post, printRef, onPrint, onNew }: { post: Exclude<PostState, { kind: "none" }>; printRef: React.RefObject<HTMLDivElement | null>; onPrint: () => void; onNew: () => void }) {
  const isKot = post.kind === "kot";
  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  return (
    <div className="p-3 space-y-3">
      <div className="text-center">
        <div className="size-12 rounded-full bg-[#16A34A] mx-auto inline-flex items-center justify-center"><Check className="size-7 text-white" /></div>
        <div className="text-[16px] font-bold text-[#0D9488] mt-2">{isKot ? "Order Placed to Kitchen!" : "Billing Complete!"}</div>
        <span className="inline-block mt-1 bg-[#DCFCE7] text-[#16A34A] text-[11px] font-bold px-2 py-0.5 rounded-full">Confirmed · #{post.shortId}</span>
        <div className="text-[14px] font-bold mt-2">Bill #{post.billNo} {isKot ? "sent to kitchen" : "completed"}</div>
      </div>
      <div ref={printRef} className="border-2 border-dashed border-[#16A34A] bg-[#F0FDF4] rounded-lg p-3 font-mono text-[11px] leading-snug text-[#111827] whitespace-pre">
{isKot ? `--- KITCHEN ORDER ---
   Fudiyo Restaurant

Order #: ${post.shortId}
Bill #: ${post.billNo}
Date: ${post.at}
Type: ${post.orderType.replace("_", "-")}

Item          Qty  Note
----------------------
${post.items.map((it) => `${pad(it.name, 13)} ${pad(String(it.qty), 4)} ${it.note || "—"}`).join("\n")}
----------------------
   Thank you - Fudiyo KOT` : `--- BILL / INVOICE ---
   FUDIYO RESTAURANT

Order #: ${post.shortId}
Bill #: ${post.billNo}
Date: ${post.at}
Customer: ${post.custName || "Walk-in Customer"}
Payment: ${post.pay.toUpperCase()}

Item          Qty   Amt
-----------------------
${post.items.map((it) => `${pad(it.name, 13)} ${pad(String(it.qty), 4)} ${formatINR(it.qty * it.price)}`).join("\n")}
-----------------------
Subtotal:    ${formatINR(post.subtotal)}
GST (5%):    ${formatINR(post.tax)}
-----------------------
TOTAL:       ${formatINR(post.total)}
-----------------------
Thank you for dining with us!`}
      </div>
      <button onClick={onPrint} className={`w-full h-12 rounded-lg text-white font-bold text-[14px] inline-flex items-center justify-center gap-2 ${isKot ? "bg-[#F59E0B]" : "bg-[#0D9488]"}`}>
        <Printer className="size-4" /> {isKot ? "Print Kitchen Order (KOT)" : "Print Bill"}
      </button>
      <button onClick={onNew} className="w-full h-12 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-[14px] inline-flex items-center justify-center gap-1">
        <PlusIcon className="size-4" /> Start New Order
      </button>
    </div>
  );
}