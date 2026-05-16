import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </header>
  );
}

export function ComingSoon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
      <div className="inline-flex size-12 rounded-full bg-primary/10 text-primary items-center justify-center mb-4 font-bold">
        {title[0]}
      </div>
      <h2 className="text-base font-semibold mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{blurb}</p>
      <p className="text-xs text-muted-foreground mt-4">Shipping next phase.</p>
    </div>
  );
}