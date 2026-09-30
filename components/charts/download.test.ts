import { describe, expect, it } from "vitest";
import { downloadName, unicodeRanges } from "./download";

describe("downloadName", () => {
  it("slugifies the title", () => {
    expect(downloadName("Monthly revenue by shop, 2024–2025", "png")).toBe("monthly-revenue-by-shop-2024-2025.png");
  });

  it("drops accents and symbols", () => {
    expect(downloadName("Crème brûlée: £ per scoop?", "svg")).toBe("creme-brulee-per-scoop.svg");
  });

  it("falls back to 'chart' when nothing is left", () => {
    expect(downloadName("£ — %", "svg")).toBe("chart.svg");
  });

  it("caps the length without a trailing dash", () => {
    const name = downloadName(`${"word ".repeat(40)}`, "png");
    expect(name.length).toBeLessThanOrEqual(84);
    expect(name).toMatch(/[a-z]\.png$/);
  });
});

describe("unicodeRanges", () => {
  it("reads single code points, spans and wildcards", () => {
    expect(unicodeRanges("U+0-FF, U+131, U+4??")).toEqual([
      [0, 255],
      [0x131, 0x131],
      [0x400, 0x4ff],
    ]);
  });

  it("is null when there is no range, meaning every character", () => {
    expect(unicodeRanges("")).toBeNull();
  });
});
