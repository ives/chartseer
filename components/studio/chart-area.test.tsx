// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { datasets } from "@/lib/data/datasets";
import { inferDataset } from "@/lib/data/infer";
import { parseCsv } from "@/lib/data/parse";
import { prepareChartData } from "@/lib/data/prepare";
import { parseSpec } from "@/lib/spec";
import { ChartArea } from "./chart-area";

const { summary, rows } = inferDataset(parseCsv("date,shop,scoops\n2025-06-01,Brixton,10\n2025-06-02,Brixton,12\n"));
const parsed = parseSpec(
  { version: 1, type: "line", title: "Scoops by day", x: { field: "date" }, y: { field: "scoops", aggregate: "sum" } },
  summary,
);
if (!parsed.ok) throw new Error(parsed.errors.join("\n"));
const chart = { spec: parsed.spec, data: prepareChartData(rows, summary, parsed.spec), dataset: datasets.gelato };
const examples = ["Daily revenue by shop in 2025"];

describe("ChartArea", () => {
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

  it("shows a skeleton, not the previous chart, while drawing", () => {
    render(<ChartArea pending chart={chart} dataset={datasets.gelato} examples={examples} />);
    expect(screen.getByLabelText("Drawing the chart").getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("draws the current chart", () => {
    render(<ChartArea pending={false} chart={chart} dataset={datasets.gelato} examples={examples} />);
    expect(screen.getByRole("img", { name: "Scoops by day" })).toBeTruthy();
  });

  it("shows suggestions and the attribution before any chart", () => {
    render(<ChartArea pending={false} chart={null} dataset={datasets.gelato} examples={examples} />);
    expect(screen.getByText("No chart yet.")).toBeTruthy();
    expect(screen.getByText("“Daily revenue by shop in 2025”")).toBeTruthy();
    expect(screen.getByText(datasets.gelato.attribution)).toBeTruthy();
  });
});
