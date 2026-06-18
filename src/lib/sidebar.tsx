import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const LS_COLLAPSED = "fudiyo.sidebar.collapsed";

type Ctx = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  toggle: () => void;
  // Back-compat aliases (older code calls `open`/`setOpen`/`toggle`)
  open: boolean;
  setOpen: (v: boolean) => void;
};
const SidebarCtx = createContext<Ctx | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(LS_COLLAPSED);
    if (stored !== null) return stored === "1";
    return window.innerWidth < 1024; // collapsed by default on tablets
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS_COLLAPSED, collapsed ? "1" : "0");
  }, [collapsed]);
  const toggle = useCallback(() => setCollapsed((v) => !v), []);
  const value: Ctx = {
    collapsed, setCollapsed, toggle,
    open: !collapsed, setOpen: (v: boolean) => setCollapsed(!v),
  };
  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
}

export function useSidebarDrawer(): Ctx {
  const c = useContext(SidebarCtx);
  if (!c) return {
    collapsed: false, setCollapsed: () => {}, toggle: () => {},
    open: true, setOpen: () => {},
  };
  return c;
}