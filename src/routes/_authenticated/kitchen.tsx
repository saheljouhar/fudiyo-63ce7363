import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/kitchen")({
  component: () => (
    <main className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Kitchen Display" subtitle="Live order tickets" />
      <ComingSoon title="Kitchen" blurb="Dark theme KDS with status tabs, real-time flash + beep, wake lock — coming in Phase 2." />
    </main>
  ),
  head: () => ({ meta: [{ title: "Kitchen — Fudiyo" }] }),
});