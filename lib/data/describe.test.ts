import { describe, expect, it } from "vitest";
import type { ChartSpec } from "@/lib/spec";
import { describeChart, formatNumber, formatXValue } from "./describe";
import { inferDataset } from "./infer";
import { parseCsv } from "./parse";
import { prepareChartData } from "./prepare";

const base = { version: 1, title: "t" } as const;

const shops = `date,shop,scoops,temp
2025-06-02,Brixton,10,20
2025-06-02,Richmond,12,20
2025-06-03,Brixton,30,24
2025-06-03,Richmond,15,24
2025-06-04,Brixton,9,19
`;

function describeCsv(csv: string, spec: ChartSpec): string {
  const { summary, rows } = inferDataset(parseCsv(csv));
  return describeChart(spec, prepareChartData(rows, summary, spec));
}

describe("describeChart", () => {
  it("names a line chart's series, x span and largest value", () => {
    const text = describeCsv(shops, {
      ...base,
      type: "line",
      x: { field: "date" },
      y: { field: "scoops", aggregate: "sum" },
      series: { field: "shop" },
    });
    expect(text).toBe(
      "Line chart of Sum of scoops by Date, split by Shop (Brixton and Richmond). " +
        "Date: 2 Jun 2025 to 4 Jun 2025. Sum of scoops: 9 to 30, highest at 3 Jun 2025 for Brixton.",
    );
  });

  it("reads stacked charts by their totals", () => {
    const spec = { ...base, x: { field: "date" }, y: { field: "scoops", aggregate: "sum" }, series: { field: "shop" } } as const;
    expect(describeCsv(shops, { ...spec, type: "bar", layout: "stacked" })).toMatch(
      /^Stacked bar chart of .* Totals: 9 to 45, highest at 3 Jun 2025\.$/,
    );
    expect(describeCsv(shops, { ...spec, type: "area", stacked: true })).toMatch(/^Stacked area chart of .* Totals: 9 to 45/);
    expect(describeCsv(shops, { ...spec, type: "area" })).toMatch(/^Area chart of .* Sum of scoops: 9 to 30/);
    expect(describeCsv(shops, { ...spec, type: "bar" })).toMatch(/^Grouped bar chart of/);
  });

  it("counts categories on a category axis", () => {
    const text = describeCsv(shops, { ...base, type: "bar", x: { field: "shop" }, y: { aggregate: "count" } });
    expect(text).toBe("Bar chart of Count by Shop. Shop: 2 categories, from Brixton to Richmond. Count: 2 to 3, highest at Brixton.");
  });

  it("names periods with a time unit, including partial ones", () => {
    const text = describeCsv(`date,n\n2024-12-31,5\n2025-01-06,7\n2025-01-15,2\n`, {
      ...base,
      type: "line",
      x: { field: "date", timeUnit: "week" },
      y: { field: "n", aggregate: "sum" },
    });
    expect(text).toBe(
      "Line chart of Sum of n by week. Week commencing: 30 Dec 2024 to 13 Jan 2025. " +
        "Sum of n: 2 to 7, highest at week commencing 6 Jan 2025.",
    );
  });

  it("describes a scatter, its groups and log axes", () => {
    const text = describeCsv(shops, {
      ...base,
      type: "scatter",
      x: { field: "temp" },
      y: { field: "scoops", scale: "log" },
      group: { field: "shop" },
    });
    expect(text).toBe(
      "Scatter plot of Scoops against Temp, 5 points, grouped by Shop (Brixton and Richmond), y on a log scale. " +
        "Temp: 19 to 24. Scoops: 9 to 30, highest at Temp 24 (Brixton).",
    );
  });

  it("names the per value of the highest point", () => {
    const text = describeCsv(shops, {
      ...base,
      type: "scatter",
      per: { field: "date" },
      x: { field: "temp", aggregate: "mean" },
      y: { field: "scoops", aggregate: "sum" },
    });
    expect(text).toMatch(/^Scatter plot of Sum of scoops against Mean of temp, 3 points, one per Date\. .* highest at 3 Jun 2025\.$/);
  });

  it("says when nothing matches the filters", () => {
    const filters = [{ field: "shop", op: "eq", value: "Nowhere" }] as const;
    expect(describeCsv(shops, { ...base, type: "line", x: { field: "date" }, y: { aggregate: "count" }, filters: [...filters] })).toMatch(
      /No data matches the filters\.$/,
    );
    expect(
      describeCsv(shops, { ...base, type: "scatter", x: { field: "temp" }, y: { field: "scoops" }, filters: [...filters] }),
    ).toBe("Scatter plot of Scoops against Temp, 0 points. No data matches the filters.");
  });
});

describe("formatting", () => {
  it("groups digits and rounds to two places", () => {
    expect(formatNumber(25262)).toBe("25,262");
    expect(formatNumber(-0.12345)).toBe("-0.12");
  });

  it("formats x values by kind and unit", () => {
    expect(formatXValue("2025-07-01", "date", "quarter")).toBe("Q3 2025");
    expect(formatXValue("2025-07-01", "date")).toBe("1 Jul 2025");
    expect(formatXValue("2026-01-16T00:07", "date")).toBe("2026-01-16 00:07");
    expect(formatXValue("Soho", "category")).toBe("Soho");
  });
});
