import type { Range } from "@/domain/types";

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Renders a range as "12" when min === max, otherwise "12–18". */
export function formatRange(r: Range): string {
  if (!isFinite(r.min) || !isFinite(r.max)) return "—";
  if (r.min === r.max) return formatNumber(r.min);
  return `${formatNumber(r.min)}–${formatNumber(r.max)}`;
}

/** Converts an event-local hour index (0..8) to a clock label like "10:00 AM". */
export function hourLabel(hourIndex: number, startLocal: number): string {
  const hour24 = startLocal + hourIndex;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${hour12}:00 ${period}`;
}
