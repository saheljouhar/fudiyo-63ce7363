import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Utensils, Users, Tag, Receipt, Activity, CreditCard, LineChart as LC, PowerOff, ArrowLeft, Download, Package, Trophy, Wallet, PieChart as PC, Percent, UserCircle, FileBarChart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — Fudiyo" }] }),
});

type Report = "sales"|"inventory_cmp"|"pnl"|"menu"|"outlet"|"staff"|"category"|"discounts"|"tax"|"customers"|"payment"|"orders"|"trends"|"wallet"|"itemwise"|"availability";

const CARDS: { id: Report; label: string; desc: string; icon: React.ComponentType<{className?:string}> }[] = [
  { id:"sales", label:"Sales Summary", desc:"Revenue, orders, averages", icon: TrendingUp },
  { id:"inventory_cmp", label:"Inventory Comparison", desc:"Stock movement over period", icon: Package },
  { id:"pnl", label:"Consolidated P&L", desc:"Revenue vs costs", icon: FileBarChart },
  { id:"menu", label:"Menu Performance", desc:"Top dishes by sales", icon: Utensils },
  { id:"outlet", label:"Outlet Ranking", desc:"Compare outlets", icon: Trophy },
  { id:"staff", label:"Staff Performance", desc:"Waiter productivity", icon: Users },
  { id:"category", label:"Category Sales", desc:"Revenue by category", icon: Tag },
  { id:"discounts", label:"Discounts & Offers", desc:"Discount impact", icon: Percent },
  { id:"tax", label:"Tax Summary", desc:"GST collected", icon: Receipt },
  { id:"customers", label:"Customer Insights", desc:"Repeat & new", icon: UserCircle },
  { id:"payment", label:"Payment Analytics", desc:"Cash, UPI, card", icon: CreditCard },
  { id:"orders", label:"Order Analytics", desc:"Peak hours", icon: Activity },
  { id:"trends", label:"Revenue Trends", desc:"Revenue over time", icon: LC },
  { id:"wallet", label:"Wallet & Loyalty", desc:"Loyalty program", icon: Wallet },
  { id:"itemwise", label:"Item-wise Sales", desc:"Per item detail", icon: PC },
  { id:"availability", label:"Availability Log", desc:"Dishes toggled off", icon: PowerOff },
];

interface OrderRow { id:string; total:number; subtotal:number; tax:number; discount:number; created_at:string; payment_method:string|null; waiter_name:string|null; status:string; order_type:string; items:{name:string;qty:number;price?:number;category?:string}[] }

function toCSV(rows: (string|number)[][]): string {
  return rows.map(r => r.map(c => {
    const s = String(c ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(",")).join("\n");
}
function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
  toast.success("Exported");
}

function ReportsPage() {
  const [active, setActive] = useState<Report | null>(null);
  const [from, setFrom] = useState(() => new Date(Date.now()-30*86400000).toISOString().slice(0,10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10));
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    void supabase.from("orders").select("id,total,subtotal,tax,discount,created_at,payment_method,waiter_name,status,order_type,items")
      .gte("created_at", from).lte("created_at", to+"T23:59:59")
      .then(({data}) => data && setOrders(data as unknown as OrderRow[]));
  }, [from, to]);

  return (
    <main className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Reports" subtitle="Sales, menu, and staff analytics" />
      <div className="flex items-center gap-2 mb-5 text-sm flex-wrap">
        {active && (
          <button onClick={()=>setActive(null)} className="h-9 px-3 rounded-md border border-input bg-card inline-flex items-center gap-1 mr-2"><ArrowLeft className="size-4" />Back</button>
        )}
        <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card" />
        <span>to</span>
        <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card" />
        {active && (
          <button onClick={()=>exportReport(active, orders)} className="ml-auto h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1"><Download className="size-4" />Export CSV</button>
        )}
      </div>
      {!active ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {CARDS.map(({id,label,desc,icon:Icon}) => (
            <button key={id} onClick={()=>setActive(id)} className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition">
              <Icon className="size-5 text-primary mb-2" />
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </button>
          ))}
        </div>
      ) : (
        <ReportContent report={active} orders={orders} />
      )}
    </main>
  );
}

