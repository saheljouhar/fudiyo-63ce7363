import { useMemo, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/format";
import { Modal, Fld, inputCls, areaCls, ModalFooter, useLocalList } from "./ui";

export interface ProcItem { id: string; name: string; unit: string; unit_cost: number; supplier: string | null; quantity: number; category: string; low_stock_threshold: number }
interface LineItem { itemId: string; qty: number }

export interface Supplier { id: string; name: string; contact: string; phone: string; email: string; address: string; terms: string; notes: string }
export interface PurchaseOrder { id: string; code: string; supplier: string; expected: string; items: LineItem[]; notes: string; createdAt: string }
interface Requisition { id: string; priority: string; reason: string; items: LineItem[]; notes: string; createdAt: string }
interface GRN { id: string; poId: string; notes: string; createdAt: string }
interface Invoice { id: string; supplier: string; number: string; date: string; total: number; items: LineItem[]; notes: string; createdAt: string }
interface SupplierReturn { id: string; poId: string; supplier: string; type: string; reason: string; items: LineItem[]; notes: string; createdAt: string }
interface Transfer { id: string; from: string; to: string; items: LineItem[]; reason: string; notes: string; createdAt: string }

const SUBS = ["Suppliers", "Purchase Orders", "Requisitions", "Goods Receipt", "Invoices", "Returns", "Transfers"] as const;
type Sub = (typeof SUBS)[number];
const ADD_LABEL: Record<Sub, string> = {
  Suppliers: "Add Supplier", "Purchase Orders": "Create Purchase Order", Requisitions: "Add Requisition",
  "Goods Receipt": "Add GRN", Invoices: "Add Invoice", Returns: "Add Return", Transfers: "Add Transfer",
};

export function ProcurementTab({ items, onReload }: { items: ProcItem[]; onReload: () => void }) {
  const [sub, setSub] = useState<Sub>("Suppliers");
  const [open, setOpen] = useState(false);

  const suppliers = useLocalList<Supplier>("fudiyo.suppliers");
  const pos = useLocalList<PurchaseOrder>("fudiyo.purchaseOrders");
  const reqs = useLocalList<Requisition>("fudiyo.requisitions");
  const grns = useLocalList<GRN>("fudiyo.grns");
  const invoices = useLocalList<Invoice>("fudiyo.invoices");
  const returns = useLocalList<SupplierReturn>("fudiyo.returns");
  const transfers = useLocalList<Transfer>("fudiyo.transfers");

  const derivedSuppliers = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    for (const i of items) {
      const key = i.supplier || "Unassigned";
      if (!map[key]) map[key] = { count: 0, value: 0 };
      map[key].count += 1;
      map[key].value += Number(i.quantity) * Number(i.unit_cost);
    }
    return Object.entries(map);
  }, [items]);

  const supplierNames = useMemo(
    () => Array.from(new Set([...suppliers.list.map((s) => s.name), ...items.map((i) => i.supplier).filter(Boolean) as string[]])),
    [suppliers.list, items],
  );

  const close = () => setOpen(false);

  return (
    <div className="space-y-5">
      <div className="flex gap-1 flex-wrap border-b border-[#E2E8F0]">
        {SUBS.map((s) => (
          <button key={s} onClick={() => setSub(s)} className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${sub === s ? "border-[#0D9488] text-[#0D9488]" : "border-transparent text-[#64748B]"}`}>{s}</button>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold">{sub}</h3>
        <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-md bg-[#0D9488] hover:bg-[#0B7F75] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Plus className="size-4" /> {ADD_LABEL[sub]}</button>
      </div>

      {sub === "Suppliers" && (
        suppliers.list.length === 0 && derivedSuppliers.length === 0 ? <Empty text="No suppliers yet." /> : (
          <div className="grid md:grid-cols-3 gap-3">
            {suppliers.list.map((s) => (
              <div key={s.id} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                <div className="text-sm font-bold text-[#111827]">{s.name}</div>
                <div className="text-xs text-[#64748B] mt-1">{s.contact || "—"}{s.phone ? ` · ${s.phone}` : ""}</div>
                <div className="text-xs text-[#64748B] mt-1">{s.terms || "No terms"}</div>
              </div>
            ))}
            {derivedSuppliers.map(([name, s]) => (
              <div key={name} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                <div className="text-sm font-bold text-[#111827]">{name}</div>
                <div className="text-xs text-[#64748B] mt-1">{s.count} items · {formatINR(s.value)}</div>
              </div>
            ))}
          </div>
        )
      )}
      {sub === "Purchase Orders" && <SimpleList rows={pos.list.map((p) => ({ id: p.id, title: `${p.code} · ${p.supplier}`, sub: `${p.items.length} items · expected ${p.expected || "—"}` }))} empty="No purchase orders yet." />}
      {sub === "Requisitions" && <SimpleList rows={reqs.list.map((r) => ({ id: r.id, title: `${r.priority} priority`, sub: `${r.items.length} items · ${r.reason || "No reason"}` }))} empty="No requisitions yet." />}
      {sub === "Goods Receipt" && <SimpleList rows={grns.list.map((g) => ({ id: g.id, title: pos.list.find((p) => p.id === g.poId)?.code ?? "GRN", sub: g.notes || "Received" }))} empty="No goods receipt notes yet." />}
      {sub === "Invoices" && <SimpleList rows={invoices.list.map((v) => ({ id: v.id, title: `${v.number || "Invoice"} · ${v.supplier}`, sub: `${v.date || "—"} · ${formatINR(v.total)}` }))} empty="No invoices yet." />}
      {sub === "Returns" && <SimpleList rows={returns.list.map((r) => ({ id: r.id, title: `${r.supplier || "Supplier"} · ${r.type}`, sub: `${r.items.length} items · ${r.reason || "No reason"}` }))} empty="No returns yet." />}
      {sub === "Transfers" && <SimpleList rows={transfers.list.map((t) => ({ id: t.id, title: `${t.from} → ${t.to}`, sub: `${t.items.length} items · ${t.reason || "No reason"}` }))} empty="No transfers yet." />}

      {open && sub === "Suppliers" && <AddSupplierModal onClose={close} onSave={(s) => { suppliers.push(s); toast.success("Supplier added"); }} />}
      {open && sub === "Purchase Orders" && <CreatePOModal items={items} suppliers={supplierNames} onClose={close} onSave={(p) => { pos.push(p); toast.success("Purchase order created"); }} />}
      {open && sub === "Requisitions" && <RequisitionModal items={items} onClose={close} onSave={(r) => { reqs.push(r); toast.success("Requisition created"); }} />}
      {open && sub === "Goods Receipt" && <GRNModal pos={pos.list} onClose={close} onSave={(g) => { grns.push(g); toast.success("GRN created"); onReload(); }} />}
      {open && sub === "Invoices" && <InvoiceModal items={items} suppliers={supplierNames} onClose={close} onSave={(v) => { invoices.push(v); toast.success("Invoice saved"); }} />}
      {open && sub === "Returns" && <ReturnModal items={items} pos={pos.list} suppliers={supplierNames} onClose={close} onSave={(r) => { returns.push(r); toast.success("Return created"); }} />}
      {open && sub === "Transfers" && <TransferModal items={items} onClose={close} onSave={(t) => { transfers.push(t); toast.success("Transfer created"); }} />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center text-sm text-[#64748B]">{text}</div>;
}
function SimpleList({ rows, empty }: { rows: { id: string; title: string; sub: string }[]; empty: string }) {
  if (rows.length === 0) return <Empty text={empty} />;
  return (
    <div className="grid md:grid-cols-3 gap-3">
      {rows.map((r) => (
        <div key={r.id} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <div className="text-sm font-bold text-[#111827]">{r.title}</div>
          <div className="text-xs text-[#64748B] mt-1">{r.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- shared item-line editor ---------- */
function ItemLines({ items, lines, setLines, label, empty }: { items: ProcItem[]; lines: LineItem[]; setLines: (f: (l: LineItem[]) => LineItem[]) => void; label: string; empty: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</div>
        <button onClick={() => setLines((l) => [...l, { itemId: "", qty: 1 }])} className="h-8 px-3 rounded-md bg-[#0D9488] text-white text-xs font-semibold inline-flex items-center gap-1"><Plus className="size-3.5" /> Add Item</button>
      </div>
      {lines.length === 0 ? <div className="text-sm text-[#64748B] border rounded-md p-3">{empty}</div> : (
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <select value={l.itemId} onChange={(e) => setLines((rows) => rows.map((r, j) => (j === i ? { ...r, itemId: e.target.value } : r)))} className="h-10 px-2 rounded-md border border-[#E2E8F0] text-sm flex-1">
                <option value="">Select item</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
              </select>
              <input type="number" value={l.qty} onChange={(e) => setLines((rows) => rows.map((r, j) => (j === i ? { ...r, qty: Number(e.target.value) } : r)))} className="h-10 px-2 rounded-md border border-[#E2E8F0] text-sm w-24" />
              <button onClick={() => setLines((rows) => rows.filter((_, j) => j !== i))} className="size-10 rounded-md border text-[#DC2626] inline-flex items-center justify-center"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const nowId = () => crypto.randomUUID();

/* a) Add Supplier */
function AddSupplierModal({ onClose, onSave }: { onClose: () => void; onSave: (s: Supplier) => void }) {
  const [f, setF] = useState({ name: "", contact: "", phone: "", email: "", address: "", terms: "Net 30", notes: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const save = async () => {
    if (!f.name.trim() || !f.contact.trim()) return toast.error("Name and contact person are required");
    onSave({ id: nowId(), ...f });
    onClose();
  };
  return (
    <Modal title="Add Supplier" onClose={onClose}>
      <div className="p-5 space-y-3">
        <Fld label="Name *"><input value={f.name} onChange={set("name")} className={inputCls} /></Fld>
        <Fld label="Contact Person *"><input value={f.contact} onChange={set("contact")} className={inputCls} /></Fld>
        <div className="grid grid-cols-2 gap-3">
          <Fld label="Phone"><input value={f.phone} onChange={set("phone")} className={inputCls} /></Fld>
          <Fld label="Email"><input value={f.email} onChange={set("email")} className={inputCls} /></Fld>
        </div>
        <Fld label="Address"><textarea value={f.address} onChange={set("address")} className={areaCls} /></Fld>
        <Fld label="Payment Terms">
          <select value={f.terms} onChange={set("terms")} className={inputCls}>
            {["Net 15", "Net 30", "Net 45", "Net 60", "Cash on Delivery", "Advance"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Fld>
        <Fld label="Notes"><textarea value={f.notes} onChange={set("notes")} className={areaCls} placeholder="Optional notes..." /></Fld>
      </div>
      <ModalFooter onClose={onClose} onSave={() => void save()} saveLabel="Add Supplier" />
    </Modal>
  );
}

/* b) Create Purchase Order */
function CreatePOModal({ items, suppliers, onClose, onSave }: { items: ProcItem[]; suppliers: string[]; onClose: () => void; onSave: (p: PurchaseOrder) => void }) {
  const [supplier, setSupplier] = useState("");
  const [expected, setExpected] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  const save = () => {
    if (!supplier) return toast.error("Select a supplier");
    if (lines.filter((l) => l.itemId).length === 0) return toast.error("Add at least one item");
    onSave({ id: nowId(), code: `PO-${Date.now().toString(36).slice(-5).toUpperCase()}`, supplier, expected, items: lines.filter((l) => l.itemId), notes, createdAt: new Date().toISOString() });
    onClose();
  };
  return (
    <Modal title="Create Purchase Order" onClose={onClose} width="max-w-xl">
      <div className="p-5 space-y-3">
        <Fld label="Supplier *">
          <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls}>
            <option value="">Select supplier</option>{suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Fld>
        <Fld label="Expected Delivery Date"><input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className={inputCls} /></Fld>
        <ItemLines items={items} lines={lines} setLines={setLines} label="Items *" empty="No items added yet" />
        <Fld label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={areaCls} placeholder="Optional notes..." /></Fld>
      </div>
      <ModalFooter onClose={onClose} onSave={save} saveLabel="Create Order" />
    </Modal>
  );
}

/* c) Requisition */
function RequisitionModal({ items, onClose, onSave }: { items: ProcItem[]; onClose: () => void; onSave: (r: Requisition) => void }) {
  const [priority, setPriority] = useState("Medium");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Add Purchase Requisition" onClose={onClose} width="max-w-xl">
      <div className="p-5 space-y-3">
        <Fld label="Priority">
          <div className="flex flex-wrap gap-1.5">
            {["Low", "Medium", "High", "Urgent"].map((p) => (
              <button key={p} onClick={() => setPriority(p)} className={`h-8 px-3 rounded-full text-[12px] font-semibold border ${priority === p ? "bg-[#0D9488] text-white border-[#0D9488]" : "bg-white border-[#E5E7EB]"}`}>{p}</button>
            ))}
          </div>
        </Fld>
        <Fld label="Reason"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={areaCls} placeholder="Why is this needed?" /></Fld>
        <ItemLines items={items} lines={lines} setLines={setLines} label="Items Needed" empty="No items added yet" />
        <Fld label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={areaCls} placeholder="Optional notes..." /></Fld>
      </div>
      <ModalFooter onClose={onClose} saveLabel="Create Requisition" onSave={() => { onSave({ id: nowId(), priority, reason, items: lines.filter((l) => l.itemId), notes, createdAt: new Date().toISOString() }); onClose(); }} />
    </Modal>
  );
}

/* d) GRN */
function GRNModal({ pos, onClose, onSave }: { pos: PurchaseOrder[]; onClose: () => void; onSave: (g: GRN) => void }) {
  const [poId, setPoId] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Add Goods Received Note" onClose={onClose}>
      <div className="p-5 space-y-3">
        <Fld label="Purchase Order *">
          <select value={poId} onChange={(e) => setPoId(e.target.value)} className={inputCls}>
            <option value="">Select purchase order</option>{pos.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.supplier}</option>)}
          </select>
        </Fld>
        <Fld label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={areaCls} placeholder="Optional notes..." /></Fld>
      </div>
      <ModalFooter onClose={onClose} saveLabel="Create GRN" onSave={() => {
        if (!poId) return toast.error("Select a purchase order");
        onSave({ id: nowId(), poId, notes, createdAt: new Date().toISOString() }); onClose();
      }} />
    </Modal>
  );
}

/* e) Supplier Invoice */
function InvoiceModal({ items, suppliers, onClose, onSave }: { items: ProcItem[]; suppliers: string[]; onClose: () => void; onSave: (v: Invoice) => void }) {
  const [supplier, setSupplier] = useState("");
  const [number, setNumber] = useState("");
  const [date, setDate] = useState("");
  const [total, setTotal] = useState(0);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Add Supplier Invoice" onClose={onClose} width="max-w-xl">
      <div className="p-5 space-y-3">
        <div className="border-2 border-dashed border-[#CBD5E1] rounded-xl p-6 text-center bg-[#F8FAFC]">
          <Upload className="size-7 mx-auto text-[#0D9488]" />
          <div className="text-sm font-semibold mt-2">Scan Invoice (OCR)</div>
          <div className="text-[11px] text-[#64748B] mt-1">Upload a photo to auto-fill fields</div>
          <input type="file" accept="image/*,.pdf" className="mt-3 text-xs mx-auto block" onChange={() => toast.info("Scanning is not enabled yet — fill the fields manually")} />
        </div>
        <Fld label="Supplier">
          <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls}>
            <option value="">Select supplier</option>{suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Fld>
        <div className="grid grid-cols-2 gap-3">
          <Fld label="Invoice Number"><input value={number} onChange={(e) => setNumber(e.target.value)} className={inputCls} /></Fld>
          <Fld label="Invoice Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Fld>
        </div>
        <Fld label="Total Amount"><input type="number" value={total} onChange={(e) => setTotal(Number(e.target.value))} className={inputCls} /></Fld>
        <ItemLines items={items} lines={lines} setLines={setLines} label="Items" empty="No items added yet. Use OCR or add manually." />
        <Fld label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={areaCls} placeholder="Optional notes..." /></Fld>
      </div>
      <ModalFooter onClose={onClose} saveLabel="Save Invoice" onSave={() => { onSave({ id: nowId(), supplier, number, date, total, items: lines.filter((l) => l.itemId), notes, createdAt: new Date().toISOString() }); onClose(); }} />
    </Modal>
  );
}

/* f) Supplier Return */
function ReturnModal({ items, pos, suppliers, onClose, onSave }: { items: ProcItem[]; pos: PurchaseOrder[]; suppliers: string[]; onClose: () => void; onSave: (r: SupplierReturn) => void }) {
  const [poId, setPoId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [type, setType] = useState("Damaged");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Add Supplier Return" onClose={onClose} width="max-w-xl">
      <div className="p-5 space-y-3">
        <Fld label="Purchase Order">
          <select value={poId} onChange={(e) => setPoId(e.target.value)} className={inputCls}>
            <option value="">Select purchase order (optional)</option>{pos.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.supplier}</option>)}
          </select>
        </Fld>
        <Fld label="Supplier">
          <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls}>
            <option value="">Select supplier</option>{suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Fld>
        <Fld label="Return Type">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            {["Damaged", "Expired", "Wrong Item", "Quality Issue", "Excess Stock"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Fld>
        <Fld label="Reason"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={areaCls} /></Fld>
        <ItemLines items={items} lines={lines} setLines={setLines} label="Items to Return" empty="No items added yet" />
        <Fld label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={areaCls} placeholder="Optional notes..." /></Fld>
      </div>
      <ModalFooter onClose={onClose} saveLabel="Create Return" onSave={() => { onSave({ id: nowId(), poId, supplier, type, reason, items: lines.filter((l) => l.itemId), notes, createdAt: new Date().toISOString() }); onClose(); }} />
    </Modal>
  );
}

/* g) Stock Transfer */
function TransferModal({ items, onClose, onSave }: { items: ProcItem[]; onClose: () => void; onSave: (t: Transfer) => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Modal title="Add Stock Transfer" onClose={onClose} width="max-w-xl">
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Fld label="From Location *"><input value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} placeholder="e.g. Main Store" /></Fld>
          <Fld label="To Location *"><input value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} placeholder="e.g. Kitchen" /></Fld>
        </div>
        <ItemLines items={items} lines={lines} setLines={setLines} label="Items to Transfer" empty="No items added yet" />
        <Fld label="Reason"><textarea value={reason} onChange={(e) => setReason(e.target.value)} className={areaCls} /></Fld>
        <Fld label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={areaCls} placeholder="Optional notes..." /></Fld>
      </div>
      <ModalFooter onClose={onClose} saveLabel="Create Transfer" onSave={() => {
        if (!from.trim() || !to.trim()) return toast.error("From and To locations are required");
        onSave({ id: nowId(), from, to, items: lines.filter((l) => l.itemId), reason, notes, createdAt: new Date().toISOString() }); onClose();
      }} />
    </Modal>
  );
}

/** kept so the module has a single Supabase touchpoint for future persistence */
export async function refreshSuppliersFromDb() {
  const { data } = await supabase.from("inventory_items").select("supplier");
  return Array.from(new Set((data ?? []).map((d) => d.supplier).filter(Boolean) as string[]));
}
