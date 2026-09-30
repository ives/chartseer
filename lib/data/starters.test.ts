import { describe, expect, it } from "vitest";
import { gelatoSummary } from "@/lib/spec";
import { inferDataset } from "./infer";
import { parseCsv } from "./parse";
import { starterPrompts } from "./starters";

const summaryOf = (csv: string) => inferDataset(parseCsv(csv)).summary;

describe("starterPrompts", () => {
  it("builds prompts from an upload with UK dates and £ amounts", () => {
    const summary = summaryOf(
      'date,stall,takings,nobbles_sold\n13/03/2025,Cheese,"£1,234.50",4\n14/03/2025,Flowers,£980,7\n15/03/2025,Bakery,£1010,2\n',
    );
    expect(starterPrompts(summary)).toEqual([
      "Total takings by month",
      "Takings over time, one line per stall",
      "Total takings by stall",
      "Nobbles sold against takings",
    ]);
  });

  it("keeps capitals that start a label, such as an acronym", () => {
    const summary = summaryOf("country,GDP_per_capita,population\nUK,1,2\nFrance,3,4\n");
    expect(starterPrompts(summary)).toEqual([
      "Total GDP per capita by country",
      "Population against GDP per capita",
    ]);
  });

  it("counts rows when there is no number column", () => {
    expect(starterPrompts(summaryOf("day,team\n2025-01-01,Red\n2025-01-02,Blue\n"))).toEqual([
      "Number of rows by month",
      "Number of rows by team",
    ]);
  });

  it("offers nothing for a file of free text", () => {
    const notes = Array.from({ length: 60 }, (_, i) => `note ${i},comment ${i}`).join("\n");
    expect(starterPrompts(summaryOf(`a,b\n${notes}\n`))).toEqual([]);
  });

  it("takes the first date, number and small category columns", () => {
    expect(starterPrompts(gelatoSummary)).toEqual([
      "Total scoops by month",
      "Scoops over time, one line per day of the week",
      "Total scoops by day of the week",
      "Revenue against scoops",
    ]);
  });

  it("skips categories with too many values for bars", () => {
    const areas = Array.from({ length: 51 }, (_, i) => `area ${i}`);
    const csv = "area,n\n" + [...areas, ...areas].map((a, i) => `${a},${i}`).join("\n");
    expect(starterPrompts(summaryOf(csv))).toEqual([]);
  });
});
