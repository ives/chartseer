import { describe, expect, it } from "vitest";
import { parseCsv } from "./parse";

describe("parseCsv", () => {
  it("keeps quoted commas inside a cell", () => {
    const { rows } = parseCsv('station,area\n"Soho Square, Soho",Soho\n');
    expect(rows).toEqual([{ station: "Soho Square, Soho", area: "Soho" }]);
  });

  it("turns empty cells into null", () => {
    const { rows } = parseCsv("a,b,c\n1,,3\n");
    expect(rows).toEqual([{ a: "1", b: null, c: "3" }]);
  });

  it("keeps the columns of a header-only file", () => {
    expect(parseCsv("a,b\n")).toEqual({ columns: ["a", "b"], rows: [] });
  });
});
