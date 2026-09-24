import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ChartSpec, DatasetSummary, RenderChartInput, bikesSummary, examples, gelatoSummary } from "@/lib/spec";

const scatter = {
  version: 1,
  type: "scatter",
  title: "t",
  x: { field: "a" },
  y: { field: "b" },
};

const bar = {
  version: 1,
  type: "bar",
  title: "t",
  x: { field: "a" },
  y: { aggregate: "count" },
};

describe("examples", () => {
  it.each(examples.map((e) => [e.id, e.spec]))("%s parses", (_id, spec) => {
    expect(ChartSpec.safeParse(spec).error).toBeUndefined();
  });
});

describe("fixtures", () => {
  it.each([
    ["bikes", bikesSummary],
    ["gelato", gelatoSummary],
  ])("%s parses", (_name, summary) => {
    expect(DatasetSummary.safeParse(summary).error).toBeUndefined();
  });

  it.each([
    ["both values and examples", { values: ["a", "b"], examples: ["a"] }],
    ["examples when it has 50 or fewer values", { examples: ["a"] }],
    ["values that don't match the distinct count", { values: ["a"] }],
  ])("rejects a category column with %s", (_name, list) => {
    const column = { name: "c", kind: "category", distinct: 2, nulls: 0, ...list };
    expect(DatasetSummary.safeParse({ ...gelatoSummary, columns: [column] }).success).toBe(false);
  });
});

describe("ChartSpec rejects", () => {
  it.each([
    ["annotations on a scatter", { ...scatter, annotations: [{ kind: "point", x: 1, label: "n" }] }],
    ["a bar limit above 50", { ...bar, limit: 51 }],
    ["an in filter with no values", { ...bar, filters: [{ field: "a", op: "in", values: [] }] }],
    ["a field on a count measure", { ...bar, y: { field: "b", aggregate: "count" } }],
    ["a measure with no aggregate", { ...bar, y: { field: "b" } }],
    ["a log scale on a bar", { ...bar, y: { field: "b", aggregate: "sum", scale: "log" } }],
    ["an unknown key", { ...bar, colour: "red" }],
  ])("%s", (_name, spec) => {
    expect(ChartSpec.safeParse(spec).success).toBe(false);
  });
});

describe("RenderChartInput", () => {
  it("has an object at the root of its JSON Schema, as tool inputs require", () => {
    expect(z.toJSONSchema(RenderChartInput)).toMatchObject({ type: "object", required: ["spec"] });
  });

  // The model's documentation for the tool. Any schema change shows up in this file's diff.
  it("matches the JSON Schema snapshot", async () => {
    await expect(JSON.stringify(z.toJSONSchema(RenderChartInput), null, 2) + "\n").toMatchFileSnapshot(
      "./__snapshots__/render-chart-input.schema.json",
    );
  });
});
