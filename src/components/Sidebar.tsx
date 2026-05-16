import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, Grid3x3, ClipboardList, ChefHat, History, UtensilsCrossed, CalendarDays, Users, BarChart3, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";
import { useLang } from "@/lib/i18n";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

type NavItem = { to: string; icon: LucideIcon; label: string; divideAfter?: boolean; roles?: AppRole[] };

const NAV: NavItem[] = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/tables", icon: Grid3x3, label: "Tables" },
  { to: "/orders", icon: ClipboardList, label: "Orders", divideAfter: true },
  { to: "/kitchen", icon: ChefHat, label: "Kitchen" },
  { to: "/history", icon: History, label: "Order History" },
  { to: "/menu", icon: UtensilsCrossed, label: "Menu" },
  { to: "/bookings", icon: CalendarDays, label: "Bookings" },
  { to: "/staff", icon: Users, label: "Staff" },
  { to: "/reports", icon: BarChart3, label: "Reports", divideAfter: true },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { name } = useAuth();
  const [lang, setLang] = useLang();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-16 flex-col bg-sidebar text-sidebar-foreground">
        <div className="h-16 flex items-center justify-center">
          <div className="size-9 rounded-lg bg-primary flex items-center justify-center font-bold text-primary-foreground text-sm">O</div>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-1 py-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <div key={item.to} className="w-full flex flex-col items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.to}
                      className={`group size-10 rounded-lg flex items-center justify-center transition-colors ${
                        active
                          ? "bg-sidebar-active text-sidebar-active-foreground"
                          : "text-sidebar-icon hover:bg-sidebar-active/60 hover:text-sidebar-active-foreground"
                      }`}
                    >
                      <Icon className="size-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
                {item.divideAfter && <div className="w-6 my-2 border-t border-white/10" />}
              </div>
            );
          })}
        </nav>
        <div className="py-3 flex flex-col items-center gap-2 border-t border-white/10">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setLang(lang === "en" ? "ml" : "en")}
                className="size-8 rounded-md text-xs font-semibold text-sidebar-icon hover:text-white hover:bg-sidebar-active"
              >
                {lang === "en" ? "EN" : "ML"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Language</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="size-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                {name?.[0]?.toUpperCase() ?? "U"}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{name || "User"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="size-8 rounded-md text-sidebar-icon hover:text-white hover:bg-sidebar-active flex items-center justify-center"
              >
                <LogOut className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Log out</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground border-t border-white/10 flex justify-around py-2">
        {NAV.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center px-3 py-1 rounded-md text-[10px] gap-0.5 ${
                active ? "text-white" : "text-sidebar-icon"
              }`}
            >
              <Icon className="size-5" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}