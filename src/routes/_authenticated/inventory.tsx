import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
  head: () => ({ meta: [{ title: "Inventory — Fudiyo" }] }),
});

function InventoryPage() {
  return (
    <main className="p-6 max-w-[1400px] mx-auto">
      <PageHeader title="Inventory" subtitle="Track stock and waste" />
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <Package className="size-12 text-[#0D9488] mx-auto mb-3" />
        <h2 className="text-base font-semibold mb-1">Inventory management coming soon</h2>
        <p className="text-sm text-[#64748B]">Add items, track stock levels, and log waste.</p>
      </div>
    </main>
  );
}
