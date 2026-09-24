import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type ChartSpec, type Filter, bikesSummary, examples } from "@/lib/spec";
import { datasets } from "./datasets";
import { inferDataset } from "./infer";
import { parseCsv } from "./parse";
import { type CartesianData, type ChartData, type ScatterData, prepareChartData } from "./prepare";

const base = { version: 1, title: "t" } as const;

function prepare(csv: string, spec: ChartSpec): ChartData {
  const { summary, rows } = inferDataset(parseCsv(csv));
  return prepareChartData(rows, summary, spec);
}

function cartesian(csv: string, spec: ChartSpec): CartesianData {
  const data = prepare(csv, spec);
  if (data.type === "scatter") throw new Error("expected cartesian data");
  return data;
}

function scatter(csv: string, spec: ChartSpec): ScatterData {
  const data = prepare(csv, spec);
  if (data.type !== "scatter") throw new Error("expected scatter data");
  return data;
}

describe("filter", () => {
  const csv = "id,n,d,s\na,1,2025-01-01,x\nb,2,2025-01-02,\nc,3,2025-01-03,y\nd,,2025-01-04,x\n";
  const kept = (filters: Filter[]) =>
    cartesian(csv, { ...base, type: "bar", x: { field: "id" }, y: { aggregate: "count" }, filters }).x.values;

  const cases: [string, Filter[], string[]][] = [
    ["eq", [{ field: "s", op: "eq", value: "x" }], ["a", "d"]],
    ["neq keeps nulls", [{ field: "s", op: "neq", value: "x" }], ["b", "c"]],
    ["in", [{ field: "s", op: "in", values: ["x", "y"] }], ["a", "c", "d"]],
    ["gt skips nulls", [{ field: "n", op: "gt", value: 1 }], ["b", "c"]],
    ["gte", [{ field: "n", op: "gte", value: 2 }], ["b", "c"]],
    ["lt", [{ field: "n", op: "lt", value: 2 }], ["a"]],
    ["lte on a date", [{ field: "d", op: "lte", value: "2025-01-02" }], ["a", "b"]],
    [
      "every filter must hold",
      [
        { field: "n", op: "gte", value: 2 },
        { field: "s", op: "neq", value: "y" },
      ],
      ["b"],
    ],
  ];

  it.each(cases)("%s", (_, filters, expected) => {
    expect(kept(filters)).toEqual(expected);
  });
});

describe("group and aggregate", () => {
  const csv = "shop,flavour,scoops\nA,Lemon,10\nA,Lemon,20\nA,Lemon,\nA,Mango,6\nB,Lemon,\n";
  const bySeries = (y: Extract<ChartSpec, { type: "bar" }>["y"]) =>
    cartesian(csv, { ...base, type: "bar", x: { field: "shop" }, y, series: { field: "flavour" } }).series.map(
      (s) => [s.key, s.values],
    );
  const single = (aggregate: "mean" | "median" | "min" | "max") =>
    cartesian(csv, { ...base, type: "bar", x: { field: "shop" }, y: { field: "scoops", aggregate } }).series[0]?.values;

  it("counts rows, with null for a missing combination", () => {
    expect(bySeries({ aggregate: "count" })).toEqual([
      ["Lemon", [3, 1]],
      ["Mango", [1, null]],
    ]);
  });

  it("sums, ignoring empty cells; all-empty and missing are null", () => {
    expect(bySeries({ field: "scoops", aggregate: "sum" })).toEqual([
      ["Lemon", [30, null]],
      ["Mango", [6, null]],
    ]);
  });

  it.each([
    ["mean", [12, null]],
    ["median", [10, null]],
    ["min", [6, null]],
    ["max", [20, null]],
  ] as const)("%s", (aggregate, expected) => {
    expect(single(aggregate)).toEqual(expected);
  });

  it("drops rows with an empty x or series value", () => {
    const data = cartesian("x,s\na,p\n,p\nb,\n", { ...base, type: "bar", x: { field: "x" }, y: { aggregate: "count" }, series: { field: "s" } });
    expect(data.x.values).toEqual(["a"]);
    expect(data.series).toEqual([{ key: "p", label: "p", values: [1] }]);
  });
});

