import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { AnnouncementBell } from "@/components/AnnouncementBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-16 pb-16 md:pb-0 min-h-screen">
        <div className="flex justify-end px-6 pt-4">
          <AnnouncementBell />
        </div>
        <div className="px-6"><AnnouncementBanner /></div>
        <Outlet />
      </div>
    </div>
  );
}