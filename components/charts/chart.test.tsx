// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { datasets } from "@/lib/data/datasets";
import { describeChart } from "@/lib/data/describe";
import { inferDataset } from "@/lib/data/infer";
import { parseCsv } from "@/lib/data/parse";
import { prepareChartData } from "@/lib/data/prepare";
import { type ChartSpec, parseSpec } from "@/lib/spec";
import { Chart } from "./chart";

const csv = `date,shop,scoops,max_temp_c
2025-06-01,Brixton,10,20
2025-06-01,Richmond,12,20
2025-06-02,Brixton,,22
2025-06-02,Richmond,15,22
2025-06-03,Brixton,9,19
`;
const shops = inferDataset(parseCsv(csv));

// Friday 15 November 2024 to Monday 10 February 2025, so the first and last
// weeks and months are partial.
const seasonal = inferDataset(
  parseCsv(`date,scoops
2024-11-15,5
2024-12-02,6
2025-01-06,7
2025-02-10,8
`),
);

function renderChart(input: ChartSpec, { summary, rows } = shops) {
  const result = parseSpec(input, summary);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return render(<Chart spec={result.spec} data={prepareChartData(rows, summary, result.spec)} dataset={datasets.gelato} />);
}

const base = { version: 1, title: "Scoops" } as const;

