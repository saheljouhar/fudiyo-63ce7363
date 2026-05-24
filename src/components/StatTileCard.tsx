import type { LucideIcon } from "lucide-react";

type Tone = "purple" | "green" | "blue" | "amber" | "cyan" | "red" | "gray";

const TONE: Record<Tone, string> = {
  purple: "bg-[#7C3AED]",
  green: "bg-[#16A34A]",
  blue: "bg-[#2563EB]",
  amber: "bg-[#D97706]",
  cyan: "bg-[#0891B2]",
  red: "bg-[#DC2626]",
  gray: "bg-[#6B7280]",
};

export function StatTileCard({
  icon: Icon,
  tone,
  value,
  label,
  sublabel,
}: {
  icon: LucideIcon;
  tone: Tone;
  value: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl bg-card border border-border shadow-card p-5">
      <div className="flex items-center gap-4 mb-3">
        <div className={`size-12 rounded-xl flex items-center justify-center text-white shrink-0 ${TONE[tone]}`}>
          <Icon className="size-6" />
        </div>
        <div className="text-[28px] font-bold leading-none tracking-tight text-foreground">{value}</div>
      </div>
      <div className="text-[13px] text-muted-foreground">{label}</div>
      {sublabel && <div className="text-[12px] text-muted-foreground/80 mt-0.5">{sublabel}</div>}
    </div>
  );
}