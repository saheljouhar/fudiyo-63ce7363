import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

type Ctx = { open: boolean; setOpen: (v: boolean) => void; toggle: () => void };
const SidebarCtx = createContext<Ctx | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Default open only on /dashboard
  const [open, setOpen] = useState<boolean>(false);

  // On every route change: open on /dashboard, otherwise close.
  useEffect(() => {
    setOpen(pathname === "/dashboard" || pathname.startsWith("/dashboard/"));
  }, [pathname]);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  return <SidebarCtx.Provider value={{ open, setOpen, toggle }}>{children}</SidebarCtx.Provider>;
}

export function useSidebarDrawer(): Ctx {
  const c = useContext(SidebarCtx);
  if (!c) return { open: false, setOpen: () => {}, toggle: () => {} };
  return c;
}