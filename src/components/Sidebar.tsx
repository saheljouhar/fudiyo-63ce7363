import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Home, Receipt, ClipboardList, Flame, Grid3x3, UtensilsCrossed, Package,
  UserRound, CalendarCheck, CalendarDays, Users, BarChart3, Settings, LogOut,
  DoorOpen, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
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
  { to: "/history", icon: ClipboardList, label: "Orders", color: "#EA580C" },
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

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { name, role } = useAuth();
  const [lang, setLang] = useLang();
  const { open, setOpen } = useSidebarDrawer();

  const logout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const width = 220;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ transitionDuration: open ? "200ms" : "150ms" }}
        aria-hidden={!open}
      />
      <aside
        className="fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-[#E2E8F0] shadow-2xl"
        style={{
          width,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: open ? "transform 200ms ease" : "transform 150ms ease",
        }}
        aria-hidden={!open}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-3 border-b border-[#F1F5F9]">
          <div className="size-9 rounded-lg bg-[#0D9488] flex items-center justify-center font-bold text-white text-sm shrink-0">F</div>
          <div className="ml-2.5 font-semibold tracking-tight text-[#111827] text-[15px]">Fudiyo</div>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto size-9 rounded-md hover:bg-[#F1F5F9] inline-flex items-center justify-center text-[#6B7280]"
            aria-label="Close sidebar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <div key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={`relative mx-2 my-0.5 flex items-center gap-3 rounded-md transition-colors h-12 px-3 ${active ? "" : "hover:bg-[#F1F5F9]"}`}
                  style={
                    active
                      ? { backgroundColor: hexA(item.color, 0.1), color: item.color }
                      : { color: "#6B7280" }
                  }
                >
                  {active && (
                    <span
                      className="absolute left-[-8px] top-1.5 bottom-1.5 w-[3px] rounded-r"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <Icon
                    className="size-5 shrink-0"
                    style={{ color: active ? item.color : item.color }}
                  />
                  <span
                    className="text-[15px] font-medium truncate"
                    style={{ color: active ? item.color : "#374151" }}
                  >
                    {item.label}
                  </span>
                </Link>
                {item.divideAfter && <div className="my-2 border-t border-[#F1F5F9] mx-3" />}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#F1F5F9] p-2 flex flex-col gap-2">
          <button
            onClick={() => setLang(lang === "en" ? "ml" : "en")}
            className="h-9 rounded-full bg-[#F1F5F9] text-[12px] font-semibold text-[#374151] hover:bg-[#E2E8F0] inline-flex items-center justify-center px-3 self-start"
            title="Language"
          >
            {lang === "en" ? "EN · English" : "ML · മലയാളം"}
          </button>

          <div className="flex items-center gap-2 px-1">
            <div className="size-8 rounded-full bg-[#0D9488] text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#111827] truncate">{name || "User"}</div>
              <div className="text-[11px] text-[#6B7280] capitalize truncate">{role || "—"}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="h-11 inline-flex items-center gap-2 rounded-md text-[#DC2626] hover:bg-[#FEE2E2] text-[14px] font-semibold px-3"
            title="Log out"
          >
            <DoorOpen className="size-5" />
            <span>Log out</span>
          </button>

          <button
            onClick={() => setOpen(false)}
            className="h-9 inline-flex items-center justify-center rounded-md text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F1F5F9]"
            title="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>
      </aside>
    </>
  );
}

// LogOut import is unused now (we use DoorOpen). Keep for backwards compat.
void LogOut;

function hexA(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