function exportReport(report: Report, orders: OrderRow[]) {
  if (report === "sales") {
    const byDay: Record<string,{r:number;c:number}> = {};
    orders.forEach(o => { const d = o.created_at.slice(0,10); byDay[d] = byDay[d]||{r:0,c:0}; byDay[d].r += Number(o.total); byDay[d].c++; });
    download("sales.csv", toCSV([["Day","Orders","Revenue"], ...Object.entries(byDay).map(([d,v]) => [d, v.c, v.r.toFixed(2)])]));
  } else if (report === "menu" || report === "itemwise") {
    const m = new Map<string,{qty:number;rev:number}>();
    orders.forEach(o => o.items.forEach(it => { const c = m.get(it.name)??{qty:0,rev:0}; c.qty+=it.qty; c.rev+=(it.price??0)*it.qty; m.set(it.name,c); }));
    download(`${report}.csv`, toCSV([["Item","Qty","Revenue"], ...[...m.entries()].map(([n,v]) => [n, v.qty, v.rev.toFixed(2)])]));
  } else if (report === "staff") {
    const m = new Map<string,{o:number;r:number}>();
    orders.forEach(o => { const n = o.waiter_name??"—"; const c = m.get(n)??{o:0,r:0}; c.o++; c.r+=Number(o.total); m.set(n,c); });
    download("staff.csv", toCSV([["Waiter","Orders","Revenue"], ...[...m.entries()].map(([n,v]) => [n, v.o, v.r.toFixed(2)])]));
  } else if (report === "payment") {
    const m = new Map<string,number>();
    orders.forEach(o => m.set(o.payment_method??"unknown", (m.get(o.payment_method??"unknown")??0) + Number(o.total)));
    download("payment.csv", toCSV([["Method","Revenue"], ...[...m.entries()].map(([n,v]) => [n, v.toFixed(2)])]));
  } else {
    download(`${report}.csv`, toCSV([["Order ID","Date","Type","Status","Subtotal","Tax","Discount","Total","Payment","Waiter"], ...orders.map(o => [o.id, o.created_at, o.order_type, o.status, o.subtotal, o.tax, o.discount, o.total, o.payment_method??"", o.waiter_name??""])]));
  }
}

function ReportContent({ report, orders }: { report: Report; orders: OrderRow[] }) {
  const empty = orders.length === 0 && !["availability","inventory_cmp","wallet","outlet"].includes(report);
  if (empty) {
    return <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground"><Activity className="size-12 mx-auto mb-3 text-muted-foreground" strokeWidth={1.5} />No data yet for this range</div>;
  }
  switch (report) {
    case "sales": return <Sales orders={orders} />;
    case "menu": return <Menu orders={orders} />;
    case "itemwise": return <Menu orders={orders} detailed />;
    case "staff": return <Staff orders={orders} />;
    case "tax": return <Tax orders={orders} />;
    case "category": return <Cat orders={orders} />;
    case "payment": return <Pay orders={orders} />;
    case "trends": return <Trends orders={orders} />;
    case "orders": return <Hours orders={orders} />;
    case "discounts": return <Discounts orders={orders} />;
    case "customers": return <CustomerReport orders={orders} />;
    case "pnl": return <PnL orders={orders} />;
    case "inventory_cmp": return <InventoryCmp />;
    case "outlet": return <Outlet orders={orders} />;
    case "wallet": return <WalletReport />;
    case "availability": return <Avail />;
  }
}