describe("sort and limit", () => {
  const csv = "day,shop,scoops\nFri,A,5\nMon,A,1\nMon,B,9\nWed,A,3\n";
  const bar = (extra: Partial<Extract<ChartSpec, { type: "bar" }>>) =>
    cartesian(csv, {
      ...base,
      type: "bar",
      x: { field: "day" },
      y: { field: "scoops", aggregate: "sum" },
      series: { field: "shop" },
      ...extra,
    });

  it("keeps a category column's value order without sort", () => {
    const data = bar({});
    expect(data.x.values).toEqual(["Mon", "Wed", "Fri"]);
    expect(data.series.map((s) => s.values)).toEqual([
      [1, 3, 5],
      [9, null, null],
    ]);
  });

  it("sorts stacked bars by their total, descending", () => {
    const data = bar({ layout: "stacked", sort: "desc" });
    expect(data.x.values).toEqual(["Mon", "Fri", "Wed"]);
    expect(data.series.map((s) => s.values)).toEqual([
      [1, 5, 3],
      [9, null, null],
    ]);
  });

  it("sorts ascending", () => {
    expect(bar({ sort: "asc" }).x.values).toEqual(["Wed", "Fri", "Mon"]);
  });

  it("keeps natural order for ties and puts empty values last", () => {
    const tied = "k,v\nc,1\na,1\nb,\nd,2\n";
    const sorted = (sort: "asc" | "desc") =>
      cartesian(tied, { ...base, type: "bar", x: { field: "k" }, y: { field: "v", aggregate: "sum" }, sort }).x.values;
    expect(sorted("desc")).toEqual(["d", "c", "a", "b"]);
    expect(sorted("asc")).toEqual(["c", "a", "d", "b"]);
  });

  it("keeps the first N after sorting", () => {
    const data = bar({ sort: "desc", limit: 2 });
    expect(data.x.values).toEqual(["Mon", "Fri"]);
    expect(data.series.map((s) => s.values)).toEqual([
      [1, 5],
      [9, null],
    ]);
  });

  it("puts number and date x values in ascending order", () => {
    const csv2 = "hour,date\n3,2025-01-03\n1,2025-01-01\n2,2025-01-02\n";
    const line = (field: string) =>
      cartesian(csv2, { ...base, type: "line", x: { field }, y: { aggregate: "count" } }).x.values;
    expect(line("hour")).toEqual([1, 2, 3]);
    expect(line("date")).toEqual(["2025-01-01", "2025-01-02", "2025-01-03"]);
  });
});

