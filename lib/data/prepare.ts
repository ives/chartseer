import {
  type Annotation,
  type ChartSpec,
  type ColumnSummary,
  type DatasetSummary,
  type Filter,
  type TimeUnit,
  bucketEnd,
  bucketStart,
  requestedRange,
} from "@/lib/spec";
import type { Row } from "./infer";
import { type LabelMeta, columnLabel } from "./labels";

// The one pipeline from typed rows to chart-ready data:
// filter → bucket → group and aggregate → sort → limit → shape.
// Scales and stack layout are the renderer's job (D-021).

export type ColumnKind = ColumnSummary["kind"];
export type XValue = string | number;

export type SeriesData = {
  // The series column's value; null when the spec has no series.
  key: XValue | null;
  label: string;
  // One per x value, in the same order. Null where no rows exist, never 0.
  values: (number | null)[];
};

export type CartesianData = {
  type: "line" | "area" | "bar";
  x: {
    field: string;
    label: string;
    kind: ColumnKind;
    // With a time unit, each value is the first day of its bucket (D-026).
    values: XValue[];
    timeUnit?: TimeUnit;
    // Parallel to values; present only when some bucket is partial (D-026).
    partial?: boolean[];
  };
  y: { label: string };
  seriesLabel?: string;
  series: SeriesData[];
  annotations: Annotation[];
};

export type ScatterPoint = { x: number; y: number; per?: XValue };

export type ScatterGroup = {
  // The group column's value; null when the spec has no group.
  key: XValue | null;
  label: string;
  points: ScatterPoint[];
};

export type ScatterData = {
  type: "scatter";
  x: { label: string };
  y: { label: string };
  per?: { field: string; label: string; kind: ColumnKind };
  groupLabel?: string;
  groups: ScatterGroup[];
};

export type ChartData = CartesianData | ScatterData;

type Cell = Row[string];
type Aggregate = "count" | "sum" | "mean" | "median" | "min" | "max";
type AggregateOf = { aggregate?: Aggregate; field?: string };
type CartesianSpec = Extract<ChartSpec, { type: "line" | "area" | "bar" }>;
type ScatterSpec = Extract<ChartSpec, { type: "scatter" }>;
type ScatterAxis = ScatterSpec["x"];

// Expects a spec that has passed parseSpec for this dataset. `meta` supplies
// display labels; without it, labels are derived from column names (D-025).
export function prepareChartData(rows: Row[], dataset: DatasetSummary, spec: ChartSpec, meta: LabelMeta = {}): ChartData {
  const kept = filterRows(rows, spec.filters ?? []);
  switch (spec.type) {
    case "line":
    case "area":
    case "bar":
      return prepareCartesian(kept, dataset, spec, meta);
    case "scatter":
      return prepareScatter(kept, dataset, spec, meta);
    default: {
      const unreachable: never = spec;
      throw new Error(`Unknown chart type: ${JSON.stringify(unreachable)}`);
    }
  }
}

export function filterRows(rows: Row[], filters: Filter[]): Row[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) => filters.every((filter) => matches(row[filter.field] ?? null, filter)));
}

// A null cell fails every op except neq (D-021).
function matches(cell: Cell, filter: Filter): boolean {
  switch (filter.op) {
    case "eq":
      return cell === filter.value;
    case "neq":
      return cell !== filter.value;
    case "in":
      return cell !== null && filter.values.includes(cell);
    case "gt":
      return cell !== null && compare(cell, filter.value) > 0;
    case "gte":
      return cell !== null && compare(cell, filter.value) >= 0;
    case "lt":
      return cell !== null && compare(cell, filter.value) < 0;
    case "lte":
      return cell !== null && compare(cell, filter.value) <= 0;
    default: {
      const unreachable: never = filter;
      throw new Error(`Unknown filter: ${JSON.stringify(unreachable)}`);
    }
  }
}

