import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/history")({
  validateSearch: (s: Record<string, unknown>) => ({ table: (s.table as string) ?? undefined }),
  component: () => (
    <main className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Order History & Billing" subtitle="Filters, expandable orders, split bill, void" />
      <ComingSoon title="Order History" blurb="Pending bills, split bill, void with reason — coming in Phase 2." />
    </main>
  ),
  head: () => ({ meta: [{ title: "History — ORBIS" }] }),
});