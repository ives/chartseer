import { describe, expect, it } from "vitest";
import { inferDataset } from "@/lib/data/infer";
import { parseCsv } from "@/lib/data/parse";
import { prepareChartData } from "@/lib/data/prepare";
import { type ChartSpec, parseSpec } from "@/lib/spec";
import { transitionKind } from "./motion";
import { drawOrder } from "./scatter-chart";

const { summary, rows } = inferDataset(
  parseCsv("date,shop,scoops,temp\n2025-06-01,Brixton,10,20\n2025-06-01,Soho,12,21\n2025-06-02,Brixton,9,22\n2025-06-03,Soho,4,19\n"),
);

function drawn(spec: object) {
  const result = parseSpec({ version: 1, title: "t", ...spec }, summary);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return { spec: result.spec as ChartSpec, data: prepareChartData(rows, summary, result.spec) };
}

const line = { type: "line", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" }, series: { field: "shop" } };
const bars = { type: "bar", x: { field: "shop" }, y: { field: "scoops", aggregate: "sum" } };

describe("transitionKind", () => {
  it("eases a line whose points correspond", () => {
    expect(transitionKind(drawn(line), drawn({ ...line, y: { field: "scoops", aggregate: "mean" } }))).toBe("ease");
  });

  it("crossfades a line whose x values or series change", () => {
    expect(transitionKind(drawn(line), drawn({ ...line, filters: [{ field: "date", op: "gte", value: "2025-06-02" }] }))).toBe("crossfade");
    expect(transitionKind(drawn(line), drawn({ ...line, series: undefined }))).toBe("crossfade");
  });

  it("eases bars even when categories come and go, but not a turn on their side", () => {
    expect(transitionKind(drawn(bars), drawn({ ...bars, filters: [{ field: "shop", op: "eq", value: "Soho" }] }))).toBe("ease");
    expect(transitionKind(drawn(bars), drawn({ ...bars, orientation: "horizontal" }))).toBe("crossfade");
  });

  it("crossfades a change of chart type, a stacking change and any scatter", () => {
    expect(transitionKind(drawn(line), drawn({ ...line, type: "area" }))).toBe("crossfade");
    expect(transitionKind(drawn({ ...line, type: "area" }), drawn({ ...line, type: "area", stacked: true }))).toBe("crossfade");
    const scatter = { type: "scatter", x: { field: "temp" }, y: { field: "scoops" } };
    expect(transitionKind(drawn(scatter), drawn({ ...scatter, group: { field: "shop" } }))).toBe("crossfade");
  });
});

describe("drawOrder", () => {
  it("puts the largest scatter group first, so smaller ones are drawn on top", () => {
    const point = { x: 0, y: 0 };
    const groups = [
      { key: "E-bike", label: "E-bike", points: [point] },
      { key: "Classic", label: "Classic", points: [point, point, point] },
      { key: "Cargo", label: "Cargo", points: [point, point] },
    ];
    expect(drawOrder(groups)).toEqual([1, 2, 0]);
  });
});
