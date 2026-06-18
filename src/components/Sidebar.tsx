import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home, Receipt, ClipboardList, Flame, Grid3x3, UtensilsCrossed, Package,
  UserRound, CalendarCheck, CalendarDays, Users, BarChart3, Settings,
  DoorOpen, ChevronLeft, ChevronRight, Menu as MenuIcon, UtensilsCrossed as ForkIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSidebarDrawer } from "@/lib/sidebar";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  color: string;
  divideAfter?: boolean;
  search?: Record<string, string>;
};

const NAV: NavItem[] = [
  { to: "/dashboard", icon: Home, label: "Home", color: "#7C3AED", divideAfter: true },
  { to: "/orders", icon: Receipt, label: "Dashboard Billing", color: "#DC2626" },
  { to: "/history", icon: ClipboardList, label: "Orders", color: "#F59E0B" },
  { to: "/kitchen", icon: Flame, label: "Kitchen", color: "#EF4444", divideAfter: true },
  { to: "/tables", icon: Grid3x3, label: "Tables", color: "#475569" },
  { to: "/menu", icon: UtensilsCrossed, label: "Menu", color: "#16A34A" },
  { to: "/inventory", icon: Package, label: "Inventory", color: "#0D9488" },
  { to: "/customers", icon: UserRound, label: "Customers", color: "#2563EB" },
  { to: "/attendance", icon: CalendarCheck, label: "Attendance", color: "#DB2777" },
  { to: "/bookings", icon: CalendarDays, label: "Bookings", color: "#4F46E5", divideAfter: true },
  { to: "/staff", icon: Users, label: "Staff", color: "#0891B2" },
  { to: "/reports", icon: BarChart3, label: "Reports", color: "#D97706" },
  { to: "/settings", icon: Settings, label: "Settings", color: "#6B7280" },
];

export const SIDEBAR_WIDTH_EXPANDED = 220;
export const SIDEBAR_WIDTH_COLLAPSED = 60;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { name, role } = useAuth();
  const { collapsed, setCollapsed, toggle } = useSidebarDrawer();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col bg-white border-r border-[#E2E8F0]"
      style={{ width, transition: "width 180ms ease" }}
    >
      {/* Brand row */}
      <div className="h-16 flex items-center px-3 border-b border-[#F1F5F9] gap-2">
        {!collapsed && (
          <>
            <button onClick={toggle} aria-label="Toggle sidebar" className="size-8 rounded-md hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#6B7280] shrink-0">
              <MenuIcon className="size-5" />
            </button>
            <div className="size-8 rounded-lg bg-[#DC2626] flex items-center justify-center text-white shrink-0">
              <ForkIcon className="size-4" />
            </div>
            <div className="font-bold tracking-tight text-[#111827] text-[16px]">Fudiyo</div>
            <button onClick={() => setCollapsed(true)} className="ml-auto size-7 rounded-md hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#6B7280]" aria-label="Collapse">
              <ChevronLeft className="size-4" />
            </button>
          </>
        )}
        {collapsed && (
          <div className="mx-auto size-8 rounded-lg bg-[#DC2626] flex items-center justify-center text-white">
            <ForkIcon className="size-4" />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const content = (
            <Link
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center h-12 ${collapsed ? "justify-center" : "px-4 gap-3"} ${active ? "" : "hover:bg-[#F9FAFB]"}`}
              style={active ? { backgroundColor: hexA(item.color, 0.12) } : undefined}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: item.color }} />
              )}
              {collapsed && active && (
                <span className="absolute inset-y-1 inset-x-2 rounded-md" style={{ backgroundColor: hexA(item.color, 0.18) }} />
              )}
              <Icon className="size-5 shrink-0 relative" style={{ color: item.color }} />
              {!collapsed && (
                <span className="text-[14px] font-medium truncate relative" style={{ color: active ? item.color : "#374151" }}>
                  {item.label}
                </span>
              )}
            </Link>
          );
          return (
            <div key={item.to}>
              {content}
              {item.divideAfter && !collapsed && <div className="my-1 border-t border-[#F1F5F9] mx-3" />}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#F1F5F9] p-2 flex flex-col gap-2">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="size-9 rounded-full bg-[#0D9488] text-white text-sm font-semibold flex items-center justify-center shrink-0">
                {name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-[#111827] truncate">{name || "User"}</div>
                <div className="text-[12px] text-[#6B7280] capitalize truncate">{role || "—"}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA] text-[14px] font-semibold"
            >
              <DoorOpen className="size-4" /> Logout
            </button>
            <button
              onClick={() => setCollapsed(true)}
              className="h-10 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#F1F5F9] text-[#6B7280] hover:bg-[#E2E8F0] text-[13px] font-medium"
            >
              <ChevronLeft className="size-4" /> Collapse Menu
            </button>
          </>
        ) : (
          <>
            <div className="size-9 mx-auto rounded-full bg-[#0D9488] text-white text-sm font-semibold flex items-center justify-center">
              {name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <button
              onClick={() => setCollapsed(false)}
              title="Expand"
              className="size-9 mx-auto rounded-md bg-[#F1F5F9] text-[#6B7280] hover:bg-[#E2E8F0] inline-flex items-center justify-center"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function hexA(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
