// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { datasets } from "@/lib/data/datasets";
import { inferDataset } from "@/lib/data/infer";
import { parseCsv } from "@/lib/data/parse";
import { prepareChartData } from "@/lib/data/prepare";
import { parseSpec } from "@/lib/spec";
import { Chart } from "./chart";

const shops = inferDataset(
  parseCsv(`date,shop,scoops,max_temp_c
2025-06-01,Brixton,10,20
2025-06-01,Richmond,12,20
2025-06-02,Brixton,,22
2025-06-02,Richmond,15,22
2025-06-03,Brixton,9,19
`),
);

// Checked by parseSpec, like any spec from the model.
function renderChart(input: object) {
  const result = parseSpec({ version: 1, title: "Scoops", ...input }, shops.summary);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  const data = prepareChartData(shops.rows, shops.summary, result.spec);
  return render(<Chart spec={result.spec} data={data} dataset={datasets.gelato} />);
}

// jsdom lays nothing out: the hover layer sits at the origin, so client
// coordinates are plot coordinates.
function hoverAt(container: HTMLElement, x: number, y: number) {
  const layer = container.querySelector("[data-hover-layer]");
  if (!layer) throw new Error("No hover layer");
  fireEvent.pointerMove(layer, { clientX: x, clientY: y, pointerType: "mouse" });
}

const tooltip = (container: HTMLElement) => container.querySelector("[data-chart-tooltip]");

describe("chart tooltips", () => {
  beforeEach(() => {
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

  it("snaps a line chart to the nearest x and lists every series there", () => {
    const { container } = renderChart({ type: "line", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" }, series: { field: "shop" } });
    hoverAt(container, 5, 100);
    const tip = tooltip(container);
    expect(tip?.getAttribute("aria-hidden")).toBe("true");
    expect(tip?.textContent).toBe("Date: 1 Jun 2025Sum of scoopsBrixton10Richmond12");
  });

  it("says 'no data' for a series with no value at that x", () => {
    const { container } = renderChart({ type: "line", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" }, series: { field: "shop" } });
    hoverAt(container, 10_000, 100);
    expect(tooltip(container)?.textContent).toBe("Date: 3 Jun 2025Sum of scoopsBrixton9Richmondno data");
  });

  it("closes when the pointer leaves, and on Escape", () => {
    const { container } = renderChart({ type: "line", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" } });
    hoverAt(container, 5, 100);
    expect(tooltip(container)).not.toBeNull();
    fireEvent.pointerLeave(container.querySelector("[data-hover-layer]") as Element, { pointerType: "mouse" });
    expect(tooltip(container)).toBeNull();

    hoverAt(container, 5, 100);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(tooltip(container)).toBeNull();
  });

  it("keeps a tapped tooltip until the next tap elsewhere", () => {
    const { container } = renderChart({ type: "line", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" } });
    const layer = container.querySelector("[data-hover-layer]") as Element;
    fireEvent.pointerDown(layer, { clientX: 5, clientY: 100, pointerType: "touch" });
    fireEvent.pointerLeave(layer, { pointerType: "touch" });
    expect(tooltip(container)).not.toBeNull();
    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    expect(tooltip(container)).toBeNull();
  });

  it("describes the bar under the pointer, and nothing between bars", () => {
    const { container } = renderChart({ type: "bar", x: { field: "shop" }, y: { field: "scoops", aggregate: "sum" } });
    const bar = container.querySelector("rect:not([data-hover-layer])") as SVGRectElement;
    const [x, y, w, h] = ["x", "y", "width", "height"].map((a) => Number(bar.getAttribute(a)));
    hoverAt(container, (x ?? 0) + (w ?? 0) / 2, (y ?? 0) + (h ?? 0) / 2);
    expect(tooltip(container)?.textContent).toBe("Shop: BrixtonSum of scoops19");
    hoverAt(container, 1, 1);
    expect(tooltip(container)).toBeNull();
  });
});
