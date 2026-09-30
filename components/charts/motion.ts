import type { ChartData } from "@/lib/data/prepare";
import type { ChartSpec } from "@/lib/spec";

// How a chart moves when a refinement replaces it (D-053): marks ease to their
// new places when they correspond, otherwise the old chart fades out over the new.
export type TransitionKind = "ease" | "crossfade";

type Drawn = { spec: ChartSpec; data: ChartData };

export function transitionKind(previous: Drawn, next: Drawn): TransitionKind {
  const [a, b] = [previous.spec, next.spec];
  if (a.type !== b.type || previous.data.type !== next.data.type) return "crossfade";
  if (a.type === "bar" && b.type === "bar") {
    // Bars are keyed by category and series, so new ones can appear among old ones.
    return (a.orientation ?? "vertical") === (b.orientation ?? "vertical") ? "ease" : "crossfade";
  }
  if (a.type === "scatter" || previous.data.type === "scatter" || next.data.type === "scatter") return "crossfade";
  if (a.type === "area" && b.type === "area" && (a.stacked === true) !== (b.stacked === true)) return "crossfade";
  // A line or area eases only point for point: the same x values and series.
  const [p, n] = [previous.data, next.data];
  const sameX = p.x.kind === n.x.kind && p.x.values.length === n.x.values.length && p.x.values.every((v, i) => v === n.x.values[i]);
  const sameSeries = p.series.length === n.series.length && p.series.every((s, i) => s.key === n.series[i]?.key);
  return sameX && sameSeries ? "ease" : "crossfade";
}
