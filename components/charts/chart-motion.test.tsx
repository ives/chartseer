// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { datasets } from "@/lib/data/datasets";
import { inferDataset } from "@/lib/data/infer";
import { parseCsv } from "@/lib/data/parse";
import { prepareChartData } from "@/lib/data/prepare";
import { parseSpec } from "@/lib/spec";
import { Chart } from "./chart";

const { summary, rows } = inferDataset(parseCsv("shop,scoops\nBrixton,10\nSoho,40\nBrixton,10\n"));

function chart(spec: object) {
  const result = parseSpec({ version: 1, title: "Scoops", ...spec }, summary);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return <Chart spec={result.spec} data={prepareChartData(rows, summary, result.spec)} dataset={datasets.gelato} />;
}

const sums = chart({ type: "bar", x: { field: "shop" }, y: { field: "scoops", aggregate: "sum" } });
const counts = chart({ type: "bar", x: { field: "shop" }, y: { aggregate: "count" } });
const line = chart({ type: "line", x: { field: "shop" }, y: { aggregate: "count" } });

// The incoming chart's bars, leaving out the hover layer and any chart fading out.
function barHeights(container: HTMLElement): number[] {
  return [...container.querySelectorAll("svg rect:not([data-hover-layer])")]
    .filter((r) => !r.closest("[data-chart-leaving]"))
    .map((r) => Math.round(Number(r.getAttribute("height"))));
}

function prefersReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduce && query.includes("reduce"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("chart motion", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "clearTimeout"] });
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("eases bars to their new heights in under 300 ms", () => {
    prefersReducedMotion(false);
    const { container, rerender } = render(sums);
    const before = barHeights(container);
    rerender(counts);
    // The first frame still shows the old heights.
    expect(barHeights(container)).toEqual(before);
    act(() => {
      vi.advanceTimersByTime(120);
    });
    const halfway = barHeights(container);
    expect(halfway).not.toEqual(before);
    act(() => {
      vi.advanceTimersByTime(180);
    });
    const after = barHeights(container);
    expect(after).not.toEqual(halfway);
    // Settled: another frame changes nothing.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(barHeights(container)).toEqual(after);
  });

  it("moves nothing when the reader prefers reduced motion", () => {
    prefersReducedMotion(true);
    const { container } = render(counts);
    const final = barHeights(container);
    cleanup();
    const second = render(sums);
    second.rerender(counts);
    expect(barHeights(second.container)).toEqual(final);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("crossfades a change of chart type, then removes the old chart", () => {
    prefersReducedMotion(false);
    const { container, rerender } = render(line);
    rerender(sums);
    const leaving = container.querySelector("[data-chart-leaving]");
    expect(leaving?.getAttribute("aria-hidden")).toBe("true");
    expect(leaving?.hasAttribute("inert")).toBe(true);
    expect(leaving?.querySelector("path")).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(container.querySelector("[data-chart-leaving]")).toBeNull();
  });

  it("swaps the chart at once with reduced motion", () => {
    prefersReducedMotion(true);
    const { container, rerender } = render(line);
    rerender(sums);
    expect(container.querySelector("[data-chart-leaving]")).toBeNull();
  });
});