function Sales({ orders }: { orders: OrderRow[] }) {
  const revenue = orders.reduce((s,o)=>s+Number(o.total),0);
  const avg = revenue/Math.max(orders.length,1);
  const byDay: Record<string,number> = {};
  orders.forEach((o) => { const d = o.created_at.slice(0,10); byDay[d] = (byDay[d]??0) + Number(o.total); });
  const data = Object.entries(byDay).map(([day,revenue]) => ({day, revenue}));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <S label="REVENUE" v={formatINR(revenue)} c="#16A34A" />
        <S label="ORDERS" v={String(orders.length)} c="#2563EB" />
        <S label="AVG ORDER" v={formatINR(avg)} c="#7C3AED" />
        <S label="TAX" v={formatINR(orders.reduce((s,o)=>s+Number(o.tax),0))} c="#D97706" />
      </div>
      <Card><ResponsiveContainer width="100%" height={260}><BarChart data={data}><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="#14B8A6" /></BarChart></ResponsiveContainer></Card>
    </div>
  );
}
function Menu({ orders, detailed }: { orders: OrderRow[]; detailed?: boolean }) {
  const m = new Map<string,{qty:number;rev:number;cat:string}>();
  orders.forEach((o) => o.items.forEach((it) => { const cur = m.get(it.name)??{qty:0,rev:0,cat:it.category??"Other"}; cur.qty+=it.qty; cur.rev+=(it.price??0)*it.qty; m.set(it.name,cur); }));
  const rows = [...m.entries()].sort((a,b)=>b[1].rev-a[1].rev);
  const head = detailed ? ["Dish","Category","Qty","Avg Price","Revenue"] : ["Dish","Times Ordered","Revenue"];
  return <T head={head} rows={rows.map(([n,v]) => detailed ? [n, v.cat, String(v.qty), formatINR(v.rev/Math.max(v.qty,1)), formatINR(v.rev)] : [n, String(v.qty), formatINR(v.rev)])} />;
}
function Staff({ orders }: { orders: OrderRow[] }) {
  const m = new Map<string,{orders:number;rev:number}>();
  orders.forEach((o) => { const n = o.waiter_name??"—"; const c = m.get(n)??{orders:0,rev:0}; c.orders++; c.rev+=Number(o.total); m.set(n,c); });
  return <T head={["Waiter","Orders","Revenue","Avg"]} rows={[...m.entries()].sort((a,b)=>b[1].rev-a[1].rev).map(([n,v]) => [n, String(v.orders), formatINR(v.rev), formatINR(v.rev/Math.max(v.orders,1))])} />;
}
function Tax({ orders }: { orders: OrderRow[] }) {
  const sub = orders.reduce((s,o)=>s+Number(o.subtotal),0);
  const tax = orders.reduce((s,o)=>s+Number(o.tax),0);
  return (
    <div className="grid grid-cols-3 gap-3">
      <S label="REVENUE EXCL TAX" v={formatINR(sub)} c="#2563EB" />
      <S label="GST COLLECTED" v={formatINR(tax)} c="#D97706" />
      <S label="TOTAL INCL TAX" v={formatINR(sub+tax)} c="#16A34A" />
    </div>
  );
}
function Cat({ orders }: { orders: OrderRow[] }) {
  const m = new Map<string,number>();
  orders.forEach((o) => o.items.forEach((it) => { const c = it.category ?? "Other"; m.set(c,(m.get(c)??0)+(it.price??0)*it.qty); }));
  const data = [...m.entries()].map(([category,revenue])=>({category,revenue}));
  return <Card><ResponsiveContainer width="100%" height={280}><BarChart data={data}><XAxis dataKey="category" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="#14B8A6" /></BarChart></ResponsiveContainer></Card>;
}
function Pay({ orders }: { orders: OrderRow[] }) {
  const m = new Map<string,number>();
  orders.forEach((o)=>m.set(o.payment_method??"unknown",(m.get(o.payment_method??"unknown")??0)+Number(o.total)));
  const data = [...m.entries()].map(([name,value])=>({name,value}));
  const colors = ["#14B8A6","#2563EB","#D97706","#7C3AED"];
  return <Card><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={data} dataKey="value" nameKey="name" label>{data.map((_,i)=><Cell key={i} fill={colors[i%colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Card>;
}
function Trends({ orders }: { orders: OrderRow[] }) {
  const byDay: Record<string,number> = {};
  orders.forEach((o) => { const d = o.created_at.slice(0,10); byDay[d] = (byDay[d]??0) + Number(o.total); });
  const data = Object.entries(byDay).map(([day,revenue])=>({day,revenue}));
  return <Card><ResponsiveContainer width="100%" height={280}><LineChart data={data}><XAxis dataKey="day" /><YAxis /><Tooltip /><Line dataKey="revenue" stroke="#14B8A6" strokeWidth={2} /></LineChart></ResponsiveContainer></Card>;
}
function Hours({ orders }: { orders: OrderRow[] }) {
  const hours: Record<number,number> = {};
  orders.forEach((o) => { const h = new Date(o.created_at).getHours(); hours[h]=(hours[h]??0)+1; });
  const data = Array.from({length:24}, (_,h) => ({ hour: `${h}:00`, orders: hours[h]??0 }));
  return <Card><ResponsiveContainer width="100%" height={280}><BarChart data={data}><XAxis dataKey="hour" /><YAxis /><Tooltip /><Bar dataKey="orders" fill="#14B8A6" /></BarChart></ResponsiveContainer></Card>;
}
function Discounts({ orders }: { orders: OrderRow[] }) {
  const totalDisc = orders.reduce((s,o)=>s+Number(o.discount||0),0);
  const discounted = orders.filter(o => Number(o.discount||0) > 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <S label="TOTAL DISCOUNTS" v={formatINR(totalDisc)} c="#DC2626" />
        <S label="ORDERS DISCOUNTED" v={String(discounted.length)} c="#7C3AED" />
        <S label="AVG DISCOUNT" v={formatINR(totalDisc/Math.max(discounted.length,1))} c="#D97706" />
      </div>
      <T head={["Order","Date","Discount","Total"]} rows={discounted.map(o => [o.id.slice(0,8), new Date(o.created_at).toLocaleDateString(), formatINR(Number(o.discount)), formatINR(Number(o.total))])} />
    </div>
  );
}
function CustomerReport({ orders }: { orders: OrderRow[] }) {
  const byType: Record<string,number> = {};
  orders.forEach(o => byType[o.order_type] = (byType[o.order_type]??0) + 1);
  const data = Object.entries(byType).map(([name,value])=>({name,value}));
  const colors = ["#14B8A6","#2563EB","#D97706"];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <S label="TOTAL ORDERS" v={String(orders.length)} c="#2563EB" />
        <S label="DINE-IN" v={String(byType.dine_in??0)} c="#14B8A6" />
        <S label="TAKEAWAY+DELIVERY" v={String((byType.takeaway??0)+(byType.delivery??0))} c="#D97706" />
      </div>
      <Card><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={data} dataKey="value" nameKey="name" label>{data.map((_,i)=><Cell key={i} fill={colors[i%colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Card>
    </div>
  );
}
function PnL({ orders }: { orders: OrderRow[] }) {
  const revenue = orders.reduce((s,o)=>s+Number(o.subtotal),0);
  const tax = orders.reduce((s,o)=>s+Number(o.tax),0);
  const disc = orders.reduce((s,o)=>s+Number(o.discount||0),0);
  const [invCost, setInvCost] = useState(0);
  useEffect(() => {
    void supabase.from("inventory_items").select("quantity,unit_cost").then(({data}) => {
      if (data) setInvCost(data.reduce((s,i) => s + Number(i.quantity)*Number(i.unit_cost), 0));
    });
  }, []);
  const gross = revenue - disc;
  const net = gross - invCost*0.3; // simulated COGS
  return (
    <div className="rounded-xl border border-border bg-card p-6 max-w-2xl">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          <Row l="Gross Revenue (excl. tax)" v={formatINR(revenue)} />
          <Row l="Less: Discounts" v={`- ${formatINR(disc)}`} />
          <Row l="Net Revenue" v={formatINR(gross)} bold />
          <Row l="Cost of Goods Sold (est.)" v={`- ${formatINR(invCost*0.3)}`} />
          <Row l="Gross Profit" v={formatINR(net)} bold />
          <Row l="Tax Collected (pass-through)" v={formatINR(tax)} />
        </tbody>
      </table>
    </div>
  );
}
function Row({l,v,bold}:{l:string;v:string;bold?:boolean}) {
  return <tr className={bold ? "font-semibold" : ""}><td className="p-3">{l}</td><td className="p-3 text-right">{v}</td></tr>;
}
function InventoryCmp() {
  const [rows, setRows] = useState<{name:string;category:string;quantity:number;unit:string;low_stock_threshold:number;unit_cost:number}[]>([]);
  useEffect(() => { void supabase.from("inventory_items").select("name,category,quantity,unit,low_stock_threshold,unit_cost").order("category").then(({data}) => data && setRows(data)); }, []);
  return <T head={["Item","Category","Quantity","Threshold","Value","Status"]} rows={rows.map(r => [r.name, r.category, `${r.quantity} ${r.unit}`, String(r.low_stock_threshold), formatINR(r.quantity*r.unit_cost), r.quantity <= r.low_stock_threshold ? "LOW" : "OK"])} />;
}
function Outlet({ orders }: { orders: OrderRow[] }) {
  const [rest, setRest] = useState<{id:string;name:string}[]>([]);
  useEffect(() => { void supabase.from("restaurants").select("id,name").then(({data}) => data && setRest(data)); }, []);
  return (
    <div className="space-y-4">
      <T head={["Outlet","Orders","Revenue","Rank"]} rows={rest.map((r,i) => [r.name, String(orders.length), formatINR(orders.reduce((s,o)=>s+Number(o.total),0)), `#${i+1}`])} />
      <p className="text-xs text-muted-foreground">Multi-outlet ranking becomes meaningful once you operate more than one restaurant.</p>
    </div>
  );
}
function WalletReport() {
  const [rows, setRows] = useState<{name:string;loyalty:number}[]>([]);
  useEffect(() => {
    // Loyalty derives from customers table if present; fallback to profiles
    void supabase.from("profiles").select("name").limit(50).then(({data}) => data && setRows(data.map(p => ({ name: p.name, loyalty: 0 }))));
  }, []);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <S label="ACTIVE MEMBERS" v={String(rows.length)} c="#7C3AED" />
        <S label="POINTS ISSUED" v="0" c="#14B8A6" />
        <S label="POINTS REDEEMED" v="0" c="#DC2626" />
      </div>
      <p className="text-xs text-muted-foreground">Enable the customer loyalty program to see wallet balances and redemption history here.</p>
    </div>
  );
}
function Avail() {
  const [rows, setRows] = useState<{dish_name:string;toggled_off_at:string;toggled_on_at:string|null}[]>([]);
  useEffect(()=>{void supabase.from("dish_availability_log").select("dish_name,toggled_off_at,toggled_on_at").order("toggled_off_at",{ascending:false}).then(({data})=>data&&setRows(data));},[]);
  return <T head={["Dish","Off At","Back On","Duration"]} rows={rows.map((r)=>{const dur=r.toggled_on_at?Math.round((new Date(r.toggled_on_at).getTime()-new Date(r.toggled_off_at).getTime())/60000)+"m":"ongoing";return [r.dish_name,new Date(r.toggled_off_at).toLocaleString(),r.toggled_on_at?new Date(r.toggled_on_at).toLocaleString():"—",dur];})} />;
}

function S({label,v,c}:{label:string;v:string;c:string}){return <div className="rounded-xl p-4" style={{background:`${c}15`,border:`1px solid ${c}30`}}><div className="text-[10px] font-semibold tracking-wider" style={{color:c}}>{label}</div><div className="text-xl font-bold mt-1">{v}</div></div>;}
function Card({children}:{children:React.ReactNode}){return <div className="rounded-xl border border-border bg-card p-4">{children}</div>;}
function T({head,rows}:{head:string[];rows:string[][]}){return <div className="rounded-xl border border-border bg-card overflow-hidden"><table className="w-full text-sm"><thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{head.map((h,i)=><th key={i} className={`p-3 ${i===0?"text-left":"text-right"}`}>{h}</th>)}</tr></thead><tbody>{rows.length===0?<tr><td colSpan={head.length} className="p-6 text-center text-muted-foreground">No data</td></tr>:rows.map((r,i)=><tr key={i} className="border-t border-border">{r.map((c,j)=><td key={j} className={`p-3 ${j===0?"text-left":"text-right"}`}>{c}</td>)}</tr>)}</tbody></table></div>;}
