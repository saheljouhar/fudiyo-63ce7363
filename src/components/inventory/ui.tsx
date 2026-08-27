import { X } from "lucide-react";
import { useEffect, useState } from "react";

export function Modal({ title, onClose, children, width = "max-w-lg", headerColor }: { title: string; onClose: () => void; children: React.ReactNode; width?: string; headerColor?: string }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className={`px-5 py-3 flex items-center justify-between ${headerColor ? "text-white" : "border-b"}`} style={headerColor ? { backgroundColor: headerColor } : undefined}>
          <h2 className="text-base font-bold">{title}</h2>
          <button onClick={onClose} className={`size-8 rounded inline-flex items-center justify-center ${headerColor ? "hover:bg-white/10" : "hover:bg-gray-100"}`}><X className="size-4" /></button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mb-1">{label}</div>{children}</div>;
}

export const inputCls = "w-full h-10 px-3 rounded-md border border-[#E2E8F0] bg-white text-sm";
export const areaCls = "w-full min-h-[76px] p-3 rounded-md border border-[#E2E8F0] bg-white text-sm resize-y";

export function ModalFooter({ onClose, onSave, saveLabel, color = "#0D9488", disabled }: { onClose: () => void; onSave: () => void; saveLabel: string; color?: string; disabled?: boolean }) {
  return (
    <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
      <button onClick={onClose} className="h-10 px-4 rounded-md border bg-white text-sm font-semibold">Cancel</button>
      <button onClick={onSave} disabled={disabled} style={{ backgroundColor: color }}
        className="h-10 px-5 rounded-md text-white text-sm font-semibold disabled:opacity-50">{saveLabel}</button>
    </div>
  );
}

/** Simple localStorage-backed list state (procurement + recipes until backed by tables). */
export function useLocalList<T>(key: string) {
  const [list, setList] = useState<T[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setList(JSON.parse(raw) as T[]);
    } catch { /* ignore */ }
  }, [key]);
  const push = (row: T) => setList((l) => {
    const next = [row, ...l];
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  return { list, push };
}
