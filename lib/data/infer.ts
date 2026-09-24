import { type ColumnSummary, type DatasetSummary, MAX_LISTED_VALUES } from "@/lib/spec";
import type { ParsedCsv } from "./parse";

// One typed row: numbers as numbers, dates as ISO strings, null for an empty cell.
export type Row = DatasetSummary["sampleRows"][number];

export type InferMeta = {
  // Natural value order for category columns that inference can't work out.
  columnOrder?: Record<string, readonly string[]>;
};

export type InferredDataset = {
  summary: DatasetSummary;
  rows: Row[];
};

const MAX_EXAMPLES = 5;
const MAX_SAMPLE_ROWS = 10;

// Text is mostly unique and has too many values to list; anything else is a category (D-019).
const TEXT_DISTINCT_RATIO = 0.5;

const NUMBER = /^-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})(T(\d{2}):(\d{2})(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

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

export function inferDataset(parsed: ParsedCsv, meta: InferMeta = {}): InferredDataset {
  const rows: Row[] = parsed.rows.map(() => ({}));
  const columns = parsed.columns.map((name) => {
    const cells = parsed.rows.map((row) => row[name] ?? null);
    const { summary, values } = inferColumn(name, cells, meta.columnOrder?.[name]);
    values.forEach((value, i) => {
      const row = rows[i];
      if (row) row[name] = value;
    });
    return summary;
  });

  return {
    summary: { rowCount: rows.length, columns, sampleRows: sampleRows(rows) },
    rows,
  };
}

function inferColumn(
  name: string,
  cells: (string | null)[],
  order: readonly string[] | undefined,
): { summary: ColumnSummary; values: (string | number | null)[] } {
  const present = cells.filter((c): c is string => c !== null);
  const nulls = cells.length - present.length;

  if (present.length > 0 && present.every((c) => NUMBER.test(c))) {
    const values = cells.map((c) => (c === null ? null : Number(c)));
    const distinct = unique(values.filter((v): v is number => v !== null));
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
    };
  }

  const distinct = unique(present);

  if (present.length > 0 && distinct.every(isIsoDate)) {
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

  if (distinct.length > MAX_LISTED_VALUES && distinct.length > present.length * TEXT_DISTINCT_RATIO) {
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
