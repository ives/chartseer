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
      label: "N",
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
    expect(column("a,b\n,1\n,2\n")).toEqual({ name: "a", label: "A", kind: "category", distinct: 0, nulls: 2, values: [] });
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

  it("gives examples instead of values above 200 distinct", () => {
    const labels = Array.from({ length: 201 }, (_, i) => `v${i}`);
    const c = column("s\n" + [...labels, ...labels].join("\n"));
    expect(c).toEqual({ name: "s", label: "S", kind: "category", distinct: 201, nulls: 0, examples: ["v0", "v1", "v2", "v3", "v4"] });
  });
});

describe("column labels", () => {
  it("takes a label from the meta", () => {
    expect(column("max_temp_c\n21\n", { columnLabels: { max_temp_c: "Peak temperature (°C)" } })?.label).toBe(
      "Peak temperature (°C)",
    );
  });

  it("derives a label for a column the meta doesn't name", () => {
    const { summary } = infer("GDP_per_capita,b\n1,2\n", { columnLabels: { b: "Bee" } });
    expect(summary.columns.map((c) => c.label)).toEqual(["GDP per capita", "Bee"]);
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

describe("UK and US number formats", () => {
  it.each([
    ["thousands separators", '"1,234",1\n"12,345,678.9",2\n', [1234, 12345678.9]],
    ["pounds", "£3.50,1\n-£1,2\n", [3.5, -1]],
    ["dollars", '"$1,200",1\n$-5,2\n', [1200, -5]],
    ["euros", "€0.99,1\n€12,2\n", [0.99, 12]],
    ["percentages", "12%,1\n-3.5%,2\n", [12, -3.5]],
  ])("reads %s as numbers", (_name, body, expected) => {
    const { summary, rows } = infer("v,i\n" + body);
    expect(summary.columns[0]?.kind).toBe("number");
    expect(rows.map((r) => r.v)).toEqual(expected);
  });

  it.each([
    ["decimal commas", '"3,5"\n"1,25"\n'],
    ["thousands groups of the wrong size", '"1,23"\n"4,5678"\n'],
    ["a currency and a percentage together", "£5%\n£6%\n"],
    ["a sign on both sides of the symbol", "-£-5\n-£-6\n"],
    ["words", "£5\nfree\n"],
  ])("keeps %s as a category", (_name, body) => {
    expect(column("v,i\n" + body.replace(/\n/g, ",1\n"))?.kind).toBe("category");
  });

  it("adds the shared unit to a derived label", () => {
    const { summary } = infer("price,growth,mixed\n£5,12%,£5\n£6,3%,$6\n");
    expect(summary.columns.map((c) => c.label)).toEqual(["Price (£)", "Growth (%)", "Mixed"]);
  });

  it("doesn't repeat a unit the name already has, or override a label from the meta", () => {
    const { summary } = infer("growth_%,price\n12%,£5\n3%,£6\n", { columnLabels: { price: "Ticket price" } });
    expect(summary.columns.map((c) => c.label)).toEqual(["Growth %", "Ticket price"]);
  });
});

describe("UK and US dates", () => {
  const csv = (...dates: string[]) => "d,i\n" + dates.map((d, i) => `${d},${i}`).join("\n") + "\n";

  it("reads a day over 12 in the first part as day/month", () => {
    const { summary, rows, ambiguousDates } = infer(csv("13/01/2025", "02/03/2025", "1/2/2025"));
    expect(summary.columns[0]).toMatchObject({ kind: "date", min: "2025-01-13", max: "2025-03-02" });
    expect(rows.map((r) => r.d)).toEqual(["2025-01-13", "2025-03-02", "2025-02-01"]);
    expect(ambiguousDates).toEqual([]);
  });

  it("reads a day over 12 in the second part as month/day", () => {
    const { rows, ambiguousDates } = infer(csv("01/13/2025", "02/03/2025"));
    expect(rows.map((r) => r.d)).toEqual(["2025-01-13", "2025-02-03"]);
    expect(ambiguousDates).toEqual([]);
  });

  it("reads an ambiguous column as day/month and flags it", () => {
    const { summary, rows, ambiguousDates } = infer(csv("03/04/2025", "05/04/2025"));
    expect(rows.map((r) => r.d)).toEqual(["2025-04-03", "2025-04-05"]);
    expect(summary.columns[0]?.kind).toBe("date");
    expect(ambiguousDates).toEqual(["d"]);
  });

  it("reads an ambiguous column as month/day when asked, still flagged", () => {
    const { rows, ambiguousDates } = infer(csv("03/04/2025", "05/04/2025"), { ambiguousDates: "month-first" });
    expect(rows.map((r) => r.d)).toEqual(["2025-03-04", "2025-05-04"]);
    expect(ambiguousDates).toEqual(["d"]);
  });

  it("ignores the switch for a column whose order is known", () => {
    const { rows } = infer(csv("13/01/2025"), { ambiguousDates: "month-first" });
    expect(rows.map((r) => r.d)).toEqual(["2025-01-13"]);
  });

  it.each([
    ["both parts over 12 in different rows", ["13/01/2025", "01/13/2025"]],
    ["a day that doesn't exist", ["31/02/2025", "13/01/2025"]],
    ["a mix of slash and ISO dates", ["13/01/2025", "2025-01-14"]],
    ["two-digit years", ["13/01/25"]],
  ])("keeps %s as a category", (_name, dates) => {
    expect(column(csv(...dates))?.kind).toBe("category");
  });

  it("keeps empty cells as nulls", () => {
    const { summary, rows } = infer("d,i\n13/01/2025,1\n,2\n");
    expect(summary.columns[0]).toMatchObject({ kind: "date", nulls: 1, distinct: 1 });
    expect(rows.map((r) => r.d)).toEqual(["2025-01-13", null]);
  });
});
