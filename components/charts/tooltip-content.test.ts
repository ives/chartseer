import { describe, expect, it } from "vitest";
import { inferDataset } from "@/lib/data/infer";
import { parseCsv } from "@/lib/data/parse";
import { type CartesianData, type ScatterData, prepareChartData } from "@/lib/data/prepare";
import { parseSpec } from "@/lib/spec";
import { barTooltip, cartesianTooltip, nearestIndex, scatterTooltip } from "./tooltip-content";

const color = (i: number) => `c${i}`;

function prepared(csv: string, spec: object, meta = {}) {
  const { summary, rows } = inferDataset(parseCsv(csv), meta);
  const result = parseSpec({ version: 1, title: "t", ...spec }, summary);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return prepareChartData(rows, summary, result.spec, meta);
}

const shops = `date,shop,revenue_gbp
2025-06-02,Brixton,10
2025-06-02,Richmond,1200.5
2025-06-09,Brixton,12
2025-06-12,Richmond,15
`;
const meta = { columnLabels: { revenue_gbp: "Revenue (£)", shop: "Shop" } };

describe("cartesianTooltip", () => {
  it("names the x value and lists every series under the measure", () => {
    const data = prepared(shops, { type: "line", x: { field: "date" }, y: { field: "revenue_gbp", aggregate: "sum" }, series: { field: "shop" } }, meta) as CartesianData;
    expect(cartesianTooltip(data, 0, color)).toEqual({
      title: "Date: 2 Jun 2025",
      heading: "Sum of revenue (£)",
      rows: [
        { label: "Brixton", value: "10", color: "c0" },
        { label: "Richmond", value: "1,200.5", color: "c1" },
      ],
    });
  });

  it("uses the measure as the label for a single series, and says 'no data' for a gap", () => {
    const data = prepared(shops, { type: "line", x: { field: "date" }, y: { field: "revenue_gbp", aggregate: "sum" }, filters: [{ field: "shop", op: "eq", value: "Brixton" }] }, meta) as CartesianData;
    expect(cartesianTooltip(data, 1, color)).toEqual({ title: "Date: 9 Jun 2025", rows: [{ label: "Sum of revenue (£)", value: "12" }] });
    const gappy = { ...data, series: [{ ...data.series[0], key: null, label: "x", values: [1, null] }] } as CartesianData;
    expect(cartesianTooltip(gappy, 1, color).rows).toEqual([{ label: "Sum of revenue (£)", value: "no data" }]);
  });

  it("labels a period by its unit and warns when it is partial", () => {
    // Wednesday 4 June to Thursday 12 June: both weeks are partial.
    const data = prepared(shops.replace("2025-06-02", "2025-06-04").replace("2025-06-02", "2025-06-04"), { type: "line", x: { field: "date", timeUnit: "week" }, y: { field: "revenue_gbp", aggregate: "sum" } }, meta) as CartesianData;
    expect(cartesianTooltip(data, 0, color)).toMatchObject({
      title: "Week commencing: 2 Jun 2025",
      note: "Partial week: covers only part of the range, so it runs low.",
    });
  });
});

describe("barTooltip", () => {
  const spec = { type: "bar", x: { field: "date" }, y: { field: "revenue_gbp", aggregate: "sum" }, series: { field: "shop" }, layout: "stacked" };

  it("gives a stacked segment's value and the stack's total", () => {
    const data = prepared(shops, spec, meta) as CartesianData;
    expect(barTooltip(data, 0, 1, true, color)).toEqual({
      title: "Date: 2 Jun 2025",
      heading: "Sum of revenue (£)",
      rows: [
        { label: "Richmond", value: "1,200.5", color: "c1" },
        { label: "Total", value: "1,210.5" },
      ],
    });
  });

  it("gives no total for grouped bars", () => {
    const data = prepared(shops, { ...spec, layout: "grouped" }, meta) as CartesianData;
    expect(barTooltip(data, 0, 0, false, color).rows).toEqual([{ label: "Brixton", value: "10", color: "c0" }]);
  });
});

describe("scatterTooltip", () => {
  it("says what the point stands for, both measures and its group", () => {
    const data = prepared(
      "date,day_type,duration_min\n2026-01-16,Weekday,10\n2026-01-16,Weekday,14\n2026-01-17,Weekend,30\n",
      {
        type: "scatter",
        per: { field: "date" },
        x: { aggregate: "count", label: "Journeys" },
        y: { field: "duration_min", aggregate: "median", label: "Median duration (min)" },
        group: { field: "day_type" },
      },
      { columnLabels: { day_type: "Day type" } },
    ) as ScatterData;
    expect(scatterTooltip(data, 0, 0, color)).toEqual({
      title: "Date: 16 Jan 2026",
      rows: [
        { label: "Journeys", value: "2" },
        { label: "Median duration (min)", value: "12" },
        { label: "Day type", value: "Weekday", color: "c0" },
      ],
    });
  });

  it("has no title for a raw, ungrouped scatter", () => {
    const data = prepared("a,b\n1,2\n3,4\n", { type: "scatter", x: { field: "a" }, y: { field: "b" } }) as ScatterData;
    expect(scatterTooltip(data, 0, 1, color)).toEqual({ rows: [{ label: "A", value: "3" }, { label: "B", value: "4" }] });
  });
});

describe("nearestIndex", () => {
  it("snaps to the closest position, the first on a tie", () => {
    expect(nearestIndex([0, 10, 20], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20], 15)).toBe(1);
    expect(nearestIndex([0, 10, 20], 99)).toBe(2);
    expect(nearestIndex([], 5)).toBe(-1);
  });
});
