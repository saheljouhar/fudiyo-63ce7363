interface Props {
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** In-app confirmation modal (replaces native confirm()). */
export function ConfirmDialog({ title, body, confirmLabel = "Delete", danger = true, onCancel, onConfirm }: Props) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-[#111827] mb-1">{title}</h2>
        <p className="text-sm text-[#64748B] mb-6">{body}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="h-10 px-4 rounded-md border border-gray-300 text-sm font-semibold hover:bg-gray-50">Cancel</button>
          <button
            onClick={onConfirm}
            className={`h-10 px-4 rounded-md text-white text-sm font-semibold ${danger ? "bg-[#DC2626] hover:bg-[#B91C1C]" : "bg-[#0D9488] hover:bg-[#0F766E]"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
