import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/orders")({
  validateSearch: (s: Record<string, unknown>) => ({ table: (s.table as string) ?? undefined }),
  component: () => (
    <main className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Order Taking" subtitle="3-column POS — category nav, dish grid, cart" />
      <ComingSoon title="Order Taking" blurb="Pick category → tap dishes → review cart → send to kitchen. Shipping next in Phase 2." />
    </main>
  ),
  head: () => ({ meta: [{ title: "Orders — ORBIS" }] }),
});