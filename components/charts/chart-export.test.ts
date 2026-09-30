import { describe, expect, it } from "vitest";
import { wrapLines } from "./chart-export";

// One pixel per character keeps the arithmetic obvious.
const measure = (text: string) => text.length;

describe("wrapLines", () => {
  it("keeps a short line whole", () => {
    expect(wrapLines("Invented data", 20, measure)).toEqual(["Invented data"]);
  });

  it("breaks between words", () => {
    expect(wrapLines("Powered by TfL Open Data", 12, measure)).toEqual(["Powered by", "TfL Open", "Data"]);
  });

  it("gives a word longer than the line a line of its own", () => {
    expect(wrapLines("a supercalifragilistic b", 8, measure)).toEqual(["a", "supercalifragilistic", "b"]);
  });

  it("collapses whitespace and returns nothing for an empty string", () => {
    expect(wrapLines("  one   two ", 20, measure)).toEqual(["one two"]);
    expect(wrapLines("", 20, measure)).toEqual([]);
  });
});
