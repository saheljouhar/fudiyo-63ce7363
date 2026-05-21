import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/staff")({
  component: () => (
    <main className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Staff" subtitle="Accounts, attendance, shifts" />
      <ComingSoon title="Staff" blurb="Create staff accounts, mark attendance, schedule shifts — coming in Phase 3." />
    </main>
  ),
  head: () => ({ meta: [{ title: "Staff — ORBIS" }] }),
});