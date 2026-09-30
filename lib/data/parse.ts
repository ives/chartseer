import { dsvFormat } from "d3-dsv";

// One CSV row as text, keyed by column name; null means an empty cell.
export type RawRow = Record<string, string | null>;

export type ParsedCsv = {
  columns: string[];
  rows: RawRow[];
};

export type ReadResult = { ok: true; csv: ParsedCsv } | { ok: false; message: string };

export const NOT_CSV =
  "This doesn’t look like a CSV file. Chartseer reads .csv files only; in Excel, use File › Save As › CSV.";

const DELIMITERS = [",", ";", "\t"] as const;

// A header cell made only of digits and number or date punctuation, e.g. "2025" or "24/09/2026".
const VALUE_LIKE = /^[-+]?[£$€]?[\d\s.,/:%T-]*\d[\d\s.,/:%T-]*$/;

// Columns are returned separately so a header-only file keeps its column order.
// Lenient: for the bundled files. Uploads go through readCsv.
export function parseCsv(text: string): ParsedCsv {
  const [header, ...body] = splitRows(text);
  const columns = header?.cells ?? [];
  return { columns, rows: body.map(({ cells }) => toRow(columns, cells)) };
}

// An uploaded file's text, checked so that every problem gets a message the
// user can act on (D-041).
export function readCsv(text: string): ReadResult {
  if (text.includes("\u0000")) return fail(NOT_CSV);
  // Blank lines are skipped here; in a one-column file they would be empty cells.
  const [header, ...body] = splitRows(text).filter(({ cells }) => cells.some((c) => c !== ""));
  if (!header) return fail("The file is empty.");

  const columns = header.cells.map((c) => c.trim());
  if (columns.every((c) => VALUE_LIKE.test(c))) {
    return fail("The first row should name the columns, but it looks like data. Add a header row and upload again.");
  }
  const unnamed = columns.indexOf("");
  if (unnamed !== -1) return fail(`Column ${unnamed + 1} has no name in the header row.`);
  const duplicate = columns.find((c, i) => columns.indexOf(c) !== i);
  if (duplicate !== undefined) return fail(`Two columns are called “${duplicate}”. Rename one and upload again.`);
  if (columns.length === 1) {
    return fail("Only one column found. Chartseer reads columns separated by commas, semicolons or tabs.");
  }
  if (body.length === 0) return fail("The file has a header row but no data.");

  const ragged = body.find(({ cells }) => cells.length !== columns.length);
  if (ragged) {
    const count = ragged.cells.length;
    return fail(
      `Row ${ragged.row} has ${count} ${count === 1 ? "value" : "values"}, but the header has ${columns.length}. ` +
        "Check for a missing or extra separator.",
    );
  }
  return { ok: true, csv: { columns, rows: body.map(({ cells }) => toRow(columns, cells)) } };
}

// Records with their row number as a spreadsheet shows it (header = row 1).
// Strips a byte-order mark and picks the delimiter from the header line.
function splitRows(text: string): { row: number; cells: string[] }[] {
  const clean = text.startsWith("\uFEFF") ? text.slice(1) : text;
  return dsvFormat(detectDelimiter(clean)).parseRows(clean).map((cells, i) => ({ row: i + 1, cells }));
}

// The most frequent of comma, semicolon and tab outside quotes on the first
// non-blank line; comma when none appears.
function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(DELIMITERS.map((d) => [d, 0]));
  let quoted = false;
  let seen = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) {
      if (seen) break;
    } else if (!quoted && counts.has(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
    if (char.trim() !== "") seen = true;
  }
  let best: string = ",";
  for (const d of DELIMITERS) if ((counts.get(d) ?? 0) > (counts.get(best) ?? 0)) best = d;
  return best;
}

function toRow(columns: string[], cells: string[]): RawRow {
  const out: RawRow = {};
  columns.forEach((column, i) => {
    const value = cells[i];
    out[column] = value === undefined || value === "" ? null : value;
  });
  return out;
}

function fail(message: string): ReadResult {
  return { ok: false, message };
}
