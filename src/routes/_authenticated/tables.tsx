import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/tables")({
  component: () => (
    <main className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Table Management" subtitle="ORBIS Kitchen" />
      <ComingSoon title="Tables" blurb="Floor view, live status grid, take orders, request bills — coming in Phase 2." />
    </main>
  ),
  head: () => ({ meta: [{ title: "Tables — ORBIS" }] }),
});