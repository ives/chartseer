// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { datasets } from "@/lib/data/datasets";
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
const { summary, rows } = inferDataset(parseCsv(csv));

function renderChart(input: ChartSpec) {
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
    expect(screen.getByRole("img").querySelectorAll("rect")).toHaveLength(4);
    cleanup();
    renderChart({ ...bar, layout: "stacked", orientation: "horizontal" });
    expect(screen.getByRole("img").querySelectorAll("rect")).toHaveLength(4);
  });

  it("shows a placeholder, the title and the attribution for scatter charts", () => {
    renderChart({ ...base, type: "scatter", x: { field: "max_temp_c" }, y: { field: "scoops" } });
    expect(screen.getByText("Scoops")).toBeTruthy();
    expect(screen.getByText(/not built yet/)).toBeTruthy();
    expect(screen.getByText(datasets.gelato.attribution)).toBeTruthy();
  });
});
