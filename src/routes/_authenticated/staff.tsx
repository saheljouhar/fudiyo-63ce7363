import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Users, Eye, EyeOff, X, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
  head: () => ({ meta: [{ title: "Staff — Fudiyo" }] }),
  validateSearch: (s: Record<string, unknown>): { tab?: "accounts" | "attendance" | "shifts" } => ({
    tab: (s.tab as "accounts" | "attendance" | "shifts" | undefined) ?? undefined,
  }),
});

type Tab = "accounts" | "attendance" | "shifts";
type Role = "waiter" | "kitchen" | "accountant" | "manager";

interface Profile { id: string; name: string; email: string; is_active: boolean }
interface RoleRow { user_id: string; role: Role }

const ROLE_TINT: Record<Role, string> = {
  waiter: "bg-[#2563EB]/10 text-[#2563EB]",
  kitchen: "bg-[#D97706]/10 text-[#D97706]",
  accountant: "bg-[#7C3AED]/10 text-[#7C3AED]",
  manager: "bg-[#0D9488]/10 text-[#0D9488]",
};

function StaffPage() {
  const { tab: initialTab } = Route.useSearch();
  const [tab, setTab] = useState<Tab>(initialTab ?? "accounts");
  return (
    <main className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Staff" subtitle="Accounts, attendance, shifts" />
      <div className="border-b border-border mb-6 flex gap-1">
        {(["accounts", "attendance", "shifts"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "accounts" && <Accounts />}
      {tab === "attendance" && <Attendance />}
      {tab === "shifts" && <Shifts />}
    </main>
  );
}

function Accounts() {
  const [staff, setStaff] = useState<(Profile & { role: Role | null })[]>([]);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id,name,email,is_active"),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const roleMap = new Map((roles as RoleRow[] ?? []).map((r) => [r.user_id, r.role]));
    setStaff((profiles as Profile[] ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? null })));
  };
  useEffect(() => { void load(); }, []);

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={() => setAdding(true)} className="h-9 px-4 inline-flex items-center gap-2 rounded-md bg-cta text-cta-foreground text-sm font-semibold">
          <Plus className="size-4" /> Add Staff Member
        </button>
      </div>
      {staff.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Users className="size-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No staff yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add your first staff member</p>
          <button onClick={() => setAdding(true)} className="h-9 px-4 inline-flex items-center rounded-md bg-primary text-primary-foreground text-sm font-semibold">Add Staff</button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <div className="size-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{s.name[0]?.toUpperCase()}</div>
                    {s.name}
                  </td>
                  <td className="px-4 py-3">
                    {s.role && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_TINT[s.role]}`}>{s.role}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.is_active ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#DC2626]/10 text-[#DC2626]"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adding && <AddStaffModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </>
  );
}

const ROLE_DESC: Record<Role, string> = {
  waiter: "Access to Dashboard Billing and Tables only",
  kitchen: "Access to Kitchen Display only",
  accountant: "Access to Dashboard Billing, Orders, and Reports",
  manager: "Full access to all pages",
};

function AddStaffModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", role: "waiter" as Role,
    password: "", confirm: "", pin: "", active: true,
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name || !form.email) return toast.error("Name and email are required");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    if (form.pin && !/^\d{4}$/.test(form.pin)) return toast.error("PIN must be 4 digits");
    setSaving(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } },
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({ id: userId, name: form.name, email: form.email, is_active: form.active });
      await supabase.from("user_roles").insert({ user_id: userId, role: form.role });
    }
    setSaving(false);
    toast.success("Staff account created");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="bg-[#0D9488] text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold">Add Staff Member</h2>
          <button onClick={onClose} className="size-8 rounded hover:bg-white/10 inline-flex items-center justify-center"><X className="size-4" /></button>
        </div>
        <div className="p-6 space-y-3">
          <Field label="Full Name *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 px-3 rounded-md border border-[#E2E8F0] text-sm" /></Field>
          <Field label="Email Address *" hint="This becomes their login email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-10 px-3 rounded-md border border-[#E2E8F0] text-sm" /></Field>
          <Field label="Phone Number"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-10 px-3 rounded-md border border-[#E2E8F0] text-sm" /></Field>
          <Field label="Role *">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="w-full h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm">
              <option value="waiter">Waiter</option>
              <option value="kitchen">Kitchen Staff</option>
              <option value="accountant">Accountant</option>
              <option value="manager">Manager</option>
            </select>
            <div className="mt-1 text-xs text-[#64748B]">{ROLE_DESC[form.role]}</div>
          </Field>
          <Field label="Password *">
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 8 chars" className="w-full h-10 px-3 pr-10 rounded-md border border-[#E2E8F0] text-sm" />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 size-7 inline-flex items-center justify-center text-[#6B7280]">
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm Password *">
            <div className="relative">
              <input type={showPw2 ? "text" : "password"} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="w-full h-10 px-3 pr-10 rounded-md border border-[#E2E8F0] text-sm" />
              <button type="button" onClick={() => setShowPw2((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 size-7 inline-flex items-center justify-center text-[#6B7280]">
                {showPw2 ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          <Field label="PIN (optional)" hint="4-digit numeric for quick login on shared devices">
            <input inputMode="numeric" maxLength={4} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} className="w-full h-10 px-3 rounded-md border border-[#E2E8F0] text-sm" />
          </Field>
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <span className={`relative inline-block w-10 h-5 rounded-full transition ${form.active ? "bg-[#0D9488]" : "bg-[#CBD5E1]"}`}>
              <input type="checkbox" className="sr-only" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full transition-transform ${form.active ? "translate-x-5" : ""}`} />
            </span>
            <span className="text-sm font-semibold text-[#111827]">Active</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-md border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB]">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-md bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold disabled:opacity-50">
            {saving ? "Creating..." : "Create Staff Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#374151]">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <div className="mt-1 text-xs text-[#94A3B8]">{hint}</div>}
    </div>
  );
}

function Attendance() {
  return (
    <>
      <div className="text-sm text-muted-foreground mb-4">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl bg-[#16A34A]/10 border border-[#16A34A]/30 p-4"><div className="text-2xl font-bold text-[#16A34A]">0</div><div className="text-xs text-muted-foreground mt-1">Present</div></div>
        <div className="rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 p-4"><div className="text-2xl font-bold text-[#DC2626]">0</div><div className="text-xs text-muted-foreground mt-1">Absent</div></div>
        <div className="rounded-xl bg-[#D97706]/10 border border-[#D97706]/30 p-4"><div className="text-2xl font-bold text-[#D97706]">0</div><div className="text-xs text-muted-foreground mt-1">Late</div></div>
        <div className="rounded-xl bg-[#2563EB]/10 border border-[#2563EB]/30 p-4"><div className="text-2xl font-bold text-[#2563EB]">0</div><div className="text-xs text-muted-foreground mt-1">On Leave</div></div>
      </div>
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No attendance logged today.</div>
    </>
  );
}

function Shifts() {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#111827]">Shifts</h2>
        <button onClick={() => toast("Add Shift coming soon")} className="h-9 px-3 rounded-md bg-[#0D9488] hover:bg-[#0F766E] text-white text-sm font-semibold inline-flex items-center gap-1">
          <Plus className="size-4" /> Add Shift
        </button>
      </div>
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-10 text-center">
        <Clock className="size-10 mx-auto text-[#CBD5E1] mb-2" />
        <div className="text-sm font-semibold text-[#111827]">No shifts created yet</div>
        <div className="text-xs text-[#64748B] mt-1">Create shifts to manage staff working hours.</div>
      </div>
    </>
  );
}