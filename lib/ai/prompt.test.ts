import { describe, expect, it } from "vitest";
import { bikesSummary, examples, gelatoSummary } from "@/lib/spec";
import { buildSystemPrompt } from "./prompt";

describe("buildSystemPrompt", () => {
  it("keeps the rules identical across datasets and specs, so they stay cached", () => {
    const spec = examples[0]?.spec ?? null;
    expect(buildSystemPrompt(bikesSummary, spec).rules).toBe(buildSystemPrompt(gelatoSummary, null).rules);
  });

  it("lists every column with its name and label", () => {
    const { dataset } = buildSystemPrompt(gelatoSummary, null);
    expect(dataset).toContain(`${gelatoSummary.rowCount} rows`);
    for (const column of gelatoSummary.columns) {
      expect(dataset).toContain(`"name":${JSON.stringify(column.name)}`);
      expect(dataset).toContain(`"label":${JSON.stringify(column.label)}`);
    }
  });

  it("includes the sample rows", () => {
    const { dataset } = buildSystemPrompt(gelatoSummary, null);
    for (const row of gelatoSummary.sampleRows) expect(dataset).toContain(JSON.stringify(row));
  });

  it("includes the current spec when there is one", () => {
    const spec = examples.find((e) => e.id === "gelato-weekly-2025")?.spec ?? null;
    expect(buildSystemPrompt(gelatoSummary, spec).currentSpec).toContain(JSON.stringify(spec));
  });

  it("says when no chart has been drawn", () => {
    expect(buildSystemPrompt(gelatoSummary, null).currentSpec).toBe("No chart has been drawn yet.");
  });
});
