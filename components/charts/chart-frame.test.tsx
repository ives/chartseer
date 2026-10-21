// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { scaleBand, scaleLinear } from "d3-scale";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { datasets } from "@/lib/data/datasets";
import { ChartChromeContext, type ChartViewMode } from "./chart-chrome";
import { ChartExportContext, EXPORT_SIZE } from "./chart-export";
import { type Axes, ChartFrame, type Inner, type LegendItem } from "./chart-frame";

const axes = (inner: Inner): Axes => ({
  x: { kind: "band", scale: scaleBand().domain(["a", "b"]).range([0, inner.width]), label: "Shop" },
  y: { kind: "linear", scale: scaleLinear().domain([0, 10]).range([inner.height, 0]), label: "Scoops", grid: true },
});

function renderFrame(props: { subtitle?: string; legend?: LegendItem[]; dataset?: keyof typeof datasets }) {
  return render(frame(props));
}

function frame(props: { subtitle?: string; legend?: LegendItem[]; dataset?: keyof typeof datasets }) {
  return (
    <ChartFrame
      title="Scoops by shop"
      subtitle={props.subtitle}
      legend={props.legend && { title: "flavour", items: props.legend }}
      dataset={datasets[props.dataset ?? "gelato"]}
      description="Bar chart of Scoops by Shop."
      table={<table aria-label="Scoops table" />}
      specView={<pre aria-label="Scoops spec">{"{}"}</pre>}
      height={300}
      axes={axes}
    >
      {() => null}
    </ChartFrame>
  );
}

describe("ChartFrame", () => {
  beforeEach(() => {
    // jsdom has no ResizeObserver; the plot stays unmeasured, which these tests don't need.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the title and subtitle", () => {
    renderFrame({ subtitle: "All shops, 2024–2025" });
    expect(screen.getByRole("heading", { name: "Scoops by shop" })).toBeTruthy();
    expect(screen.getByText("All shops, 2024–2025")).toBeTruthy();
  });

  it("lists every series in the legend", () => {
    renderFrame({
      legend: [
        { label: "Pistachio", color: "var(--chart-1)" },
        { label: "Stracciatella", color: "var(--chart-2)" },
      ],
    });
    const legend = screen.getByRole("list", { name: "flavour" });
    expect(legend.textContent).toContain("Pistachio");
    expect(legend.textContent).toContain("Stracciatella");
  });

  it("has no legend for a single series", () => {
    renderFrame({ legend: [{ label: "Pistachio", color: "var(--chart-1)" }] });
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows the dataset's attribution and note", () => {
    renderFrame({ dataset: "bikes" });
    expect(screen.getByText(datasets.bikes.attribution)).toBeTruthy();
    expect(screen.getByText(/1 in 30\.8 hires/)).toBeTruthy();
  });

  it("shows the view the page chose, keeping the attribution", () => {
    const legend = [
      { label: "Pistachio", color: "var(--chart-1)" },
      { label: "Stracciatella", color: "var(--chart-2)" },
    ];
    const at = (view: ChartViewMode) => <ChartChromeContext value={{ view }}>{frame({ legend })}</ChartChromeContext>;
    const { rerender } = render(at("chart"));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("list", { name: "flavour" })).toBeTruthy();

    rerender(at("table"));
    expect(screen.getByRole("table", { name: "Scoops table" })).toBeTruthy();
    // The table's headers name the series, so the legend goes.
    expect(screen.queryByRole("list")).toBeNull();
    // The attribution stays with the data, whichever way it is shown.
    expect(screen.getByText(datasets.gelato.attribution)).toBeTruthy();

    rerender(at("spec"));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByLabelText("Scoops spec")).toBeTruthy();
    expect(screen.getByText(datasets.gelato.attribution)).toBeTruthy();
  });

  it("shows the plot, with no view controls of its own, when the page sets none", () => {
    renderFrame({});
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByLabelText("Scoops spec")).toBeNull();
    expect(screen.queryAllByRole("button")).toEqual([]);
  });

  it("puts the page's actions above the attribution", () => {
    render(<ChartChromeContext value={{ view: "chart", actions: <button type="button">Extra</button> }}>{frame({})}</ChartChromeContext>);
    const extra = screen.getByRole("button", { name: "Extra" });
    const attribution = screen.getByText(datasets.gelato.attribution);
    expect(extra.compareDocumentPosition(attribution) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws one self-contained SVG of the export size when exporting", () => {
    // jsdom has no canvas; text is then measured by an estimate.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(
      <ChartExportContext value={EXPORT_SIZE}>
        {frame({
          subtitle: "2025",
          dataset: "bikes",
          legend: [
            { label: "Pistachio", color: "var(--chart-1)" },
            { label: "Stracciatella", color: "var(--chart-2)" },
          ],
        })}
      </ChartExportContext>,
    );
    const svg = container.firstElementChild;
    expect(svg?.tagName).toBe("svg");
    expect(svg?.getAttribute("width")).toBe("1200");
    expect(svg?.getAttribute("height")).toBe("675");
    const text = svg?.textContent ?? "";
    for (const expected of ["Scoops by shop", "2025", "flavour", "Pistachio", "Stracciatella", "Powered by TfL Open Data", "1 in 30.8"]) {
      expect(text).toContain(expected);
    }
    expect(screen.queryAllByRole("button")).toEqual([]);
    // The plot is drawn inside, below the text.
    expect(svg?.querySelectorAll("svg").length).toBe(1);
  });

  it("shows the attribution without a note when the dataset has none", () => {
    const { container } = renderFrame({ dataset: "gelato" });
    expect(screen.getByText(datasets.gelato.attribution)).toBeTruthy();
    expect(container.querySelectorAll("footer p")).toHaveLength(1);
  });
});