// Numbers numerically; dates as ISO strings, whose text order is time order.
function compare(a: XValue, b: XValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const [sa, sb] = [String(a), String(b)];
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function prepareCartesian(rows: Row[], dataset: DatasetSummary, spec: CartesianSpec, meta: LabelMeta): CartesianData {
  const xColumn = findColumn(dataset, spec.x.field);
  const seriesColumn = spec.series ? findColumn(dataset, spec.series.field) : undefined;
  const unit = spec.x.timeUnit;
  // Filters have already run on the raw dates, so "in 2025" means exactly that.
  const toBucket = (value: XValue): XValue => (unit && typeof value === "string" ? bucketStart(value, unit) : value);

  // Group by x, then series. Rows with a null x or series value are dropped.
  const groups = new Map<XValue, Map<XValue | null, Row[]>>();
  const seriesSeen = new Set<XValue>();
  for (const row of rows) {
    const cell = row[xColumn.name] ?? null;
    if (cell === null) continue;
    const x = toBucket(cell);
    let key: XValue | null = null;
    if (seriesColumn) {
      key = row[seriesColumn.name] ?? null;
      if (key === null) continue;
      seriesSeen.add(key);
    }
    const byKey = groups.get(x) ?? new Map<XValue | null, Row[]>();
    groups.set(x, byKey);
    const bucket = byKey.get(key) ?? [];
    byKey.set(key, bucket);
    bucket.push(row);
  }

  const yLabel = aggregateLabel(spec.y, meta);
  let xValues = naturalOrder([...groups.keys()], xColumn);
  const keys = seriesColumn ? naturalOrder([...seriesSeen], seriesColumn) : [null];
  let series: SeriesData[] = keys.map((key) => ({
    key,
    label: key === null ? yLabel : String(key),
    values: xValues.map((x) => {
      const bucket = groups.get(x)?.get(key);
      return bucket ? aggregate(bucket, spec.y) : null;
    }),
  }));

  if (spec.type === "bar") {
    let order = xValues.map((_, i) => i);
    if (spec.sort === "asc" || spec.sort === "desc") {
      const totals = order.map((i) => total(series.map((s) => s.values[i] ?? null)));
      const direction = spec.sort === "asc" ? 1 : -1;
      // Array.prototype.sort is stable, so ties keep natural order. Nulls go last.
      order = order.sort((a, b) => {
        const [ta, tb] = [totals[a] ?? null, totals[b] ?? null];
        if (ta === null || tb === null) return (ta === null ? 1 : 0) - (tb === null ? 1 : 0);
        return (ta - tb) * direction;
      });
    }
    if (spec.limit !== undefined) order = order.slice(0, spec.limit);
    xValues = pick(xValues, order);
    series = series.map((s) => ({ ...s, values: pick(s.values, order) }));
  }

  const partial = unit ? partialBuckets(xValues, unit, xColumn, spec) : undefined;
  return {
    type: spec.type,
    x: {
      field: xColumn.name,
      label: spec.x.label ?? (unit ? UNIT_LABELS[unit] : columnLabel(xColumn.name, meta)),
      kind: xColumn.kind,
      values: xValues,
      ...(unit && { timeUnit: unit }),
      ...(partial && { partial }),
    },
    y: { label: yLabel },
    ...(seriesColumn && { seriesLabel: columnLabel(seriesColumn.name, meta) }),
    series,
    // Moved to the start of their bucket, so they land on a bar or point.
    annotations: (spec.annotations ?? []).map((a) =>
      a.kind === "point" ? { ...a, x: toBucket(a.x) } : { ...a, from: toBucket(a.from), to: toBucket(a.to) },
    ),
  };
}

const UNIT_LABELS: Record<TimeUnit, string> = {
  day: "Day",
  week: "Week commencing",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

// A bucket reaching past the dates the spec asks for holds only some of its
// days, so a sum or count there runs low; the renderer marks it (D-026).
// Other aggregates don't shrink with fewer days. A gap in the data, such as
// a closure, is real and not flagged.
function partialBuckets(values: XValue[], unit: TimeUnit, column: ColumnSummary, spec: CartesianSpec): boolean[] | undefined {
  if (spec.y.aggregate !== "sum" && spec.y.aggregate !== "count") return undefined;
  const range = requestedRange(column, spec.filters ?? []);
  if (!range) return undefined;
  const flags = values.map((v) => String(v) < range.from || bucketEnd(String(v), unit) > range.to);
  return flags.some(Boolean) ? flags : undefined;
}

function prepareScatter(rows: Row[], dataset: DatasetSummary, spec: ScatterSpec, meta: LabelMeta): ScatterData {
  const groupColumn = spec.group ? findColumn(dataset, spec.group.field) : undefined;
  const points = new Map<XValue | null, ScatterPoint[]>();
  const add = (key: XValue | null, point: ScatterPoint) => {
    const list = points.get(key) ?? [];
    points.set(key, list);
    list.push(point);
  };
  // The row's group key, or undefined if the row has no group value and is dropped.
  const groupOf = (row: Row): XValue | null | undefined =>
    groupColumn ? (row[groupColumn.name] ?? undefined) : null;

  let per: ScatterData["per"];
  if (!spec.per) {
    const xField = axisField(spec.x);
    const yField = axisField(spec.y);
    for (const row of rows) {
      const [x, y, key] = [row[xField], row[yField], groupOf(row)];
      if (typeof x === "number" && typeof y === "number" && key !== undefined) add(key, { x, y });
    }
  } else {
    const perColumn = findColumn(dataset, spec.per.field);
    per = { field: perColumn.name, label: columnLabel(perColumn.name, meta), kind: perColumn.kind };
    const buckets = new Map<XValue, Map<XValue | null, Row[]>>();
    for (const row of rows) {
      const [value, key] = [row[perColumn.name] ?? null, groupOf(row)];
      if (value === null || key === undefined) continue;
      const byKey = buckets.get(value) ?? new Map<XValue | null, Row[]>();
      buckets.set(value, byKey);
      const bucket = byKey.get(key) ?? [];
      byKey.set(key, bucket);
      bucket.push(row);
    }
    for (const value of naturalOrder([...buckets.keys()], perColumn)) {
      for (const [key, bucket] of buckets.get(value) ?? []) {
        const x = aggregate(bucket, spec.x);
        const y = aggregate(bucket, spec.y);
        if (x !== null && y !== null) add(key, { x, y, per: value });
      }
    }
  }

  const present = [...points.keys()].filter((key): key is XValue => key !== null);
  const keys = groupColumn ? naturalOrder(present, groupColumn) : [null];
  return {
    type: "scatter",
    x: { label: aggregateLabel(spec.x, meta) },
    y: { label: aggregateLabel(spec.y, meta) },
    ...(per && { per }),
    ...(groupColumn && { groupLabel: columnLabel(groupColumn.name, meta) }),
    groups: keys.map((key) => ({ key, label: key === null ? "All" : String(key), points: points.get(key) ?? [] })),
  };
}

function findColumn(dataset: DatasetSummary, name: string): ColumnSummary {
  const column = dataset.columns.find((c) => c.name === name);
  if (!column) throw new Error(`No column "${name}" in the dataset`);
  return column;
}

// Numbers and dates ascend; categories follow the column's value list,
// then first appearance for anything the list doesn't have.
function naturalOrder(values: XValue[], column: ColumnSummary): XValue[] {
  if (column.kind === "number" || column.kind === "date") return [...values].sort(compare);
  if (column.kind === "category" && column.values) {
    const present = new Set(values);
    const listed: XValue[] = column.values.filter((v) => present.has(v));
    const listedSet = new Set(listed);
    return [...listed, ...values.filter((v) => !listedSet.has(v))];
  }
  return values;
}

function aggregate(rows: Row[], { aggregate, field }: AggregateOf): number | null {
  if (aggregate === "count") return rows.length === 0 ? null : rows.length;
  if (aggregate === undefined || field === undefined) throw new Error("An aggregate needs a field");
  const values = rows.map((row) => row[field]).filter((v): v is number => typeof v === "number");
  if (values.length === 0) return null;
  switch (aggregate) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "mean":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "median": {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const upper = sorted[mid] ?? 0;
      return sorted.length % 2 === 1 ? upper : ((sorted[mid - 1] ?? 0) + upper) / 2;
    }
    case "min":
      return values.reduce((a, b) => Math.min(a, b));
    case "max":
      return values.reduce((a, b) => Math.max(a, b));
    default: {
      const unreachable: never = aggregate;
      throw new Error(`Unknown aggregate: ${JSON.stringify(unreachable)}`);
    }
  }
}

// The spec's label, else the row label or "Count" for counts, the column
// label for a raw scatter field, or e.g. "Sum of revenue (£)" (D-025).
function aggregateLabel({ aggregate, field, label }: AggregateOf & { label?: string }, meta: LabelMeta): string {
  if (label !== undefined) return label;
  if (aggregate === "count") return meta.rowLabel ?? "Count";
  const name = columnLabel(field ?? "", meta);
  if (aggregate === undefined) return name;
  return `${aggregate.charAt(0).toUpperCase()}${aggregate.slice(1)} of ${lowerFirst(name)}`;
}

// "Revenue (£)" → "revenue (£)", but acronyms such as "GDP per capita" stay.
function lowerFirst(label: string): string {
  const [first = "", second = ""] = label;
  const acronym = /[A-Z]/.test(first) && /[A-Z]/.test(second);
  return acronym ? label : first.toLowerCase() + label.slice(1);
}

function axisField(axis: ScatterAxis): string {
  if (axis.field === undefined) throw new Error("A scatter axis without per needs a field");
  return axis.field;
}

// Sum of the non-null values, or null if there are none.
function total(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length === 0 ? null : present.reduce((a, b) => a + b, 0);
}

function pick<T>(values: T[], order: number[]): T[] {
  return order.map((i) => values[i]).filter((v): v is T => v !== undefined);
}
