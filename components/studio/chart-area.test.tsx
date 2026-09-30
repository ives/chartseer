// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
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
const chart = { spec: parsed.spec, data: prepareChartData(rows, summary, parsed.spec), dataset: datasets.gelato, empty: null };
const ask = { starters: ["Daily revenue by shop in 2025"], canAsk: true, onAsk: () => {} };
const steps = { canUndo: false, canRedo: false, announcement: "", onUndo: () => {}, onRedo: () => {} };

// axe's rule ids that fail in this subtree. jsdom lays nothing out, so colour
// contrast is checked in the browser instead (D-057); a lone component has no
// landmark around it.
async function axeViolations(container: Element): Promise<string[]> {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(", ")}`);
}

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
    render(<ChartArea pending chart={chart} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(screen.getByLabelText("Drawing the chart").getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("draws the current chart", () => {
    render(<ChartArea pending={false} chart={chart} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(screen.getByRole("img", { name: "Scoops by day" })).toBeTruthy();
  });

  it("shows suggestions and the attribution before any chart", () => {
    render(<ChartArea pending={false} chart={null} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(screen.getByText("No chart yet.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Daily revenue by shop in 2025" })).toBeTruthy();
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
        {...ask}
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

  it("shows the bikes attribution and sample ratio before any chart", () => {
    render(<ChartArea pending={false} chart={null} dataset={datasets.bikes} {...ask} steps={steps} />);
    expect(screen.getByText(datasets.bikes.attribution)).toBeTruthy();
    expect(screen.getByText(/1 in 30\.8 hires/)).toBeTruthy();
  });

  it("offers starter prompts as chips that send", () => {
    const onAsk = vi.fn();
    render(<ChartArea pending={false} chart={null} dataset={datasets.gelato} {...ask} onAsk={onAsk} steps={steps} />);
    fireEvent.click(screen.getByRole("button", { name: "Daily revenue by shop in 2025" }));
    expect(onAsk).toHaveBeenCalledWith("Daily revenue by shop in 2025");
  });

  it("disables the chips while a request is in flight", () => {
    render(<ChartArea pending={false} chart={null} dataset={datasets.gelato} {...ask} canAsk={false} steps={steps} />);
    expect((screen.getByRole("button", { name: "Daily revenue by shop in 2025" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("invites a request when there are no starters", () => {
    render(<ChartArea pending={false} chart={null} dataset={datasets.gelato} {...ask} starters={[]} steps={steps} />);
    expect(screen.getByText("Ask for a chart of your data.")).toBeTruthy();
  });

  it("explains a filter that matched nothing, and asks the model to fix it", () => {
    const onAsk = vi.fn();
    const empty = { kind: "filter", message: "No rows where shop is 'Brixtn'.", request: "No rows where shop is 'Brixtn'. Please fix the filter." } as const;
    render(<ChartArea pending={false} chart={{ ...chart, empty }} dataset={datasets.gelato} {...ask} onAsk={onAsk} steps={steps} />);
    expect(screen.getByText("No rows where shop is 'Brixtn'.")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ask Chartseer to fix it" }));
    expect(onAsk).toHaveBeenCalledWith("No rows where shop is 'Brixtn'. Please fix the filter.");
  });

  it("says plainly when there are no values, with no button", () => {
    const empty = { kind: "no-values", message: "Nothing to plot: scoops is empty in all 2 matching rows." } as const;
    render(<ChartArea pending={false} chart={{ ...chart, empty }} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(screen.getByText("Nothing to plot: scoops is empty in all 2 matching rows.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ask Chartseer to fix it" })).toBeNull();
  });

  it("has no undo or redo before the first chart", () => {
    render(<ChartArea pending={false} chart={null} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("offers downloads for a drawn chart only", () => {
    const { rerender } = render(<ChartArea pending={false} chart={null} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(screen.queryByRole("button", { name: /^Download/ })).toBeNull();

    rerender(<ChartArea pending={false} chart={chart} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeTruthy();

    // Nothing to download when the chart has nothing to draw.
    const empty = { kind: "no-values", message: "Nothing to plot." } as const;
    rerender(<ChartArea pending={false} chart={{ ...chart, empty }} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(screen.queryByRole("button", { name: /^Download/ })).toBeNull();
  });

  it("announces the step, even while drawing", () => {
    const announced = { ...steps, announcement: "Showing chart 1 of 2: Scoops by day" };
    const { rerender } = render(
      <ChartArea pending={false} chart={chart} dataset={datasets.gelato} {...ask} steps={announced} />,
    );
    expect(screen.getByRole("status").textContent).toBe("Showing chart 1 of 2: Scoops by day");
    rerender(<ChartArea pending chart={chart} dataset={datasets.gelato} {...ask} steps={announced} />);
    expect(screen.getByRole("status").textContent).toBe("Showing chart 1 of 2: Scoops by day");
  });

  it("passes axe before any chart, with a chart, as a table and when empty", async () => {
    const before = render(<ChartArea pending={false} chart={null} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(await axeViolations(before.container)).toEqual([]);
    cleanup();

    const drawn = render(<ChartArea pending={false} chart={chart} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(await axeViolations(drawn.container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "View as table" }));
    expect(await axeViolations(drawn.container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "View spec" }));
    expect(await axeViolations(drawn.container)).toEqual([]);
    cleanup();

    const empty = { kind: "filter", message: "No rows where shop is 'Brixtn'.", request: "Fix the filter." } as const;
    const nothing = render(<ChartArea pending={false} chart={{ ...chart, empty }} dataset={datasets.gelato} {...ask} steps={steps} />);
    expect(await axeViolations(nothing.container)).toEqual([]);
  });
});
