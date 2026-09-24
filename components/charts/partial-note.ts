import { formatBuckets } from "@/lib/data/dates";
import type { CartesianData } from "@/lib/data/prepare";

// The footnote explaining partial buckets (D-026), e.g. "Dashed: the weeks
// commencing 30 Dec 2024 and 29 Dec 2025 cover only part of the date range,
// so their totals run low." Undefined when no bucket is partial.
export function partialNote(data: CartesianData, mark: "Dashed" | "Lighter"): string | undefined {
  const { partial, timeUnit, values } = data.x;
  if (!partial || !timeUnit) return undefined;
  // Each label on its own, so every one carries its year.
  const names = values.filter((_, i) => partial[i]).map((v) => formatBuckets([String(v)], timeUnit)[0] ?? String(v));
  if (names.length === 0) return undefined;
  const one = names.length === 1;
  const list = one ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const subject = timeUnit === "week" ? `the ${one ? "week" : "weeks"} commencing ${list}` : list;
  return `${mark}: ${subject} ${one ? "covers" : "cover"} only part of the date range, so ${one ? "its total runs" : "their totals run"} low.`;
}
