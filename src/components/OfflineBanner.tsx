import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  if (online) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-destructive text-destructive-foreground text-center text-xs font-medium py-2 px-4">
      ⚠ No internet connection — working offline. Changes will sync when reconnected.
    </div>
  );
}