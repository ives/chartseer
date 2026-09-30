import { type ColumnSummary, type DatasetSummary, MAX_LISTED_VALUES } from "@/lib/spec";
import { type LabelMeta, deriveLabel } from "./labels";
import type { ParsedCsv } from "./parse";

// One typed row: numbers as numbers, dates as ISO strings, null for an empty cell.
export type Row = DatasetSummary["sampleRows"][number];

export type DateOrder = "day-first" | "month-first";

export type InferMeta = {
  // Natural value order for category columns that inference can't work out.
  columnOrder?: Record<string, readonly string[]>;
  // How to read slash dates that fit either order, e.g. 03/04/2025 (D-042).
  ambiguousDates?: DateOrder;
};

export type InferredDataset = {
  summary: DatasetSummary;
  rows: Row[];
  // Slash-date columns that fit either order, read as meta.ambiguousDates says.
  ambiguousDates: string[];
};

const MAX_EXAMPLES = 5;
const MAX_SAMPLE_ROWS = 10;

// Text is mostly unique with more than a handful of values; anything else is a category (D-019).
const TEXT_DISTINCT_RATIO = 0.5;
const TEXT_MIN_DISTINCT = 50;

const NUMBER = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2})(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

// UK and US formats (D-042): a sign, a leading £, $ or €, comma thousands in
// groups of three, a trailing %. Decimal commas are not recognised.
const LOCALE_NUMBER = /^(-?)([£$€]?)(-?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(%?)$/;
// DD/MM/YYYY or MM/DD/YYYY; the column decides which.
const SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

const KNOWN_SEQUENCES: readonly (readonly string[])[] = [
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
];

// Every column gets a label: the one in meta if given, otherwise derived from
// its name (D-031), with the unit its cells share, e.g. "Price (£)" (D-042).
export function inferDataset(parsed: ParsedCsv, meta: InferMeta & LabelMeta = {}): InferredDataset {
  const rows: Row[] = parsed.rows.map(() => ({}));
  const ambiguousDates: string[] = [];
  const columns = parsed.columns.map((name) => {
    const cells = parsed.rows.map((row) => row[name] ?? null);
    const { summary, values, unit, ambiguous } = inferColumn(name, cells, meta.columnOrder?.[name], meta.ambiguousDates);
    values.forEach((value, i) => {
      const row = rows[i];
      if (row) row[name] = value;
    });
    if (ambiguous) ambiguousDates.push(name);
    return { ...summary, label: meta.columnLabels?.[name] ?? withUnit(deriveLabel(name), unit) };
  });

  return {
    summary: { rowCount: rows.length, columns, sampleRows: sampleRows(rows) },
    rows,
    ambiguousDates,
  };
}

type InferredColumn = {
  summary: ColumnSummary;
  values: (string | number | null)[];
  // The currency symbol or % every cell carries, if any.
  unit?: string;
  // A slash-date column whose order was assumed.
  ambiguous?: boolean;
};

function inferColumn(
  name: string,
  cells: (string | null)[],
  order: readonly string[] | undefined,
  dateOrder: DateOrder = "day-first",
): InferredColumn {
  const present = cells.filter((c): c is string => c !== null);
  const nulls = cells.length - present.length;

  const numbers = present.length > 0 ? present.map(toNumber) : [];
  if (numbers.length > 0 && numbers.every((n) => n !== null)) {
    const parsed = new Map(present.map((c, i) => [c, numbers[i]]));
    const values = cells.map((c) => (c === null ? null : (parsed.get(c)?.value ?? null)));
    const distinct = unique(values.filter((v): v is number => v !== null));
    const units = unique(numbers.map((n) => n?.unit ?? ""));
    return {
      summary: {
        name,
        kind: "number",
        distinct: distinct.length,
        nulls,
        // A loop, not Math.min(...distinct): spreading a large column overflows the stack.
        min: distinct.reduce<number | undefined>((a, b) => (a === undefined || b < a ? b : a), undefined),
        max: distinct.reduce<number | undefined>((a, b) => (a === undefined || b > a ? b : a), undefined),
        examples: distinct.slice(0, MAX_EXAMPLES),
      },
      values,
      ...(units.length === 1 && units[0] !== "" && { unit: units[0] }),
    };
  }

  const distinct = unique(present);

  if (present.length > 0 && distinct.every(isIsoDate)) return dateColumn(name, cells, nulls);

  const slash = present.length > 0 ? slashDates(distinct, dateOrder) : null;
  if (slash) {
    const iso = cells.map((c) => (c === null ? null : (slash.iso.get(c) ?? null)));
    return { ...dateColumn(name, iso, nulls), ambiguous: slash.ambiguous };
  }

  if (distinct.length > TEXT_MIN_DISTINCT && distinct.length > present.length * TEXT_DISTINCT_RATIO) {
    return {
      summary: { name, kind: "text", distinct: distinct.length, nulls, examples: distinct.slice(0, MAX_EXAMPLES) },
      values: cells,
    };
  }

  const summary: ColumnSummary =
    distinct.length <= MAX_LISTED_VALUES
      ? { name, kind: "category", distinct: distinct.length, nulls, values: naturalOrder(distinct, order) }
      : { name, kind: "category", distinct: distinct.length, nulls, examples: distinct.slice(0, MAX_EXAMPLES) };
  return { summary, values: cells };
}

function dateColumn(name: string, cells: (string | null)[], nulls: number): InferredColumn {
  const distinct = unique(cells.filter((c): c is string => c !== null));
  const sorted = [...distinct].sort();
  return {
    summary: {
      name,
      kind: "date",
      distinct: distinct.length,
      nulls,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      examples: distinct.slice(0, MAX_EXAMPLES),
    },
    values: cells,
  };
}

// A plain decimal, or a UK/US-formatted one with its currency symbol or %.
function toNumber(cell: string): { value: number; unit: string } | null {
  if (NUMBER.test(cell)) return { value: Number(cell), unit: "" };
  const m = LOCALE_NUMBER.exec(cell);
  if (!m) return null;
  const [, before = "", currency = "", after = "", whole = "", fraction = "", percent = ""] = m;
  if ((before && after) || (currency && percent)) return null;
  return { value: Number(`${before}${after}${whole.replace(/,/g, "")}${fraction}`), unit: currency || percent };
}

// Slash dates as ISO, if every value is one. A first part over 12 means
// day-first and a second part over 12 means month-first; with neither, the
// column is ambiguous and read in `fallback` order. Both, or a day that
// doesn't exist, make it not a date column (D-042).
function slashDates(distinct: string[], fallback: DateOrder): { iso: Map<string, string>; ambiguous: boolean } | null {
  const parts: [string, number, number, string][] = [];
  for (const value of distinct) {
    const m = SLASH_DATE.exec(value);
    if (!m) return null;
    parts.push([value, Number(m[1]), Number(m[2]), m[3] ?? ""]);
  }
  const dayFirst = parts.some(([, a]) => a > 12);
  const monthFirst = parts.some(([, , b]) => b > 12);
  if (dayFirst && monthFirst) return null;
  const order = dayFirst ? "day-first" : monthFirst ? "month-first" : fallback;

  const iso = new Map<string, string>();
  for (const [value, a, b, year] of parts) {
    const [day, month] = order === "day-first" ? [a, b] : [b, a];
    const date = `${year}-${pad(month)}-${pad(day)}`;
    if (!isIsoDate(date)) return null;
    iso.set(value, date);
  }
  return { iso, ambiguous: !dayFirst && !monthFirst };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// "Price" and "£" → "Price (£)", unless the name already says so.
function withUnit(label: string, unit: string | undefined): string {
  return unit === undefined || label.includes(unit) ? label : `${label} (${unit})`;
}

// Distinct values in order of first appearance.
function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isIsoDate(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const validDay = date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  const validTime = m[4] === undefined || (Number(m[5]) < 24 && Number(m[6]) < 60);
  return validDay && validTime;
}

// D-015: an explicit order first, then a known calendar sequence, then first appearance.
function naturalOrder(distinct: string[], order: readonly string[] | undefined): string[] {
  const sequence = order ?? KNOWN_SEQUENCES.find((seq) => distinct.every((v) => seq.includes(v)));
  if (!sequence) return distinct;
  const listed = sequence.filter((v) => distinct.includes(v));
  return [...listed, ...distinct.filter((v) => !sequence.includes(v))];
}

function sampleRows(rows: Row[]): Row[] {
  const k = Math.min(MAX_SAMPLE_ROWS, rows.length);
  return Array.from({ length: k }, (_, i) => rows[Math.floor((i * rows.length) / k)]).filter(
    (row): row is Row => row !== undefined,
  );
}
