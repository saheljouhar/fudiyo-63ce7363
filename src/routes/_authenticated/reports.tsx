import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Utensils, Users, Tag, Receipt, Activity, CreditCard, LineChart as LC, PowerOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — Fudiyo" }] }),
});

type Report = "sales"|"menu"|"staff"|"category"|"tax"|"orders"|"payment"|"trends"|"availability";
const CARDS: { id: Report; label: string; desc: string; icon: React.ComponentType<{className?:string}> }[] = [
  { id:"sales", label:"Sales Summary", desc:"Revenue, orders, averages", icon: TrendingUp },
  { id:"menu", label:"Menu Performance", desc:"Top dishes by sales", icon: Utensils },
  { id:"staff", label:"Staff Performance", desc:"Waiter productivity", icon: Users },
  { id:"category", label:"Category Sales", desc:"Revenue by category", icon: Tag },
  { id:"tax", label:"Tax Summary", desc:"GST collected", icon: Receipt },
  { id:"orders", label:"Order Analytics", desc:"Peak hours heatmap", icon: Activity },
  { id:"payment", label:"Payment Analytics", desc:"Cash, UPI, card split", icon: CreditCard },
  { id:"trends", label:"Revenue Trends", desc:"Revenue over time", icon: LC },
  { id:"availability", label:"Dish Availability Log", desc:"When dishes went off", icon: PowerOff },
];

interface OrderRow { id:string; total:number; subtotal:number; tax:number; created_at:string; payment_method:string|null; waiter_name:string|null; items:{name:string;qty:number;price?:number;category?:string}[] }

function ReportsPage() {
  const [active, setActive] = useState<Report>("sales");
  const [from, setFrom] = useState(() => new Date(Date.now()-30*86400000).toISOString().slice(0,10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10));
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    void supabase.from("orders").select("id,total,subtotal,tax,created_at,payment_method,waiter_name,items")
      .gte("created_at", from).lte("created_at", to+"T23:59:59")
      .then(({data}) => data && setOrders(data as unknown as OrderRow[]));
  }, [from, to]);

  return (
    <main className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Reports" subtitle="Sales, menu, and staff analytics" />
      <div className="flex items-center gap-2 mb-5 text-sm">
        <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card" />
        <span>to</span>
        <input type="date" value={to} onChange={(e)=>setTo(e.target.value)} className="h-9 px-3 rounded-md border border-input bg-card" />
        <span className="text-xs text-muted-foreground ml-2">Date range applies to all reports below</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {CARDS.map(({id,label,desc,icon:Icon}) => (
          <button key={id} onClick={()=>setActive(id)} className={`rounded-xl border p-4 text-left transition ${active===id?"border-primary bg-primary/5":"border-border bg-card hover:bg-muted/30"}`}>
            <Icon className="size-5 text-primary mb-2" />
            <div className="font-semibold text-sm">{label}</div>
            <div className="text-xs text-muted-foreground">{desc}</div>
          </button>
        ))}
      </div>
      <ReportContent report={active} orders={orders} />
    </main>
  );
}

function ReportContent({ report, orders }: { report: Report; orders: OrderRow[] }) {
  if (orders.length === 0) {
    return <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground"><Activity className="size-12 mx-auto mb-3 text-muted-foreground" strokeWidth={1.5} />No data yet for this range</div>;
  }
  if (report === "sales") return <Sales orders={orders} />;
  if (report === "menu") return <Menu orders={orders} />;
  if (report === "staff") return <Staff orders={orders} />;
  if (report === "tax") return <Tax orders={orders} />;
  if (report === "category") return <Cat orders={orders} />;
  if (report === "payment") return <Pay orders={orders} />;
  if (report === "trends") return <Trends orders={orders} />;
  if (report === "orders") return <Hours orders={orders} />;
  return <Avail />;
}

