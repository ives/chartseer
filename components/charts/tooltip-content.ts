import { formatNumber, formatXValue } from "@/lib/data/describe";
import type { CartesianData, ScatterData } from "@/lib/data/prepare";

// What a tooltip says, built from the prepared data with the same formatting
// as the table and the description (D-052). Pure, so it is tested directly.

export type TooltipRow = { label: string; value: string; color?: string };
export type TooltipContent = {
  // The x value, e.g. "Week commencing: 30 Dec 2024"; absent for an ungrouped scatter.
  title?: string;
  // The measure the rows share, e.g. "Sum of revenue (£)", when there are several series.
  heading?: string;
  rows: TooltipRow[];
  // A caveat, e.g. that a partial week runs low.
  note?: string;
};

const NO_DATA = "no data";

// One x value of a line or area chart, with every series' value at it.
export function cartesianTooltip(data: CartesianData, index: number, color: (series: number) => string): TooltipContent {
  const multi = data.series.length > 1;
  return {
    title: xTitle(data, index),
    ...(multi && { heading: data.y.label }),
    rows: data.series.map((s, i) => ({
      label: multi ? s.label : data.y.label,
      value: valueText(s.values[index] ?? null),
      ...(multi && { color: color(i) }),
    })),
    ...partialNote(data, index),
  };
}

// One bar or stacked segment; a stack adds its total.
export function barTooltip(
  data: CartesianData,
  category: number,
  series: number,
  stacked: boolean,
  color: (series: number) => string,
): TooltipContent {
  const multi = data.series.length > 1;
  const value = data.series[series]?.values[category] ?? null;
  const rows: TooltipRow[] = [
    { label: multi ? (data.series[series]?.label ?? "") : data.y.label, value: valueText(value), ...(multi && { color: color(series) }) },
  ];
  if (stacked && multi) {
    const present = data.series.map((s) => s.values[category] ?? null).filter((v): v is number => v !== null);
    rows.push({ label: "Total", value: valueText(present.length > 0 ? present.reduce((a, b) => a + b, 0) : null) });
  }
  return { title: xTitle(data, category), ...(multi && { heading: data.y.label }), rows, ...partialNote(data, category) };
}

// One scatter point: what it stands for, both measures, and its group.
export function scatterTooltip(data: ScatterData, group: number, point: number, color: (group: number) => string): TooltipContent {
  const g = data.groups[group];
  const p = g?.points[point];
  if (!g || !p) return { rows: [] };
  const rows: TooltipRow[] = [
    { label: data.x.label, value: formatNumber(p.x) },
    { label: data.y.label, value: formatNumber(p.y) },
  ];
  if (data.groupLabel) rows.push({ label: data.groupLabel, value: g.label, color: color(group) });
  const title = data.per && p.per !== undefined ? `${data.per.label}: ${formatXValue(p.per, data.per.kind)}` : undefined;
  return { ...(title && { title }), rows };
}

// The index of the position closest to `at`; -1 when there are none.
export function nearestIndex(positions: readonly number[], at: number): number {
  let best = -1;
  let bestDistance = Infinity;
  positions.forEach((p, i) => {
    const distance = Math.abs(p - at);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

function xTitle(data: CartesianData, index: number): string {
  const value = data.x.values[index];
  return value === undefined ? data.x.label : `${data.x.label}: ${formatXValue(value, data.x.kind, data.x.timeUnit)}`;
}

function valueText(value: number | null): string {
  return value === null ? NO_DATA : formatNumber(value);
}

// Partial buckets (D-026) run low; the tooltip says so where the chart dashes or fades them.
function partialNote(data: CartesianData, index: number): { note?: string } {
  if (!data.x.partial?.[index]) return {};
  return { note: `Partial ${data.x.timeUnit ?? "period"}: covers only part of the range, so it runs low.` };
}
