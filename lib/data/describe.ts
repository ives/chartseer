import type { ChartSpec, TimeUnit } from "@/lib/spec";
import { formatBuckets } from "./dates";
import type { CartesianData, ChartData, ColumnKind, ScatterData, XValue } from "./prepare";

// A short, deterministic summary of a chart for screen readers: what is
// plotted, the range, and where the largest value is (D-029). It reads the
// prepared data, so it describes exactly what is drawn.

// en-GB digit grouping is stable across runtimes, unlike month names (D-026).
const numberFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

// An x (or per) value as a reader would say it: a period label with a time
// unit ("Jun 2025", "Q3 2025"), "2 Jun 2025" for a plain date, grouped digits
// for a number. Each value is formatted on its own, so it keeps its year.
export function formatXValue(value: XValue, kind: ColumnKind, unit?: TimeUnit): string {
  if (typeof value === "number") return formatNumber(value);
  if (unit) return formatBuckets([value], unit)[0] ?? value;
  if (kind === "date") return /^\d{4}-\d{2}-\d{2}$/.test(value) ? (formatBuckets([value], "day")[0] ?? value) : value.replace("T", " ");
  return value;
}

export function describeChart(spec: ChartSpec, data: ChartData): string {
  return data.type === "scatter" ? describeScatter(spec, data) : describeCartesian(spec, data);
}

function describeCartesian(spec: ChartSpec, data: CartesianData): string {
  const { x } = data;
  const multi = data.series.length > 1;
  const stacked = multi && ((spec.type === "area" && spec.stacked === true) || (spec.type === "bar" && spec.layout === "stacked"));
  const kind = {
    line: "Line chart",
    area: stacked ? "Stacked area chart" : "Area chart",
    bar: stacked ? "Stacked bar chart" : multi ? "Grouped bar chart" : "Bar chart",
  }[data.type];
  // "by week" reads better than the axis title "by Week commencing".
  const byWhat = spec.type !== "scatter" && spec.x.label === undefined && x.timeUnit ? x.timeUnit : x.label;
  const split = multi ? `, split by ${data.seriesLabel ?? "series"} (${list(data.series.map((s) => s.label))})` : "";
  const what = `${kind} of ${data.y.label} by ${byWhat}${split}.`;

  const first = x.values[0];
  const last = x.values[x.values.length - 1];
  if (first === undefined || last === undefined) return `${what} No data matches the filters.`;

  const label = (value: XValue) => formatXValue(value, x.kind, x.timeUnit);
  // After the axis title, "Week commencing: 30 Dec 2024"; on its own, "week commencing 30 Dec 2024".
  const at = (i: number) => {
    const value = x.values[i];
    if (value === undefined) return "";
    return x.timeUnit === "week" ? `week commencing ${label(value)}` : label(value);
  };
  const span =
    x.kind === "category" || x.kind === "text"
      ? `${x.label}: ${x.values.length} ${x.values.length === 1 ? "category" : "categories"}, from ${label(first)} to ${label(last)}.`
      : `${x.label}: ${label(first)} to ${label(last)}.`;

  // Stacks are read by their totals; otherwise every drawn value counts.
  const cells = stacked
    ? x.values.flatMap((_, i) => {
        const present = data.series.map((s) => s.values[i] ?? null).filter((v): v is number => v !== null);
        return present.length === 0 ? [] : [{ value: present.reduce((a, b) => a + b, 0), i, series: undefined }];
      })
    : data.series.flatMap((s) => s.values.flatMap((v, i) => (v === null ? [] : [{ value: v, i, series: multi ? s.label : undefined }])));
  const top = largest(cells);
  if (!top) return `${what} ${span} No values to show.`;
  const min = Math.min(...cells.map((c) => c.value));
  const subject = stacked ? "Totals" : data.y.label;
  const where = `${at(top.i)}${top.series === undefined ? "" : ` for ${top.series}`}`;
  return `${what} ${span} ${subject}: ${formatNumber(min)} to ${formatNumber(top.value)}, highest at ${where}.`;
}

function describeScatter(spec: ChartSpec, data: ScatterData): string {
  const points = data.groups.flatMap((g) => g.points.map((p) => ({ ...p, group: g.key === null ? undefined : g.label })));
  const logAxes = spec.type === "scatter" ? (["x", "y"] as const).filter((a) => spec[a].scale === "log") : [];
  const parts = [
    `${formatNumber(points.length)} ${points.length === 1 ? "point" : "points"}${data.per ? `, one per ${data.per.label}` : ""}`,
    ...(data.groupLabel ? [`grouped by ${data.groupLabel} (${list(data.groups.map((g) => g.label))})`] : []),
    ...(logAxes.length > 0 ? [`${logAxes.join(" and ")} on a log scale`] : []),
  ];
  const what = `Scatter plot of ${data.y.label} against ${data.x.label}, ${parts.join(", ")}.`;

  const top = largest(points.map((p) => ({ ...p, value: p.y })));
  if (!top) return `${what} No data matches the filters.`;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const where = data.per && top.per !== undefined ? formatXValue(top.per, data.per.kind) : `${data.x.label} ${formatNumber(top.x)}`;
  const group = top.group === undefined ? "" : ` (${top.group})`;
  return (
    `${what} ${data.x.label}: ${formatNumber(Math.min(...xs))} to ${formatNumber(Math.max(...xs))}. ` +
    `${data.y.label}: ${formatNumber(Math.min(...ys))} to ${formatNumber(Math.max(...ys))}, highest at ${where}${group}.`
  );
}

// The first of the largest values, so ties go to the earliest.
function largest<T extends { value: number }>(items: T[]): T | undefined {
  return items.reduce<T | undefined>((best, item) => (best === undefined || item.value > best.value ? item : best), undefined);
}

// "a", "a and b", "a, b and c".
function list(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
