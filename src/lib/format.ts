/** Indian number formatter: 1,00,000 */
export function formatINR(amount: number): string {
  const num = Number(amount) || 0;
  const [whole, dec] = num.toFixed(2).split(".");
  const s = whole;
  let formatted: string;
  if (s.length <= 3) formatted = s;
  else {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3);
    const withCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formatted = `${withCommas},${last3}`;
  }
  return `₹${formatted}.${dec}`;
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function elapsedMinutes(since: string | Date): string {
  const start = typeof since === "string" ? new Date(since) : since;
  const mins = Math.floor((Date.now() - start.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Display label for an order line: "Burger (Big)" when a variant was chosen. */
export function itemLabel(it: { name: string; variant?: string | null }): string {
  return it?.variant ? `${it.name} (${it.variant})` : it?.name ?? "";
}
