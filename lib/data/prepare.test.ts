import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type ChartSpec, type Filter, bikesSummary, examples } from "@/lib/spec";
import { datasets } from "./datasets";
import { inferDataset } from "./infer";
import type { LabelMeta } from "./labels";
import { parseCsv } from "./parse";
import { type CartesianData, type ChartData, type ScatterData, prepareChartData } from "./prepare";

const base = { version: 1, title: "t" } as const;

function prepare(csv: string, spec: ChartSpec, meta?: LabelMeta): ChartData {
  const { summary, rows } = inferDataset(parseCsv(csv));
  return prepareChartData(rows, summary, spec, meta);
}

function cartesian(csv: string, spec: ChartSpec, meta?: LabelMeta): CartesianData {
  const data = prepare(csv, spec, meta);
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

  it("derives labels from column names and gives a single series without a series column", () => {
    expect(prepare(csv, { ...base, type: "line", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" } })).toEqual({
      type: "line",
      x: { field: "date", label: "Date", kind: "date", values: ["2025-01-01", "2025-01-02"] },
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
      seriesLabel: "Shop",
      series: [
        { key: "A", label: "A", values: [1, 1] },
        { key: "B", label: "B", values: [1, null] },
      ],
      annotations,
    });
  });

  const meta: LabelMeta = {
    columnLabels: { date: "Day of sale", shop: "Gelateria", scoops: "Scoops sold" },
    rowLabel: "Sales",
  };

  it("takes axis and legend titles from the dataset's labels", () => {
    const data = cartesian(
      csv,
      { ...base, type: "bar", x: { field: "date" }, y: { field: "scoops", aggregate: "mean" }, series: { field: "shop" } },
      meta,
    );
    expect(data.x.label).toBe("Day of sale");
    expect(data.y.label).toBe("Mean of scoops sold");
    expect(data.seriesLabel).toBe("Gelateria");
  });

  it("titles counts with the row label, else Count", () => {
    const count = { ...base, type: "line", x: { field: "date" }, y: { aggregate: "count" } } as const;
    expect(cartesian(csv, count, meta).y.label).toBe("Sales");
    expect(cartesian(csv, count, meta).series[0]?.label).toBe("Sales");
    expect(cartesian(csv, count).y.label).toBe("Count");
  });

  it("keeps acronyms capitalised after the aggregate", () => {
    const data = cartesian(
      csv,
      { ...base, type: "line", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" } },
      { columnLabels: { scoops: "GBP taken" } },
    );
    expect(data.y.label).toBe("Sum of GBP taken");
  });

  it("prefers the spec's labels to the dataset's", () => {
    const data = cartesian(
      csv,
      { ...base, type: "line", x: { field: "date", label: "When" }, y: { aggregate: "count", label: "Orders" } },
      meta,
    );
    expect([data.x.label, data.y.label]).toEqual(["When", "Orders"]);
  });
});

describe("time buckets", () => {
  // Wednesday 1 January to Wednesday 15 January 2025.
  const csv = "date,shop,scoops\n2025-01-01,A,1\n2025-01-05,A,2\n2025-01-06,A,4\n2025-01-12,B,8\n2025-01-15,A,16\n";
  const weekly = { ...base, type: "line", x: { field: "date", timeUnit: "week" }, y: { field: "scoops", aggregate: "sum" } } as const;
  const series = (data: CartesianData) => data.series.map((s) => [s.key, s.values]);

  it("groups dates into weeks starting on Monday, titled by the unit", () => {
    const data = cartesian(csv, { ...weekly, series: { field: "shop" } });
    expect(data.x).toMatchObject({ values: ["2024-12-30", "2025-01-06", "2025-01-13"], timeUnit: "week", label: "Week commencing" });
    expect(series(data)).toEqual([
      ["A", [3, 4, 16]],
      ["B", [null, 8, null]],
    ]);
  });

  it("filters raw dates before bucketing", () => {
    const data = cartesian(csv, { ...weekly, filters: [{ field: "date", op: "gte", value: "2025-01-05" }] });
    expect(data.series[0]?.values).toEqual([2, 12, 16]);
  });

  it("moves annotations to the start of their bucket", () => {
    const data = cartesian(csv, {
      ...weekly,
      annotations: [
        { kind: "point", x: "2025-01-08", label: "p" },
        { kind: "range", from: "2025-01-02", to: "2025-01-14", label: "r" },
      ],
    });
    expect(data.annotations).toEqual([
      { kind: "point", x: "2025-01-06", label: "p" },
      { kind: "range", from: "2024-12-30", to: "2025-01-13", label: "r" },
    ]);
  });

  it("flags buckets that reach past the requested dates, for sum and count", () => {
    expect(cartesian(csv, weekly).x.partial).toEqual([true, false, true]);
    expect(cartesian(csv, { ...weekly, y: { aggregate: "count" } }).x.partial).toEqual([true, false, true]);
    expect(cartesian(csv, { ...weekly, x: { field: "date", timeUnit: "month" } }).x.partial).toEqual([true]);
  });

  it("measures partial buckets against the filtered range, not the rows present", () => {
    // Only B sells in the week of 6 January, but the week itself is whole.
    const data = cartesian(csv, {
      ...weekly,
      filters: [
        { field: "date", op: "gte", value: "2025-01-06" },
        { field: "date", op: "lte", value: "2025-01-12" },
        { field: "shop", op: "eq", value: "B" },
      ],
    });
    expect(data.x.values).toEqual(["2025-01-06"]);
    expect(data.x).not.toHaveProperty("partial");
  });

  it("flags nothing for other aggregates, or for days", () => {
    for (const aggregate of ["mean", "median", "min", "max"] as const) {
      expect(cartesian(csv, { ...weekly, y: { field: "scoops", aggregate } }).x).not.toHaveProperty("partial");
    }
    expect(cartesian(csv, { ...weekly, x: { field: "date", timeUnit: "day" } }).x).not.toHaveProperty("partial");
  });

  it("keeps partial flags with their buckets through sort and limit", () => {
    const data = cartesian(csv, { ...weekly, type: "bar", sort: "desc", limit: 2 });
    expect(data.x.values).toEqual(["2025-01-13", "2025-01-06"]);
    expect(data.x.partial).toEqual([true, false]);
  });

  it("prefers the spec's label, and leaves dates alone without a time unit", () => {
    expect(cartesian(csv, { ...weekly, x: { field: "date", timeUnit: "week", label: "Week" } }).x.label).toBe("Week");
    const daily = cartesian(csv, { ...weekly, x: { field: "date" } });
    expect(daily.x.values).toEqual(["2025-01-01", "2025-01-05", "2025-01-06", "2025-01-12", "2025-01-15"]);
    expect(daily.x).not.toHaveProperty("timeUnit");
    expect(daily.x).not.toHaveProperty("partial");
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
      x: { label: "Temp" },
      y: { label: "Scoops" },
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
      per: { field: "day", label: "Day", kind: "date" },
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
    expect(data.groupLabel).toBe("Shop");
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

  function asCartesian(data: ChartData): CartesianData {
    if (data.type === "scatter") throw new Error("expected cartesian data");
    return data;
  }

  const runCartesian = (id: string) => asCartesian(run(id));

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

  it("leaves Brixton's 2025 daily line null during its refit", () => {
    const daily: ChartSpec = {
      ...base,
      type: "line",
      x: { field: "date" },
      y: { field: "scoops", aggregate: "sum" },
      series: { field: "shop" },
      filters: [
        { field: "date", op: "gte", value: "2025-01-01" },
        { field: "date", op: "lte", value: "2025-12-31" },
      ],
    };
    const data = asCartesian(prepareChartData(gelato.rows, gelato.summary, daily));
    const brixton = data.series.find((s) => s.key === "Brixton");
    const on = (date: string) => brixton?.values[data.x.values.indexOf(date)];
    for (let day = 3; day <= 23; day++) expect(on(`2025-02-${String(day).padStart(2, "0")}`)).toBeNull();
    expect(on("2025-02-02")).toEqual(expect.any(Number));
    expect(on("2025-02-24")).toEqual(expect.any(Number));
  });

  it("leaves Brixton's weekly line null for the three weeks of its refit, and flags only the edge weeks", () => {
    const data = runCartesian("gelato-weekly-2025");
    expect(data.x.values).toHaveLength(53);
    expect(data.x.values[0]).toBe("2024-12-30");
    expect(data.x.values[52]).toBe("2025-12-29");
    expect(data.x.partial?.flatMap((p, i) => (p ? [data.x.values[i]] : []))).toEqual(["2024-12-30", "2025-12-29"]);
    const brixton = data.series.find((s) => s.key === "Brixton");
    const on = (week: string) => brixton?.values[data.x.values.indexOf(week)];
    for (const week of ["2025-02-03", "2025-02-10", "2025-02-17"]) expect(on(week)).toBeNull();
    expect(on("2025-01-27")).toEqual(expect.any(Number));
    expect(on("2025-02-24")).toEqual(expect.any(Number));
  });

  it("gives 24 whole months of revenue", () => {
    const data = runCartesian("gelato-monthly-revenue");
    expect(data.x.values).toHaveLength(24);
    expect(data.x.values[0]).toBe("2024-01-01");
    expect(data.x.values[23]).toBe("2025-12-01");
    expect(data.x).not.toHaveProperty("partial");
  });

  it("draws one point per trading day", () => {
    const data = run("gelato-daily-heat");
    if (data.type !== "scatter") throw new Error("expected scatter data");
    expect(data.groups.flatMap((g) => g.points)).toHaveLength(729);
  });
});
