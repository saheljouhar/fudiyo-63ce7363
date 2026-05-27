import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff")({
  component: StaffPage,
  head: () => ({ meta: [{ title: "Staff — Fudiyo" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
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

function AddStaffModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "waiter" as Role, password: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name || !form.email || form.password.length < 8) {
      toast.error("All fields required, password ≥ 8 chars"); return;
    }
    setSaving(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } },
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").upsert({ id: userId, name: form.name, email: form.email });
      await supabase.from("user_roles").insert({ user_id: userId, role: form.role });
    }
    setSaving(false);
    toast.success("Staff member created");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Add Staff Member</h2>
        <div className="space-y-3">
          <div><label className="text-xs font-semibold text-muted-foreground">Full name</label><input className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Email</label><input type="email" className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Role</label>
            <select className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="waiter">Waiter</option><option value="kitchen">Kitchen</option><option value="accountant">Accountant</option><option value="manager">Manager</option>
            </select>
          </div>
          <div><label className="text-xs font-semibold text-muted-foreground">Temporary password</label><input type="text" className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 8 chars" /></div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 h-10 rounded-md border border-input text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{saving ? "Creating..." : "Create Account"}</button>
        </div>
      </div>
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
  return <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Weekly shift calendar ships next phase.</div>;
}