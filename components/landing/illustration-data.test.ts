import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/data/parse";
import { journeysByHour, weeklyScoops } from "./illustration-data";

function rows(id: string) {
  return parseCsv(readFileSync(`public/data/${id}.csv`, "utf8")).rows;
}

function mondayOf(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

describe("illustration data", () => {
  it("counts bike journeys by hour and day type", () => {
    const counts = { weekday: Array<number>(24).fill(0), weekend: Array<number>(24).fill(0) };
    for (const row of rows("bikes")) {
      const series = row.day_type === "Weekend" ? counts.weekend : counts.weekday;
      const hour = Number(row.hour);
      series[hour] = (series[hour] ?? 0) + 1;
    }
    expect(journeysByHour).toEqual(counts);
  });

  it("sums gelato scoops by shop and full week", () => {
    const sums = new Map<string, Map<string, number>>();
    for (const row of rows("gelato")) {
      const shop = row.shop ?? "";
      const week = mondayOf(row.date ?? "");
      const weeks = sums.get(shop) ?? new Map<string, number>();
      weeks.set(week, (weeks.get(week) ?? 0) + Number(row.scoops));
      sums.set(shop, weeks);
    }
    // A week with no sales at a shop (it closed for a while) counts as zero. The
    // data ends on Wednesday 31 December 2025, so that last week is partial and left out.
    const allWeeks = [...new Set(rows("gelato").map((row) => mondayOf(row.date ?? "")))].sort().slice(0, -1);
    const expected = Object.fromEntries([...sums].map(([shop, weeks]) => [shop, allWeeks.map((w) => weeks.get(w) ?? 0)]));
    expect(weeklyScoops).toEqual(expected);
  });
});
