import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from "@/components/Sidebar";
import { AnnouncementBell } from "@/components/AnnouncementBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { SidebarProvider, useSidebarDrawer } from "@/lib/sidebar";

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
      <LayoutInner />
    </SidebarProvider>
  );
}

function LayoutInner() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hideChrome = path.startsWith("/orders");
  const { collapsed } = useSidebarDrawer();
  const offset = hideChrome ? 0 : (collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED);
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {!hideChrome && <Sidebar />}
      <div
        className="min-h-screen"
        style={{ marginLeft: offset, transition: "margin-left 180ms ease" }}
      >
        {!hideChrome && (
          <div className="flex items-center justify-end px-4 md:px-6 pt-4">
            <AnnouncementBell />
          </div>
        )}
        {!hideChrome && <div className="px-6"><AnnouncementBanner /></div>}
        <Outlet />
      </div>
    </div>
  );
}