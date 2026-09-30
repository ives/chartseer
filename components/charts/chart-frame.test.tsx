// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { scaleBand, scaleLinear } from "d3-scale";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { datasets } from "@/lib/data/datasets";
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

  it("swaps the legend and plot for the table, and back", () => {
    renderFrame({
      legend: [
        { label: "Pistachio", color: "var(--chart-1)" },
        { label: "Stracciatella", color: "var(--chart-2)" },
      ],
    });
    const button = screen.getByRole("button", { name: "View as table" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByRole("table")).toBeNull();

    fireEvent.click(button);
    expect(screen.getByRole("table", { name: "Scoops table" })).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
    expect(button.getAttribute("aria-pressed")).toBe("true");
    // The attribution stays with the data, whichever way it is shown.
    expect(screen.getByText(datasets.gelato.attribution)).toBeTruthy();

    fireEvent.click(button);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("list", { name: "flavour" })).toBeTruthy();
  });

  it("swaps the plot for the spec, and from the spec to the table", () => {
    renderFrame({});
    const spec = screen.getByRole("button", { name: "View spec" });
    const table = screen.getByRole("button", { name: "View as table" });
    fireEvent.click(spec);
    expect(screen.getByLabelText("Scoops spec")).toBeTruthy();
    expect(spec.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(datasets.gelato.attribution)).toBeTruthy();

    fireEvent.click(table);
    expect(screen.queryByLabelText("Scoops spec")).toBeNull();
    expect(screen.getByRole("table", { name: "Scoops table" })).toBeTruthy();
    expect(spec.getAttribute("aria-pressed")).toBe("false");
    expect(table.getAttribute("aria-pressed")).toBe("true");
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
