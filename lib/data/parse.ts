import { csvParse } from "d3-dsv";

// One CSV row as text, keyed by column name; null means an empty cell.
export type RawRow = Record<string, string | null>;

export type ParsedCsv = {
  columns: string[];
  rows: RawRow[];
};

// Columns are returned separately so a header-only file keeps its column order.
export function parseCsv(text: string): ParsedCsv {
  const parsed = csvParse(text);
  const rows = parsed.map((row) => {
    const out: RawRow = {};
    for (const column of parsed.columns) {
      const value = row[column];
      out[column] = value === undefined || value === "" ? null : value;
    }
    return out;
  });
  return { columns: parsed.columns, rows };
}