function Sales({ orders }: { orders: OrderRow[] }) {
  const revenue = orders.reduce((s,o)=>s+Number(o.total),0);
  const avg = revenue/orders.length;
  const byDay: Record<string,number> = {};
  orders.forEach((o) => { const d = o.created_at.slice(0,10); byDay[d] = (byDay[d]??0) + Number(o.total); });
  const data = Object.entries(byDay).map(([day,revenue]) => ({day, revenue}));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <S label="REVENUE" v={formatINR(revenue)} c="#16A34A" />
        <S label="ORDERS" v={String(orders.length)} c="#2563EB" />
        <S label="AVG" v={formatINR(avg)} c="#7C3AED" />
        <S label="TOP TABLE" v="—" c="#D97706" />
      </div>
      <Card><ResponsiveContainer width="100%" height={260}><BarChart data={data}><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="#14B8A6" /></BarChart></ResponsiveContainer></Card>
    </div>
  );
}
function Menu({ orders }: { orders: OrderRow[] }) {
  const m = new Map<string,{qty:number;rev:number}>();
  orders.forEach((o) => o.items.forEach((it) => { const cur = m.get(it.name)??{qty:0,rev:0}; cur.qty+=it.qty; cur.rev+=(it.price??0)*it.qty; m.set(it.name,cur); }));
  const rows = [...m.entries()].sort((a,b)=>b[1].qty-a[1].qty);
  return <T head={["Dish","Times Ordered","Revenue"]} rows={rows.map(([n,v])=>[n,String(v.qty),formatINR(v.rev)])} />;
}
function Staff({ orders }: { orders: OrderRow[] }) {
  const m = new Map<string,{orders:number;rev:number}>();
  orders.forEach((o) => { const n = o.waiter_name??"—"; const c = m.get(n)??{orders:0,rev:0}; c.orders++; c.rev+=Number(o.total); m.set(n,c); });
  return <T head={["Waiter","Orders Sent","Revenue"]} rows={[...m.entries()].map(([n,v])=>[n,String(v.orders),formatINR(v.rev)])} />;
}
function Tax({ orders }: { orders: OrderRow[] }) {
  const sub = orders.reduce((s,o)=>s+Number(o.subtotal),0);
  const tax = orders.reduce((s,o)=>s+Number(o.tax),0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <S label="REVENUE EXCL TAX" v={formatINR(sub)} c="#2563EB" />
        <S label="GST COLLECTED" v={formatINR(tax)} c="#D97706" />
        <S label="TOTAL INCL TAX" v={formatINR(sub+tax)} c="#16A34A" />
      </div>
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
  return <T head={["Hour","Orders"]} rows={Array.from({length:24}, (_,h)=>[`${h}:00`, String(hours[h]??0)])} />;
}
function Avail() {
  const [rows, setRows] = useState<{dish_name:string;toggled_off_at:string;toggled_on_at:string|null}[]>([]);
  useEffect(()=>{void supabase.from("dish_availability_log").select("dish_name,toggled_off_at,toggled_on_at").order("toggled_off_at",{ascending:false}).then(({data})=>data&&setRows(data));},[]);
  return <T head={["Dish","Off At","Back On","Duration"]} rows={rows.map((r)=>{const dur=r.toggled_on_at?Math.round((new Date(r.toggled_on_at).getTime()-new Date(r.toggled_off_at).getTime())/60000)+"m":"ongoing";return [r.dish_name,new Date(r.toggled_off_at).toLocaleString(),r.toggled_on_at?new Date(r.toggled_on_at).toLocaleString():"—",dur];})} />;
}
function S({label,v,c}:{label:string;v:string;c:string}){return <div className="rounded-xl p-4" style={{background:`${c}15`,border:`1px solid ${c}30`}}><div className="text-[10px] font-semibold tracking-wider" style={{color:c}}>{label}</div><div className="text-xl font-bold mt-1">{v}</div></div>;}
function Card({children}:{children:React.ReactNode}){return <div className="rounded-xl border border-border bg-card p-4">{children}</div>;}
function T({head,rows}:{head:string[];rows:string[][]}){return <div className="rounded-xl border border-border bg-card overflow-hidden"><table className="w-full text-sm"><thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{head.map((h,i)=><th key={i} className={`p-3 ${i===0?"text-left":"text-right"}`}>{h}</th>)}</tr></thead><tbody>{rows.length===0?<tr><td colSpan={head.length} className="p-6 text-center text-muted-foreground">No data</td></tr>:rows.map((r,i)=><tr key={i} className="border-t border-border">{r.map((c,j)=><td key={j} className={`p-3 ${j===0?"text-left":"text-right"}`}>{c}</td>)}</tr>)}</tbody></table></div>;}