import { describe, expect, it } from "vitest";
import { columnLabel, deriveLabel } from "./labels";

describe("deriveLabel", () => {
  it("turns underscores into spaces and capitalises the first letter", () => {
    expect(deriveLabel("start_area")).toBe("Start area");
    expect(deriveLabel("max_temp_c")).toBe("Max temp c");
  });

  it("keeps acronyms", () => {
    expect(deriveLabel("GDP_per_capita")).toBe("GDP per capita");
  });

  it("collapses repeated and edge underscores", () => {
    expect(deriveLabel("_total__sales_")).toBe("Total sales");
  });

  it("falls back to the name when nothing is left", () => {
    expect(deriveLabel("__")).toBe("__");
  });
});

describe("columnLabel", () => {
  it("prefers the dataset's label", () => {
    expect(columnLabel("revenue_gbp", { columnLabels: { revenue_gbp: "Revenue (£)" } })).toBe("Revenue (£)");
  });

  it("derives a label for a column without one", () => {
    expect(columnLabel("rain_mm", { columnLabels: {} })).toBe("Rain mm");
  });
});
