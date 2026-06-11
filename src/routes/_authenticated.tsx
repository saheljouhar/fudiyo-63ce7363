import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { AnnouncementBell } from "@/components/AnnouncementBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { SidebarProvider, useSidebarDrawer } from "@/lib/sidebar";
import { Menu } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } as never });
    }
  },
  component: Layout,
});

function Layout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <div className="min-h-screen w-full">
          <TopBar />
          <div className="px-6"><AnnouncementBanner /></div>
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}

function TopBar() {
  const { toggle } = useSidebarDrawer();
  return (
    <div className="flex items-center justify-between px-4 md:px-6 pt-4">
      <button
        onClick={toggle}
        aria-label="Open menu"
        className="size-11 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#374151]"
      >
        <Menu className="size-5" />
      </button>
      <AnnouncementBell />
    </div>
  );
}