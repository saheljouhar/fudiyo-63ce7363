import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/settings")({
  component: () => (
    <main className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Settings" subtitle="Restaurant, billing, printers, language" />
      <ComingSoon title="Settings" blurb="Six tabs including EN / ML language toggle — coming in Phase 4." />
    </main>
  ),
  head: () => ({ meta: [{ title: "Settings — Fudiyo" }] }),
});