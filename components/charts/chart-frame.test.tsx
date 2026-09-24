// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { scaleBand, scaleLinear } from "d3-scale";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { datasets } from "@/lib/data/datasets";
import { type Axes, ChartFrame, type Inner, type LegendItem } from "./chart-frame";

const axes = (inner: Inner): Axes => ({
  x: { kind: "band", scale: scaleBand().domain(["a", "b"]).range([0, inner.width]), label: "Shop" },
  y: { kind: "linear", scale: scaleLinear().domain([0, 10]).range([inner.height, 0]), label: "Scoops", grid: true },
});

function renderFrame(props: { subtitle?: string; legend?: LegendItem[]; dataset?: keyof typeof datasets }) {
  return render(
    <ChartFrame
      title="Scoops by shop"
      subtitle={props.subtitle}
      legend={props.legend && { title: "flavour", items: props.legend }}
      dataset={datasets[props.dataset ?? "gelato"]}
      description="Bar chart of Scoops by Shop."
      table={<table aria-label="Scoops table" />}
      height={300}
      axes={axes}
    >
      {() => null}
    </ChartFrame>,
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

    fireEvent.click(screen.getByRole("button", { name: "View as chart" }));
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("list", { name: "flavour" })).toBeTruthy();
  });

  it("shows the attribution without a note when the dataset has none", () => {
    const { container } = renderFrame({ dataset: "gelato" });
    expect(screen.getByText(datasets.gelato.attribution)).toBeTruthy();
    expect(container.querySelectorAll("footer p")).toHaveLength(1);
  });
});
