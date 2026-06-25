import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
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
  const isOrders = path.startsWith("/orders");
  const { collapsed, setCollapsed } = useSidebarDrawer();
  const lastWasOrders = useRef(false);
  // When entering /orders, default sidebar to closed (overlay drawer)
  useEffect(() => {
    if (isOrders && !lastWasOrders.current) setCollapsed(true);
    lastWasOrders.current = isOrders;
  }, [isOrders, setCollapsed]);
  const offset = isOrders ? 0 : (collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED);
  const showSidebar = isOrders ? !collapsed : true;
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {isOrders && !collapsed && (
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40"
        />
      )}
      {showSidebar && <Sidebar />}
      <div
        className="min-h-screen"
        style={{ marginLeft: offset, transition: "margin-left 180ms ease" }}
      >
        {!isOrders && (
          <div className="flex items-center justify-end px-4 md:px-6 pt-4">
            <AnnouncementBell />
          </div>
        )}
        {!isOrders && <div className="px-6"><AnnouncementBanner /></div>}
        <Outlet />
      </div>
    </div>
  );
}