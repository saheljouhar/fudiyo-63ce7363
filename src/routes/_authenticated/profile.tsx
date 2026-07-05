import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRound, Mail, Phone, Shield, Pencil, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — Fudiyo" }] }),
});

function ProfilePage() {
  const { user, role, name } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user || !draft.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name: draft.trim() }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setEditing(false);
  };

  const provider = user?.app_metadata?.provider === "google" ? "Google Account" : "Email & Password";

  return (
    <main className="p-6 max-w-[900px] mx-auto space-y-5">
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 flex items-center gap-4">
        <div className="size-12 rounded-xl bg-[#0D9488]/10 text-[#0D9488] inline-flex items-center justify-center">
          <UserRound className="size-6" />
        </div>
        <div>
          <h1 className="text-[24px] font-bold text-[#111827]">Profile</h1>
          <p className="text-[14px] text-[#64748B]">View and manage your account information</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 flex items-center gap-5">
        <div className="size-20 rounded-full bg-[#0D9488] text-white text-3xl font-bold flex items-center justify-center shrink-0">
          {(name || user?.email || "U")[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                className="flex-1 h-10 rounded-md border border-[#E2E8F0] px-3 text-[16px]" autoFocus />
              <button onClick={save} disabled={saving}
                className="h-10 px-4 rounded-md bg-[#0D9488] text-white text-[13px] font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                <Check className="size-4" /> Save
              </button>
            </div>
          ) : (
            <>
              <div className="text-[20px] font-bold text-[#111827] truncate">{name || "—"}</div>
              <div className="mt-1 inline-flex items-center gap-2">
                {role && (
                  <span className="text-[12px] font-semibold px-2.5 py-0.5 rounded-full border border-[#0D9488]/40 text-[#0D9488] capitalize">
                    {role}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        {!editing && (
          <button onClick={() => { setDraft(name); setEditing(true); }}
            className="h-9 px-3 rounded-md border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] inline-flex items-center gap-1">
            <Pencil className="size-4" /> Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoCard label="Email Address" icon={<Mail className="size-5" />} iconBg="#FEE2E2" iconFg="#DC2626" value={user?.email ?? "—"} />

        <div className="rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-lg bg-[#2563EB]/15 text-[#2563EB] inline-flex items-center justify-center">
              <Phone className="size-5" />
            </div>
            <div className="text-[13px] font-semibold uppercase text-[#1E40AF]">Link Phone Number</div>
          </div>
          <p className="text-[13px] text-[#1E3A8A] mb-3">Link your phone number to enable phone OTP login.</p>
          <button onClick={() => toast("Phone linking coming soon")}
            className="w-full h-10 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold">
            Link Phone
          </button>
        </div>

        <InfoCard label="User ID" icon={<UserRound className="size-5" />} iconBg="#DBEAFE" iconFg="#2563EB"
          value={<span className="font-mono text-[12px]">{user?.id ?? "—"}</span>} />
        <InfoCard label="Login Method" icon={<Shield className="size-5" />} iconBg="#EDE9FE" iconFg="#7C3AED" value={provider} />
      </div>
    </main>
  );
}

function InfoCard({ label, icon, iconBg, iconFg, value }: {
  label: string; icon: React.ReactNode; iconBg: string; iconFg: string; value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-10 rounded-lg inline-flex items-center justify-center" style={{ background: iconBg, color: iconFg }}>
          {icon}
        </div>
        <div className="text-[12px] font-semibold uppercase text-[#64748B] tracking-wide">{label}</div>
      </div>
      <div className="text-[15px] font-medium text-[#111827] break-all">{value}</div>
    </div>
  );
}