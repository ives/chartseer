import { describe, expect, it } from "vitest";
import { type ParseResult, examples, gelatoSummary } from "@/lib/spec";
import { RENDER_CHART_DESCRIPTION, RENDER_CHART_SCHEMA, createRenderChartTool } from "./tools";

const renderChart = createRenderChartTool(gelatoSummary);
const spec = examples.find((e) => e.id === "gelato-weekly-2025")?.spec;

// The SDK types execute as possibly streaming; ours returns one result.
function run(input: unknown) {
  return renderChart.execute(input, { toolCallId: "call-1", messages: [], context: {} }) as Promise<ParseResult>;
}

describe("renderChart", () => {
  it("returns a valid spec", async () => {
    expect(await run({ spec })).toEqual({ ok: true, spec });
  });

  it("returns parseSpec's errors for an invalid spec", async () => {
    const result = await run({ spec: { ...spec, series: { field: "shops" } } });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.join("\n")).toMatch(/^series\.field: there is no column "shops"\. Columns: .*"shop"/);
  });

  it("reports structural errors itself, rather than leaving them to the SDK", async () => {
    const result = await run({ spec: { ...spec, type: "pie" } });
    expect(result).toEqual({ ok: false, errors: ['type: type must be "line", "area", "bar" or "scatter"'] });
  });

  it.each([
    ["a bare spec", spec],
    ["an extra key", { spec, note: "hi" }],
    ["a non-object", "line chart"],
  ])("rejects %s", async (_name, input) => {
    expect(await run(input)).toEqual({ ok: false, errors: ['(root): the input must be { "spec": { … } }, with no other keys'] });
  });

  it("shows the model RenderChartInput's schema", async () => {
    const schema = await renderChart.inputSchema;
    expect(JSON.stringify(schema)).toContain('"Always 1"');
  });

  it("sends exactly the exported schema and description, which the prompt check measures", async () => {
    const { jsonSchema } = renderChart.inputSchema as { jsonSchema: unknown };
    expect(await jsonSchema).toEqual(RENDER_CHART_SCHEMA);
    expect(renderChart.description).toBe(RENDER_CHART_DESCRIPTION);
  });
});