describe("Chart", () => {
  beforeEach(() => {
    // Report a fixed width at once, so the SVG is drawn.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe() {
          this.callback([{ contentRect: { width: 600 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
        }
        disconnect() {}
      },
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("draws a line per series, labelled by the title", () => {
    renderChart({
      ...base,
      type: "line",
      x: { field: "date" },
      y: { field: "scoops", aggregate: "sum" },
      series: { field: "shop" },
      annotations: [{ kind: "point", x: "2025-06-02", label: "Heat" }],
    });
    const svg = screen.getByRole("img", { name: "Scoops" });
    expect(svg.querySelectorAll("path")).toHaveLength(2);
    expect(screen.getByText("Heat")).toBeTruthy();
  });

  it("draws grouped and stacked bars, skipping missing values", () => {
    const bar = { ...base, type: "bar", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" }, series: { field: "shop" } } as const;
    renderChart(bar);
    // Brixton has no scoops on 2025-06-02 and Richmond no row on 2025-06-03.
    expect(screen.getByRole("img").querySelectorAll("rect:not([data-hover-layer])")).toHaveLength(4);
    cleanup();
    renderChart({ ...bar, layout: "stacked", orientation: "horizontal" });
    expect(screen.getByRole("img").querySelectorAll("rect:not([data-hover-layer])")).toHaveLength(4);
  });

  it("labels monthly ticks by period, with the year where it changes", () => {
    renderChart({ ...base, type: "line", x: { field: "date", timeUnit: "month" }, y: { field: "scoops", aggregate: "sum" } }, seasonal);
    const ticks = [...screen.getByRole("img").querySelectorAll("text")].map((t) => t.textContent);
    expect(ticks).toEqual(expect.arrayContaining(["Nov 2024", "Dec", "Jan 2025", "Feb", "Month"]));
  });

  it("dashes a line into partial buckets and says why", () => {
    renderChart({ ...base, type: "line", x: { field: "date", timeUnit: "week" }, y: { field: "scoops", aggregate: "sum" } }, seasonal);
    expect(screen.getByRole("img").querySelectorAll("path[data-partial]")).toHaveLength(1);
    expect(
      screen.getByText(
        "Dashed: the weeks commencing 11 Nov 2024 and 10 Feb 2025 cover only part of the date range, so their totals run low.",
      ),
    ).toBeTruthy();
  });

  it("draws partial bars lighter, with period labels and a footnote", () => {
    renderChart({ ...base, type: "bar", x: { field: "date", timeUnit: "month" }, y: { aggregate: "count" } }, seasonal);
    const svg = screen.getByRole("img");
    expect(svg.querySelectorAll("rect:not([data-hover-layer])")).toHaveLength(4);
    expect(svg.querySelectorAll("rect[data-partial]")).toHaveLength(2);
    expect(screen.getByText("Nov 2024")).toBeTruthy();
    expect(screen.getByText(/^Lighter: Nov 2024 and Feb 2025 cover only part/)).toBeTruthy();
  });

  it("adds no footnote when no bucket is partial", () => {
    renderChart({ ...base, type: "line", x: { field: "date", timeUnit: "month" }, y: { field: "scoops", aggregate: "mean" } }, seasonal);
    expect(screen.queryByText(/only part of the date range/)).toBeNull();
    expect(screen.getByRole("img").querySelectorAll("path[data-partial]")).toHaveLength(0);
  });

  it("draws a translucent area and an edge per series", () => {
    renderChart({ ...base, type: "area", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" }, series: { field: "shop" } });
    // Per series: one fill and one edge. Brixton's gap on 2025-06-02 leaves
    // lone values either side, which are dots, not paths.
    const paths = [...screen.getByRole("img").querySelectorAll("path")];
    expect(paths.filter((p) => p.style.opacity === "var(--chart-area-opacity)")).toHaveLength(2);
    expect(paths).toHaveLength(4);
  });

  it("stacks areas, with partial buckets lighter", () => {
    renderChart({ ...base, type: "area", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" }, series: { field: "shop" }, stacked: true });
    expect(screen.getByRole("img").querySelectorAll("path[data-partial]")).toHaveLength(0);
    cleanup();
    renderChart({ ...base, type: "area", x: { field: "date", timeUnit: "month" }, y: { aggregate: "count" } }, seasonal);
    // A single series isn't stacked: its edge is dashed into partial months.
    expect(screen.getByRole("img").querySelectorAll("path[data-partial]")).toHaveLength(1);
    expect(screen.getByText(/^Dashed: Nov 2024 and Feb 2025 cover only part/)).toBeTruthy();
  });

  it("draws a point per row, grouped, with a legend", () => {
    renderChart({ ...base, type: "scatter", x: { field: "max_temp_c" }, y: { field: "scoops" }, group: { field: "shop" } });
    // Brixton's 2025-06-02 row has no scoops, so four of the five rows are points.
    expect(screen.getByRole("img").querySelectorAll("circle")).toHaveLength(4);
    const legend = screen.getByRole("list", { name: "Shop" });
    expect(legend.textContent).toContain("Brixton");
    expect(legend.textContent).toContain("Richmond");
  });

  it("labels a log axis only at round values", () => {
    renderChart({ ...base, type: "scatter", x: { field: "max_temp_c" }, y: { field: "scoops", scale: "log" } });
    const ticks = [...screen.getByRole("img").querySelectorAll("text")].map((t) => t.textContent);
    expect(ticks).toContain("10");
    expect(ticks).not.toContain("");
  });

  it.each([
    ["line", { type: "line", x: { field: "date" }, y: { aggregate: "count" } }],
    ["area", { type: "area", x: { field: "date" }, y: { aggregate: "count" } }],
    ["bar", { type: "bar", x: { field: "shop" }, y: { aggregate: "count" } }],
    ["scatter", { type: "scatter", x: { field: "max_temp_c" }, y: { field: "scoops" } }],
  ] as const)("describes the %s chart to screen readers", (_type, spec) => {
    const input = { ...base, ...spec } as ChartSpec;
    renderChart(input);
    const result = parseSpec(input, shops.summary);
    if (!result.ok) throw new Error(result.errors.join("\n"));
    const expected = describeChart(result.spec, prepareChartData(shops.rows, shops.summary, result.spec));
    const svg = screen.getByRole("img", { name: "Scoops" });
    expect(document.getElementById(svg.getAttribute("aria-describedby") ?? "")?.textContent).toBe(expected);
  });

  it("shows the data as a table, marking partial and missing values", () => {
    renderChart({ ...base, type: "bar", x: { field: "date", timeUnit: "month" }, y: { field: "scoops", aggregate: "sum" } }, seasonal);
    fireEvent.click(screen.getByRole("button", { name: "View as table" }));
    const table = screen.getByRole("table", { name: "Scoops" });
    const headers = [...table.querySelectorAll("th[scope=col]")].map((th) => th.textContent);
    expect(headers).toEqual(["Month", "Sum of scoops"]);
    const rows = [...table.querySelectorAll("th[scope=row]")].map((th) => th.textContent);
    expect(rows).toEqual(["Nov 2024 (partial)", "Dec 2024", "Jan 2025", "Feb 2025 (partial)"]);
    cleanup();

    renderChart({ ...base, type: "line", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" }, series: { field: "shop" } });
    fireEvent.click(screen.getByRole("button", { name: "View as table" }));
    // Richmond has no row on 2025-06-03.
    expect(screen.getByRole("table").textContent).toContain("no data");
  });

  it("lists scatter points with their per value", () => {
    renderChart({ ...base, type: "scatter", per: { field: "date" }, x: { field: "max_temp_c", aggregate: "mean" }, y: { field: "scoops", aggregate: "sum" } });
    fireEvent.click(screen.getByRole("button", { name: "View as table" }));
    const table = screen.getByRole("table", { name: "Scoops" });
    expect([...table.querySelectorAll("th[scope=col]")].map((th) => th.textContent)).toEqual(["Date", "Mean of max temp c", "Sum of scoops"]);
    expect(table.querySelectorAll("tbody tr")).toHaveLength(3);
  });
});
