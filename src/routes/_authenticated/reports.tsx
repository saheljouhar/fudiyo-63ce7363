import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/reports")({
  component: () => (
    <main className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Reports" subtitle="Sales, items, waiter performance" />
      <ComingSoon title="Reports" blurb="9 report types with export — coming in Phase 4." />
    </main>
  ),
  head: () => ({ meta: [{ title: "Reports — Fudiyo" }] }),
});