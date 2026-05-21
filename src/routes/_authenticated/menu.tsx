import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/menu")({
  component: () => (
    <main className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Menu Management" subtitle="Dishes, availability, photos" />
      <ComingSoon title="Menu" blurb="Grid view, photo upload, availability toggle, CRUD — coming in Phase 3." />
    </main>
  ),
  head: () => ({ meta: [{ title: "Menu — ORBIS" }] }),
});