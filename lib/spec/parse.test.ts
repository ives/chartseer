import { describe, expect, it } from "vitest";
import { type DatasetSummary, bikesSummary, examples, gelatoSummary, parseSpec } from "@/lib/spec";

const gelatoBar = {
  version: 1,
  type: "bar",
  title: "t",
  x: { field: "shop" },
  y: { field: "scoops", aggregate: "sum" },
};

const gelatoLine = {
  version: 1,
  type: "line",
  title: "t",
  x: { field: "date" },
  y: { field: "scoops", aggregate: "sum" },
};

const gelatoScatter = {
  version: 1,
  type: "scatter",
  title: "t",
  x: { field: "max_temp_c" },
  y: { field: "scoops" },
};

function errorsFor(input: unknown, dataset: DatasetSummary = gelatoSummary): string[] {
  const result = parseSpec(input, dataset);
  return result.ok ? [] : result.errors;
}

describe("parseSpec accepts", () => {
  it.each(examples.map((e) => [e.id, e]))("%s", (_id, { spec, dataset }) => {
    expect(parseSpec(spec, dataset)).toEqual({ ok: true, spec });
  });
});

describe("parseSpec rejects", () => {
  it.each([
    ["an unknown key", { ...gelatoBar, colour: "red" }, '(root): Unrecognized key: "colour"'],
    ["an unknown chart type", { ...gelatoBar, type: "pie" }, "type: Invalid discriminator value"],
    ["an unknown x field", { ...gelatoBar, x: { field: "Shop" } }, 'x.field: there is no column "Shop". Columns: "date", "weekday", "shop"'],
    [
      "an unknown measure field",
      { ...gelatoBar, y: { field: "revenue", aggregate: "sum" } },
      'y.field: there is no column "revenue". Numeric columns: "scoops", "revenue_gbp", "max_temp_c", "rain_mm".',
    ],
    ["a sum over a category column", { ...gelatoBar, y: { field: "flavour", aggregate: "sum" } }, 'y.field: "flavour" is a category column; sum needs a number.'],
    ["a scatter axis on a date column", { ...gelatoScatter, x: { field: "date" } }, 'x.field: "date" is a date column; scatter axes need numbers.'],
    [
      "a log scale on a column with zeros",
      { ...gelatoScatter, x: { field: "rain_mm", scale: "log" } },
      'x.scale: a log scale needs every value above zero, but the smallest value of "rain_mm" is 0.',
    ],
    ["more than 50 bars", { ...gelatoBar, x: { field: "date" } }, 'x.field: "date" has 729 values; a bar chart shows at most 50. Add limit'],
    ["a series with more than 12 values", { ...gelatoLine, series: { field: "date" } }, 'series.field: "date" has 729 values; a series can have at most 12.'],
    ["a group with more than 12 values", { ...gelatoScatter, group: { field: "rain_mm" } }, 'group.field: "rain_mm" has 107 values'],
    ["an unknown filter field", { ...gelatoBar, filters: [{ field: "store", op: "eq", value: "Brixton" }] }, 'filters[0].field: there is no column "store".'],
    [
      "a string value on a number column",
      { ...gelatoBar, filters: [{ field: "scoops", op: "gt", value: "70" }] },
      'filters[0].value: "scoops" is a number column, so the value must be a number, not the string "70".',
    ],
    [
      "an order comparison on a category column",
      { ...gelatoBar, filters: [{ field: "shop", op: "gt", value: "Brixton" }] },
      'filters[0].op: "gt" compares order, which only number and date columns have; "shop" is a category column.',
    ],
    [
      "a misspelt filter value",
      { ...gelatoBar, filters: [{ field: "flavour", op: "eq", value: "Amalfi Lemno" }] },
      'filters[0].value: "Amalfi Lemno" is not a value of "flavour". Did you mean "Amalfi Lemon"? Values: "Pistachio",',
    ],
    [
      "a misspelt value in an in list",
      { ...gelatoBar, filters: [{ field: "shop", op: "in", values: ["Brixton", "covent garden"] }] },
      'filters[0].values[1]: "covent garden" is not a value of "shop". Did you mean "Covent Garden"?',
    ],
    [
      "a number on a category column",
      { ...gelatoBar, filters: [{ field: "weather", op: "eq", value: 1 }] },
      'filters[0].value: "weather" is a category column, so the value must be a string',
    ],
    [
      "a date filter that isn't ISO 8601",
      { ...gelatoLine, filters: [{ field: "date", op: "gte", value: "19/06/2025" }] },
      'filters[0].value: "date" is a date column, so the value must be an ISO 8601 date string such as "2024-01-01", not "19/06/2025".',
    ],
    [
      "a date annotation that isn't ISO 8601",
      { ...gelatoLine, annotations: [{ kind: "range", from: "2025-06-19", to: "1 July 2025", label: "Heatwave" }] },
      'annotations[0].to: "date" is a date column, so the value must be an ISO 8601 date string',
    ],
    [
      "a misspelt annotation on a category axis",
      { ...gelatoBar, x: { field: "weekday" }, annotations: [{ kind: "point", x: "Satruday", label: "n" }] },
      'annotations[0].x: "Satruday" is not a value of "weekday". Values: "Mon",',
    ],
    [
      "a string annotation on a number axis",
      { ...gelatoLine, x: { field: "max_temp_c" }, annotations: [{ kind: "point", x: "30", label: "n" }] },
      'annotations[0].x: "max_temp_c" is a number column, so the value must be a number, not the string "30".',
    ],
  ])("%s", (_name, spec, expected) => {
    expect(errorsFor(spec)).toContainEqual(expect.stringContaining(expected));
  });

  it("collects every semantic error, not just the first", () => {
    const errors = errorsFor({
      ...gelatoBar,
      y: { field: "flavour", aggregate: "sum" },
      filters: [{ field: "shop", op: "eq", value: "Brixtn" }],
    });
    expect(errors).toEqual([
      expect.stringContaining("y.field:"),
      expect.stringContaining('filters[0].value: "Brixtn" is not a value of "shop". Did you mean "Brixton"?'),
    ]);
  });

  it("checks fields against the dataset it is given", () => {
    const busiestAreas = examples.find((e) => e.id === "bikes-busiest-areas");
    expect(busiestAreas).toBeDefined();
    expect(errorsFor(busiestAreas?.spec, gelatoSummary)).toContainEqual(expect.stringContaining('there is no column "start_area"'));
    expect(errorsFor(busiestAreas?.spec, bikesSummary)).toEqual([]);
  });
});
