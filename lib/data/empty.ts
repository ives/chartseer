import { type ChartSpec, type ColumnSummary, type DatasetSummary, type Filter, editDistance } from "@/lib/spec";
import { formatNumber, formatXValue } from "./describe";
import type { Row } from "./infer";
import { type LabelMeta, columnLabel, inlineLabel } from "./labels";
import { type ChartData, filterRows } from "./prepare";

// Why a valid chart has nothing to draw, in words the user and the model can
// act on (D-046). Pure: it reads the rows, the spec and the prepared data.

export type EmptyChart =
  // `request` is what "Ask Chartseer to fix it" sends into the chat.
  | { kind: "filter"; message: string; request: string }
  | { kind: "no-values"; message: string };

const MAX_CLOSE_VALUES = 3;

// Null when there is something to draw.
export function explainEmpty(
  rows: Row[],
  dataset: DatasetSummary,
  spec: ChartSpec,
  data: ChartData,
  meta: LabelMeta = {},
): EmptyChart | null {
  if (hasValues(data)) return null;
  const filters = spec.filters ?? [];
  const kept = filterRows(rows, filters);
  if (kept.length === 0 && filters.length > 0) {
    const message = filterMessage(rows, dataset, filters, meta);
    return { kind: "filter", message, request: `${message} Please fix the ${filters.length === 1 ? "filter" : "filters"}.` };
  }
  return { kind: "no-values", message: noValuesMessage(kept, spec, meta) };
}

function hasValues(data: ChartData): boolean {
  return data.type === "scatter"
    ? data.groups.some((g) => g.points.length > 0)
    : data.series.some((s) => s.values.some((v) => v !== null));
}

// The first filter that matches nothing on its own, with a hint; otherwise the
// filters only clash when combined.
function filterMessage(rows: Row[], dataset: DatasetSummary, filters: Filter[], meta: LabelMeta): string {
  const columnOf = (filter: Filter) => dataset.columns.find((c) => c.name === filter.field);
  const said = (filter: Filter) => `${inlineLabel(columnLabel(filter.field, meta))} ${condition(filter, columnOf(filter))}`;

  const culprit = filters.find((filter) => filterRows(rows, [filter]).length === 0);
  if (!culprit) return `No row matches all the filters together: ${filters.map(said).join("; ")}.`;
  const column = columnOf(culprit);
  const hint = column ? hintFor(culprit, column, rows, meta) : "";
  return `No rows where ${said(culprit)}.${hint}`;
}

function condition(filter: Filter, column: ColumnSummary | undefined): string {
  const date = column?.kind === "date";
  const value = (v: string | number) => shown(v, column);
  switch (filter.op) {
    case "eq":
      return `is ${value(filter.value)}`;
    case "neq":
      return `is not ${value(filter.value)}`;
    case "in":
      return `is one of ${filter.values.map(value).join(", ")}`;
    case "gt":
      return `${date ? "is after" : "is over"} ${value(filter.value)}`;
    case "gte":
      return `${date ? "is on or after" : "is at least"} ${value(filter.value)}`;
    case "lt":
      return `${date ? "is before" : "is under"} ${value(filter.value)}`;
    case "lte":
      return `${date ? "is on or before" : "is at most"} ${value(filter.value)}`;
    default: {
      const unreachable: never = filter;
      throw new Error(`Unknown filter: ${JSON.stringify(unreachable)}`);
    }
  }
}

// Dates as a reader says them, numbers grouped, text quoted.
function shown(value: string | number, column: ColumnSummary | undefined): string {
  if (typeof value === "number") return formatNumber(value);
  if (column?.kind === "date") return formatXValue(value, "date");
  return `'${value}'`;
}

// Close values for text, or the column's span for dates and numbers.
function hintFor(filter: Filter, column: ColumnSummary, rows: Row[], meta: LabelMeta): string {
  if (column.kind === "date" || column.kind === "number") {
    if (column.min === undefined || column.max === undefined) return "";
    const what = column.kind === "date" ? "The dates" : `Values of ${inlineLabel(columnLabel(column.name, meta))}`;
    return ` ${what} run from ${shown(column.min, column)} to ${shown(column.max, column)}.`;
  }
  const wanted = filter.op === "eq" || filter.op === "neq" ? [filter.value] : filter.op === "in" ? filter.values : [];
  const candidates = [...new Set(rows.map((row) => row[column.name]).filter((v): v is string => typeof v === "string"))];
  const close = [...new Set(wanted.flatMap((v) => (typeof v === "string" ? closeValues(v, candidates) : [])))].slice(
    0,
    MAX_CLOSE_VALUES,
  );
  return close.length > 0 ? ` Closest values in the data: ${close.map((v) => `'${v}'`).join(", ")}.` : "";
}

// Values within a few edits of `value`, closest first. Each is also compared
// by its start, so "Waterlo Road" finds "Waterloo Road, Waterloo".
export function closeValues(value: string, candidates: readonly string[], limit = MAX_CLOSE_VALUES): string[] {
  const target = value.toLowerCase();
  const threshold = Math.max(2, Math.floor(value.length / 3));
  return candidates
    .map((candidate) => {
      const lower = candidate.toLowerCase();
      const whole = editDistance(target, lower);
      const start = editDistance(target, lower.slice(0, target.length + 1));
      return { candidate, score: Math.min(whole, start), whole };
    })
    .filter(({ score }) => score <= threshold)
    .sort((a, b) => a.score - b.score || a.whole - b.whole)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

// Rows survived the filters, but a column the chart needs is empty in all of them.
function noValuesMessage(kept: Row[], spec: ChartSpec, meta: LabelMeta): string {
  if (kept.length === 0) return "Nothing to plot: the dataset has no rows.";
  const fields = [
    spec.type === "scatter" ? (spec.per?.field ?? spec.x.field) : spec.x.field,
    "field" in spec.y ? spec.y.field : undefined,
    spec.type === "scatter" ? spec.group?.field : spec.series?.field,
  ].filter((f): f is string => f !== undefined);
  const empty = fields.find((field) => kept.every((row) => (row[field] ?? null) === null));
  const rows = kept.length === 1 ? "the only matching row" : `all ${formatNumber(kept.length)} matching rows`;
  return empty
    ? `Nothing to plot: ${inlineLabel(columnLabel(empty, meta))} is empty in ${rows}.`
    : "Nothing to plot: the columns this chart needs have no values in the same rows.";
}
