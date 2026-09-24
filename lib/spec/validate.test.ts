import { describe, expect, it } from "vitest";
import { type ChartSpec, bikesSummary, gelatoSummary, validateSpec } from "@/lib/spec";

const areaBar: ChartSpec = {
  version: 1,
  type: "bar",
  title: "t",
  x: { field: "start_area" },
  y: { aggregate: "count" },
};

describe("a filter on the same column narrows its value count", () => {
  it("lets an in filter bring a bar chart under 50 categories", () => {
    expect(validateSpec(areaBar, bikesSummary)).toContainEqual(expect.stringContaining("has 126 values"));
    const filtered: ChartSpec = { ...areaBar, filters: [{ field: "start_area", op: "in", values: ["Soho", "Waterloo"] }] };
    expect(validateSpec(filtered, bikesSummary)).toEqual([]);
  });

  it("lets an eq filter bring a series under 12 values", () => {
    const bySeries: ChartSpec = { ...areaBar, x: { field: "hour" }, series: { field: "start_area" } };
    expect(validateSpec(bySeries, bikesSummary)).toContainEqual(expect.stringContaining("series.field"));
    const filtered: ChartSpec = { ...bySeries, filters: [{ field: "start_area", op: "eq", value: "Soho" }] };
    expect(validateSpec(filtered, bikesSummary)).toEqual([]);
  });

  it("ignores filters on other columns", () => {
    const filtered: ChartSpec = { ...areaBar, filters: [{ field: "season", op: "eq", value: "Winter" }] };
    expect(validateSpec(filtered, bikesSummary)).toContainEqual(expect.stringContaining("has 126 values"));
  });
});

describe("nearest-match suggestions", () => {
  const flavourFilter = (value: string): ChartSpec => ({
    version: 1,
    type: "bar",
    title: "t",
    x: { field: "shop" },
    y: { aggregate: "count" },
    filters: [{ field: "flavour", op: "eq", value }],
  });

  it("suggests a close match, ignoring case", () => {
    expect(validateSpec(flavourFilter("PISTACHO"), gelatoSummary)).toEqual([
      expect.stringContaining('Did you mean "Pistachio"?'),
    ]);
  });

  it("lists the values without a suggestion when nothing is close", () => {
    const [error] = validateSpec(flavourFilter("Vanilla"), gelatoSummary);
    expect(error).toContain('"Vanilla" is not a value of "flavour". Values: "Pistachio"');
    expect(error).not.toContain("Did you mean");
  });
});

describe("ISO dates", () => {
  const dateFilter = (value: string): ChartSpec => ({
    version: 1,
    type: "line",
    title: "t",
    x: { field: "date" },
    y: { aggregate: "count" },
    filters: [{ field: "date", op: "gte", value }],
  });

  it.each(["2025-06-19", "2026-01-16T00:07", "2026-01-16T23:59:59"])("accepts %s", (value) => {
    expect(validateSpec(dateFilter(value), gelatoSummary)).toEqual([]);
  });

  it.each(["2025-02-30", "2025-13-01", "2025-6-19", "2025-06-19T24:00", "June 2025"])("rejects %s", (value) => {
    expect(validateSpec(dateFilter(value), gelatoSummary)).toHaveLength(1);
  });
});

describe("scatter per", () => {
  const daily: ChartSpec = {
    version: 1,
    type: "scatter",
    title: "t",
    per: { field: "date" },
    x: { field: "max_temp_c", aggregate: "mean" },
    y: { field: "scoops", aggregate: "sum" },
  };

  it("accepts per with a group", () => {
    expect(validateSpec({ ...daily, group: { field: "shop" } }, gelatoSummary)).toEqual([]);
  });

  it("allows a log scale on a count", () => {
    expect(validateSpec({ ...daily, y: { aggregate: "count", scale: "log" } }, gelatoSummary)).toEqual([]);
  });

  it("still checks a log scale against the aggregated column", () => {
    expect(validateSpec({ ...daily, x: { field: "rain_mm", aggregate: "sum", scale: "log" } }, gelatoSummary)).toEqual([
      expect.stringContaining('x.scale: a log scale needs every value above zero, but the smallest value of "rain_mm" is 0.'),
    ]);
  });
});

it("reports a missing column once, without follow-on errors", () => {
  const spec: ChartSpec = { ...areaBar, x: { field: "nope" }, annotations: [{ kind: "point", x: 3, label: "n" }] };
  expect(validateSpec(spec, bikesSummary)).toHaveLength(1);
});
