// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChartSpec } from "@/lib/spec";
import { ChartSpecView } from "./chart-spec-view";

const spec: ChartSpec = {
  version: 1,
  type: "bar",
  title: "Scoops by shop",
  x: { field: "shop" },
  y: { field: "scoops", aggregate: "sum" },
};

function stubClipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
}

describe("ChartSpecView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the spec as formatted JSON in a scrollable, labelled region", () => {
    render(<ChartSpecView spec={spec} />);
    const region = screen.getByRole("region", { name: "Chart spec (JSON)" });
    expect(region.textContent).toBe(JSON.stringify(spec, null, 2));
    expect(region.tabIndex).toBe(0);
  });

  it("copies the JSON and says so", async () => {
    const writeText = vi.fn(async () => {});
    stubClipboard(writeText);
    render(<ChartSpecView spec={spec} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(await screen.findByText("Copied")).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(spec, null, 2));
  });

  it("suggests selecting the text when the clipboard is refused", async () => {
    stubClipboard(async () => {
      throw new Error("Denied");
    });
    render(<ChartSpecView spec={spec} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect((await screen.findByRole("status")).textContent).toBe("Couldn’t copy. Select the text instead.");
  });
});
