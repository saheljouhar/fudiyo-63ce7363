import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
  head: () => ({ meta: [{ title: "Customers — Fudiyo" }] }),
});

function CustomersPage() {
  return (
    <main className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Customers" subtitle="Loyalty and history" />
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <UserRound className="size-12 text-[#2563EB] mx-auto mb-3" />
        <h2 className="text-base font-semibold mb-1">Customer management coming soon</h2>
        <p className="text-sm text-[#64748B]">Track customer profiles, visit history, and loyalty.</p>
      </div>
    </main>
  );
}
