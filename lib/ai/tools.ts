import { jsonSchema, tool } from "ai";
import { z } from "zod";
import { type DatasetSummary, type ParseResult, RenderChartInput, parseSpec } from "@/lib/spec";

// The model sees RenderChartInput's JSON Schema, but the SDK doesn't validate
// against it: a schema with no validate function passes the raw input to
// execute, so parseSpec writes every error the model reads (D-032).
// The options match the SDK's own conversion of Zod schemas. Zod's JSON Schema
// type differs from the SDK's in details the draft-7 output doesn't use, such
// as a boolean exclusiveMaximum, hence the cast.
const inputSchema = jsonSchema<unknown>(
  z.toJSONSchema(RenderChartInput, { target: "draft-7", io: "input" }) as Parameters<typeof jsonSchema>[0],
);

// Created per request, so parseSpec checks against that request's dataset.
export function createRenderChartTool(dataset: DatasetSummary) {
  return tool({
    description:
      "Draw a chart. Pass a complete spec. Returns { ok: true, spec } once it is drawn, or { ok: false, errors } listing what to fix.",
    inputSchema,
    execute: async (input): Promise<ParseResult> => {
      if (!isSpecEnvelope(input)) {
        return { ok: false, errors: ['(root): the input must be { "spec": { … } }, with no other keys'] };
      }
      return parseSpec(input.spec, dataset);
    },
  });
}

function isSpecEnvelope(input: unknown): input is { spec: unknown } {
  return (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    Object.keys(input).length === 1 &&
    "spec" in input
  );
}
