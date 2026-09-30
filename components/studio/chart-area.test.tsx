// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
const steps = { canUndo: false, canRedo: false, announcement: "", onUndo: () => {}, onRedo: () => {} };

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
    render(<ChartArea pending chart={chart} dataset={datasets.gelato} examples={examples} steps={steps} />);
    expect(screen.getByLabelText("Drawing the chart").getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("draws the current chart", () => {
    render(<ChartArea pending={false} chart={chart} dataset={datasets.gelato} examples={examples} steps={steps} />);
    expect(screen.getByRole("img", { name: "Scoops by day" })).toBeTruthy();
  });

  it("shows suggestions and the attribution before any chart", () => {
    render(<ChartArea pending={false} chart={null} dataset={datasets.gelato} examples={examples} steps={steps} />);
    expect(screen.getByText("No chart yet.")).toBeTruthy();
    expect(screen.getByText("“Daily revenue by shop in 2025”")).toBeTruthy();
    expect(screen.getByText(datasets.gelato.attribution)).toBeTruthy();
  });

  it("offers undo and redo beside a chart, disabled at the ends", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(
      <ChartArea
        pending={false}
        chart={chart}
        dataset={datasets.gelato}
        examples={examples}
        steps={{ ...steps, canUndo: true, onUndo, onRedo }}
      />,
    );
    const undo = screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement;
    const redo = screen.getByRole("button", { name: "Redo" }) as HTMLButtonElement;
    expect([undo.disabled, redo.disabled]).toEqual([false, true]);
    fireEvent.click(undo);
    fireEvent.click(redo);
    expect(onUndo).toHaveBeenCalledOnce();
    expect(onRedo).not.toHaveBeenCalled();
  });

  it("has no undo or redo before the first chart", () => {
    render(<ChartArea pending={false} chart={null} dataset={datasets.gelato} examples={examples} steps={steps} />);
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("announces the step, even while drawing", () => {
    const announced = { ...steps, announcement: "Showing chart 1 of 2: Scoops by day" };
    const { rerender } = render(
      <ChartArea pending={false} chart={chart} dataset={datasets.gelato} examples={examples} steps={announced} />,
    );
    expect(screen.getByRole("status").textContent).toBe("Showing chart 1 of 2: Scoops by day");
    rerender(<ChartArea pending chart={chart} dataset={datasets.gelato} examples={examples} steps={announced} />);
    expect(screen.getByRole("status").textContent).toBe("Showing chart 1 of 2: Scoops by day");
  });
});
