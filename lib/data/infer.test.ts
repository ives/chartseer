import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DatasetSummary, bikesSummary, gelatoSummary } from "@/lib/spec";
import { datasets } from "./datasets";
import { inferDataset } from "./infer";
import { parseCsv } from "./parse";

function infer(csv: string, meta = {}) {
  return inferDataset(parseCsv(csv), meta);
}

function column(csv: string, meta = {}) {
  return infer(csv, meta).summary.columns[0];
}

describe("the bundled datasets reproduce the fixtures", () => {
  it.each([
    ["bikes", datasets.bikes, bikesSummary],
    ["gelato", datasets.gelato, gelatoSummary],
  ] as const)("%s", (_, meta, fixture) => {
    const { summary } = inferDataset(parseCsv(readFileSync(`public/data/${meta.id}.csv`, "utf8")), meta);
    expect(DatasetSummary.parse(summary)).toEqual(summary);
    expect({ ...summary, sampleRows: [] }).toEqual({ ...fixture, sampleRows: [] });
  });
});

describe("column kinds", () => {
  it("detects numbers and converts them", () => {
    const { summary, rows } = infer("n\n3\n-1.5\n\n1e2\n");
    expect(summary.columns[0]).toEqual({
      name: "n",
      kind: "number",
      distinct: 3,
      nulls: 1,
      min: -1.5,
      max: 100,
      examples: [3, -1.5, 100],
    });
    expect(rows.map((r) => r.n)).toEqual([3, -1.5, null, 100]);
  });

  it("detects ISO dates and date-times, kept as strings", () => {
    expect(column("d\n2026-05-31\n2026-01-16T00:07\n2026-02-01T10:00:00Z\n")).toMatchObject({
      kind: "date",
      min: "2026-01-16T00:07",
      max: "2026-05-31",
    });
  });

  it("treats an impossible date as a category", () => {
    expect(column("d\n2026-02-30\n2026-02-30\n")).toMatchObject({ kind: "category" });
  });

  it("treats mostly unique strings with more than 50 values as text", () => {
    const notes = Array.from({ length: 60 }, (_, i) => `note ${i}`);
    expect(column("t\n" + [...notes, "note 0"].join("\n"))).toMatchObject({ kind: "text", distinct: 60 });
  });

  it("keeps a small file's mostly unique strings as a category", () => {
    const names = ["Ada", "Ben", "Cai", "Dev", "Eve", "Fin", "Gus", "Hal", "Ivy", "Ada"];
    expect(column("name\n" + names.join("\n"))).toMatchObject({ kind: "category", distinct: 9 });
  });

  it("treats an all-empty column as a category with no values", () => {
    expect(column("a,b\n,1\n,2\n")).toEqual({ name: "a", kind: "category", distinct: 0, nulls: 2, values: [] });
  });
});

describe("category value order", () => {
  it("puts weekdays in calendar order even when the file starts on a Friday", () => {
    const csv = "w\n" + ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"].flatMap((d) => [d, d]).join("\n");
    expect(column(csv)).toMatchObject({ values: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] });
  });

  it("puts months in calendar order", () => {
    expect(column("m\nMarch\nJanuary\nMarch\nJanuary\n")).toMatchObject({ values: ["January", "March"] });
  });

  it("otherwise keeps order of first appearance", () => {
    expect(column("s\nb\na\nb\na\n")).toMatchObject({ values: ["b", "a"] });
  });

  it("follows a metadata order, then appends unlisted values by first appearance", () => {
    const csv = "s\nSummer\nOther\nWinter\nSummer\nWinter\nOther\n";
    expect(column(csv, { columnOrder: { s: ["Winter", "Spring", "Summer", "Autumn"] } })).toMatchObject({
      values: ["Winter", "Summer", "Other"],
    });
  });

  it("gives examples instead of values above 50 distinct", () => {
    const labels = Array.from({ length: 51 }, (_, i) => `v${i}`);
    const c = column("s\n" + [...labels, ...labels].join("\n"));
    expect(c).toEqual({ name: "s", kind: "category", distinct: 51, nulls: 0, examples: ["v0", "v1", "v2", "v3", "v4"] });
  });
});

describe("sample rows", () => {
  it("takes 10 evenly spaced rows", () => {
    const csv = "i\n" + Array.from({ length: 100 }, (_, i) => i).join("\n");
    expect(infer(csv).summary.sampleRows.map((r) => r.i)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
  });

  it("takes every row of a short file", () => {
    expect(infer("i\n1\n2\n3\n").summary.sampleRows).toEqual([{ i: 1 }, { i: 2 }, { i: 3 }]);
  });
});
