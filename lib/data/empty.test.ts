import { describe, expect, it } from "vitest";
import { type ChartSpec, type DatasetSummary, parseSpec } from "@/lib/spec";
import { closeValues, explainEmpty } from "./empty";
import { inferDataset } from "./infer";
import { parseCsv } from "./parse";
import { prepareChartData } from "./prepare";

const CSV = [
  "date,start_station,hour,duration_min,rain_mm",
  "2026-01-16,\"Waterloo Road, Waterloo\",8,12.5,",
  "2026-01-16,\"Soho Square, Soho\",9,20,",
  "2026-02-01,\"Waterloo Station 3, Waterloo\",17,8,",
  "2026-05-31,\"Hyde Park Corner, Hyde Park\",12,35,3.5",
].join("\n");

const meta = { columnLabels: { start_station: "Start station" } };
const inferred = inferDataset(parseCsv(CSV), meta);
const { rows } = inferred;
// As in the bikes data, the stations are too many to list, so validation can't check a filter on them.
const summary: DatasetSummary = {
  ...inferred.summary,
  columns: inferred.summary.columns.map((c) =>
    c.name === "start_station" && c.kind === "category"
      ? { name: c.name, label: c.label, kind: "category", distinct: 805, nulls: 0, examples: c.values ?? [] }
      : c,
  ),
};

function explain(spec: Omit<ChartSpec, "version" | "title">) {
  const parsed = parseSpec({ version: 1, title: "t", ...spec }, summary);
  if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
  return explainEmpty(rows, summary, parsed.spec, prepareChartData(rows, summary, parsed.spec, meta), meta);
}

const byHour = { type: "bar", x: { field: "hour" }, y: { aggregate: "count" } } as const;

describe("explainEmpty", () => {
  it("returns null when there is something to draw", () => {
    expect(explain(byHour)).toBeNull();
  });

  it("names a misspelt value on a column too large to list, with close values", () => {
    expect(explain({ ...byHour, filters: [{ field: "start_station", op: "eq", value: "Waterlo Road" }] })).toEqual({
      kind: "filter",
      message:
        "No rows where start station is 'Waterlo Road'. Closest values in the data: 'Waterloo Road, Waterloo', 'Waterloo Station 3, Waterloo'.",
      request:
        "No rows where start station is 'Waterlo Road'. Closest values in the data: 'Waterloo Road, Waterloo', 'Waterloo Station 3, Waterloo'. Please fix the filter.",
    });
  });

  it("covers every value of an in filter", () => {
    const empty = explain({ ...byHour, filters: [{ field: "start_station", op: "in", values: ["Soho Sq", "Hide Park"] }] });
    expect(empty?.message).toBe(
      "No rows where start station is one of 'Soho Sq', 'Hide Park'. Closest values in the data: 'Soho Square, Soho', 'Hyde Park Corner, Hyde Park'.",
    );
  });

  it("gives the span of the dates for a range outside them", () => {
    const empty = explain({ ...byHour, filters: [{ field: "date", op: "gte", value: "2026-06-01" }] });
    expect(empty?.message).toBe("No rows where date is on or after 1 Jun 2026. The dates run from 16 Jan 2026 to 31 May 2026.");
  });

  it("gives the span of the numbers for a range outside them", () => {
    const empty = explain({ ...byHour, filters: [{ field: "duration_min", op: "gt", value: 1000 }] });
    expect(empty?.message).toBe("No rows where duration min is over 1,000. Values of duration min run from 8 to 35.");
  });

  it("says when filters only clash together, and asks to fix them all", () => {
    const empty = explain({
      ...byHour,
      filters: [
        { field: "hour", op: "lt", value: 9 },
        { field: "date", op: "gte", value: "2026-02-01" },
      ],
    });
    expect(empty).toEqual({
      kind: "filter",
      message: "No row matches all the filters together: hour is under 9; date is on or after 1 Feb 2026.",
      request: "No row matches all the filters together: hour is under 9; date is on or after 1 Feb 2026. Please fix the filters.",
    });
  });

  // Rainfall is recorded only on the Hyde Park row, at hour 12.
  const beforeNoon = [{ field: "hour", op: "lt", value: 12 }] as const;

  it("names the empty column when rows match but have no values", () => {
    expect(
      explain({ type: "bar", x: { field: "hour" }, y: { field: "rain_mm", aggregate: "sum" }, filters: [...beforeNoon] }),
    ).toEqual({ kind: "no-values", message: "Nothing to plot: rain mm is empty in all 2 matching rows." });
  });

  it("says 'the only matching row' for one row", () => {
    const empty = explain({
      type: "bar",
      x: { field: "hour" },
      y: { field: "rain_mm", aggregate: "sum" },
      filters: [{ field: "hour", op: "eq", value: 8 }],
    });
    expect(empty?.message).toBe("Nothing to plot: rain mm is empty in the only matching row.");
  });

  it("covers scatter plots", () => {
    expect(explain({ type: "scatter", x: { field: "hour" }, y: { field: "rain_mm" }, filters: [...beforeNoon] })?.message).toBe(
      "Nothing to plot: rain mm is empty in all 2 matching rows.",
    );
  });
});

describe("closeValues", () => {
  it("matches by the start of a longer value, closest first", () => {
    expect(closeValues("waterlo road", ["Waterloo Road, Waterloo", "Soho Square, Soho", "Waterloo Rd"])).toEqual([
      "Waterloo Road, Waterloo",
      "Waterloo Rd",
    ]);
  });

  it("offers nothing when nothing is close", () => {
    expect(closeValues("Vanilla", ["Pistachio", "Amalfi Lemon"])).toEqual([]);
  });
});
