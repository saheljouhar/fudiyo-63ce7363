import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, ComingSoon } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/bookings")({
  component: () => (
    <main className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Bookings" subtitle="Reservations & party planning" />
      <ComingSoon title="Bookings" blurb="Calendar view, customer details, table assignment — coming in Phase 4." />
    </main>
  ),
  head: () => ({ meta: [{ title: "Bookings — Fudiyo" }] }),
});