import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DatasetSummary } from "@/lib/spec/columns";
import { bikesSummary, gelatoSummary } from "@/lib/spec/fixtures";
import { datasets } from "./datasets";
import { parseCsv } from "./parse";

describe("bundled dataset labels", () => {
  for (const meta of Object.values(datasets)) {
    it(`labels exactly the columns of ${meta.id}.csv`, () => {
      const header = readFileSync(`public/data/${meta.id}.csv`, "utf8").split("\n", 1)[0] ?? "";
      const { columns } = parseCsv(`${header}\n`);
      expect(Object.keys(meta.columnLabels ?? {}).sort()).toEqual([...columns].sort());
    });
  }
});

// The landing page shows these facts beside the app's own text (D-068).
describe("bundled dataset facts", () => {
  it("keep the app's text as it was", () => {
    expect(datasets.bikes.summary).toBe("About 25,000 Santander Cycles hires in London, January to May 2026.");
    expect(datasets.bikes.note).toBe("A random sample of about 1 in 30.8 hires — counts are not TfL totals.");
    expect(datasets.bikes.attribution).toMatch(/^Powered by TfL Open Data\. Contains OS data © Crown copyright/);
  });

  it("match the data", () => {
    expect(Math.round(bikesSummary.rowCount / 1000) * 1000).toBe(25000);
    const range = (summary: DatasetSummary) => summary.columns.find((c) => c.name === "date");
    expect(range(bikesSummary)).toMatchObject({ min: expect.stringMatching(/^2026-01-/), max: expect.stringMatching(/^2026-05-/) });
    expect(range(gelatoSummary)).toMatchObject({ min: "2024-01-01", max: "2025-12-31" });
    const shops = gelatoSummary.columns.find((c) => c.name === "shop");
    expect(shops?.distinct).toBe(5);
  });
});
