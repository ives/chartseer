import { describe, expect, it } from "vitest";
import { parseCsv, readCsv } from "./parse";

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

describe("delimiters and byte-order marks", () => {
  it.each([
    ["semicolons", "shop;scoops\nBrixton;10\n"],
    ["tabs", "shop\tscoops\nBrixton\t10\n"],
    ["a byte-order mark", "﻿shop,scoops\nBrixton,10\n"],
    ["a byte-order mark and semicolons", "﻿shop;scoops\r\nBrixton;10\r\n"],
  ])("reads %s", (_name, text) => {
    expect(parseCsv(text)).toEqual({ columns: ["shop", "scoops"], rows: [{ shop: "Brixton", scoops: "10" }] });
  });

  it("keeps decimal commas in a semicolon file as text", () => {
    expect(parseCsv("shop;price\nBrixton;3,50\n").rows).toEqual([{ shop: "Brixton", price: "3,50" }]);
  });

  it("counts only separators outside quotes on the header line", () => {
    expect(parseCsv('"a;b",c\n1,2\n').columns).toEqual(["a;b", "c"]);
  });

  it("decides from the header line, not the data", () => {
    expect(parseCsv("a;b\n1,5;2,5\n").rows).toEqual([{ a: "1,5", b: "2,5" }]);
  });
});

describe("readCsv", () => {
  function error(text: string) {
    const result = readCsv(text);
    return result.ok ? undefined : result.message;
  }

  it("accepts a well-formed file", () => {
    expect(readCsv("shop,scoops\nBrixton,10\n")).toEqual({
      ok: true,
      csv: { columns: ["shop", "scoops"], rows: [{ shop: "Brixton", scoops: "10" }] },
    });
  });

  it("skips blank lines and trims column names", () => {
    const result = readCsv("\n shop , scoops\n\nBrixton,10\n\n");
    expect(result.ok && result.csv).toEqual({ columns: ["shop", "scoops"], rows: [{ shop: "Brixton", scoops: "10" }] });
  });

  it("rejects binary content", () => {
    expect(error("PK\u0003\u0004\u0000\u0000")).toMatch(/^This doesn’t look like a CSV file/);
  });

  it.each(["", "\n\n", "﻿"])("rejects an empty file (%j)", (text) => {
    expect(error(text)).toBe("The file is empty.");
  });

  it.each([
    ["numbers", "1,2,3\n4,5,6\n"],
    ["dates and numbers", "24/09/2026,£5\n25/09/2026,£6\n"],
  ])("rejects a first row of %s as no header", (_name, text) => {
    expect(error(text)).toMatch(/^The first row should name the columns/);
  });

  it("allows some numeric column names", () => {
    expect(readCsv("country,2024,2025\nUK,1,2\n").ok).toBe(true);
  });

  it("rejects an unnamed column", () => {
    expect(error("a,,c\n1,2,3\n")).toBe("Column 2 has no name in the header row.");
  });

  it("rejects duplicate column names", () => {
    expect(error("price,shop,price\n1,a,2\n")).toBe("Two columns are called “price”. Rename one and upload again.");
  });

  it("rejects a single column", () => {
    expect(error("shop\nBrixton\n")).toBe(
      "Only one column found. Chartseer reads columns separated by commas, semicolons or tabs.",
    );
  });

  it("rejects a header with no data rows", () => {
    expect(error("shop,scoops\n\n")).toBe("The file has a header row but no data.");
  });

  it("names the first row with too few or too many values, counting as a spreadsheet does", () => {
    expect(error("a,b,c\n1,2,3\n\n4,5\n6,7,8,9\n")).toBe(
      "Row 4 has 2 values, but the header has 3. Check for a missing or extra separator.",
    );
    expect(error("a,b\n1,2\n3,4,5\n")).toBe("Row 3 has 3 values, but the header has 2. Check for a missing or extra separator.");
  });

  it("counts a quoted line break as part of one row", () => {
    expect(error('a,b\n"x\ny",1\n2\n')).toMatch(/^Row 3 has 1 value, /);
  });
});