describe("shape", () => {
  const csv = "date,shop,scoops\n2025-01-02,A,5\n2025-01-01,A,2\n2025-01-01,B,4\n";

  it("defaults labels and gives a single series without a series column", () => {
    expect(prepare(csv, { ...base, type: "line", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" } })).toEqual({
      type: "line",
      x: { field: "date", label: "date", kind: "date", values: ["2025-01-01", "2025-01-02"] },
      y: { label: "Sum of scoops" },
      series: [{ key: null, label: "Sum of scoops", values: [6, 5] }],
      annotations: [],
    });
  });

  it("uses the spec's labels, names the series and copies annotations", () => {
    const annotations = [{ kind: "point", x: "2025-01-02", label: "Launch" }] as const;
    expect(
      prepare(csv, {
        ...base,
        type: "area",
        x: { field: "date", label: "Day" },
        y: { aggregate: "count", label: "Sales" },
        series: { field: "shop" },
        annotations: [...annotations],
      }),
    ).toEqual({
      type: "area",
      x: { field: "date", label: "Day", kind: "date", values: ["2025-01-01", "2025-01-02"] },
      y: { label: "Sales" },
      seriesLabel: "shop",
      series: [
        { key: "A", label: "A", values: [1, 1] },
        { key: "B", label: "B", values: [1, null] },
      ],
      annotations,
    });
  });
});

describe("scatter", () => {
  const csv = "day,shop,temp,scoops\n2025-01-02,A,10,5\n2025-01-01,A,8,\n2025-01-01,B,8,4\n2025-01-02,B,10,6\n2025-01-01,A,8,2\n";
  const spec = { ...base, type: "scatter", x: { field: "temp" }, y: { field: "scoops" } } as const;
  const perDay = {
    ...base,
    type: "scatter",
    per: { field: "day" },
    x: { field: "temp", aggregate: "mean" },
    y: { field: "scoops", aggregate: "sum" },
  } as const;

  it("draws one point per row, skipping rows with an empty axis", () => {
    expect(scatter(csv, spec)).toEqual({
      type: "scatter",
      x: { label: "temp" },
      y: { label: "scoops" },
      groups: [
        {
          key: null,
          label: "All",
          points: [
            { x: 10, y: 5 },
            { x: 8, y: 4 },
            { x: 10, y: 6 },
            { x: 8, y: 2 },
          ],
        },
      ],
    });
  });

  it("splits raw points into groups", () => {
    expect(scatter(csv, { ...spec, group: { field: "shop" } }).groups).toEqual([
      { key: "A", label: "A", points: [{ x: 10, y: 5 }, { x: 8, y: 2 }] },
      { key: "B", label: "B", points: [{ x: 8, y: 4 }, { x: 10, y: 6 }] },
    ]);
  });

  it("draws one point per value of per, in per order", () => {
    expect(scatter(csv, perDay)).toEqual({
      type: "scatter",
      x: { label: "Mean of temp" },
      y: { label: "Sum of scoops" },
      per: { field: "day", label: "day", kind: "date" },
      groups: [
        {
          key: null,
          label: "All",
          points: [
            { x: 8, y: 6, per: "2025-01-01" },
            { x: 10, y: 11, per: "2025-01-02" },
          ],
        },
      ],
    });
  });

  it("groups by per and group together", () => {
    const data = scatter(csv, { ...perDay, group: { field: "shop" } });
    expect(data.groupLabel).toBe("shop");
    expect(data.groups).toEqual([
      { key: "A", label: "A", points: [{ x: 8, y: 2, per: "2025-01-01" }, { x: 10, y: 5, per: "2025-01-02" }] },
      { key: "B", label: "B", points: [{ x: 8, y: 4, per: "2025-01-01" }, { x: 10, y: 6, per: "2025-01-02" }] },
    ]);
  });

  it("drops a per point whose aggregate has no values, and counts rows", () => {
    const sparse = "day,temp,scoops\nd1,8,\nd2,10,3\nd2,10,1\n";
    const data = scatter(sparse, { ...perDay, y: { field: "scoops", aggregate: "max" } });
    expect(data.groups[0]?.points).toEqual([{ x: 10, y: 3, per: "d2" }]);
    const counted = scatter(sparse, { ...perDay, y: { aggregate: "count" } });
    expect(counted.groups[0]?.points).toEqual([
      { x: 8, y: 1, per: "d1" },
      { x: 10, y: 2, per: "d2" },
    ]);
  });
});

describe("the example specs on the real data", () => {
  const load = (meta: (typeof datasets)[keyof typeof datasets]) =>
    inferDataset(parseCsv(readFileSync(`public/data/${meta.id}.csv`, "utf8")), meta);
  const bikes = load(datasets.bikes);
  const gelato = load(datasets.gelato);

  function run(id: string): ChartData {
    const example = examples.find((e) => e.id === id);
    if (!example) throw new Error(`No example ${id}`);
    const { summary, rows } = example.dataset === bikesSummary ? bikes : gelato;
    return prepareChartData(rows, summary, example.spec);
  }

  function runCartesian(id: string): CartesianData {
    const data = run(id);
    if (data.type === "scatter") throw new Error("expected cartesian data");
    return data;
  }

  it("prepares every example", () => {
    for (const example of examples) expect(() => run(example.id)).not.toThrow();
  });

  it("puts gelato weekdays in calendar order", () => {
    expect(runCartesian("gelato-weekday-by-shop").x.values).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });

  it("gives exactly 15 bike areas, descending", () => {
    const data = runCartesian("bikes-busiest-areas");
    const values = data.series[0]?.values ?? [];
    expect(data.x.values).toHaveLength(15);
    expect(data.x.values[0]).toBe("Marylebone");
    values.slice(1).forEach((v, i) => expect(v).toBeLessThan(values[i] ?? 0));
  });

  it("leaves Brixton's 2025 line null during its refit", () => {
    const data = runCartesian("gelato-daily-2025");
    const brixton = data.series.find((s) => s.key === "Brixton");
    const on = (date: string) => brixton?.values[data.x.values.indexOf(date)];
    for (let day = 3; day <= 23; day++) expect(on(`2025-02-${String(day).padStart(2, "0")}`)).toBeNull();
    expect(on("2025-02-02")).toEqual(expect.any(Number));
    expect(on("2025-02-24")).toEqual(expect.any(Number));
  });

  it("draws one point per trading day", () => {
    const data = run("gelato-daily-heat");
    if (data.type !== "scatter") throw new Error("expected scatter data");
    expect(data.groups.flatMap((g) => g.points)).toHaveLength(729);
  });
});
