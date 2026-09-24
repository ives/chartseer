import { describe, expect, it } from "vitest";
import { bucketTicks, formatBuckets, isoToUtcDate } from "./dates";

describe("isoToUtcDate", () => {
  it("reads a date as UTC midnight", () => {
    expect(isoToUtcDate("2026-01-16").toISOString()).toBe("2026-01-16T00:00:00.000Z");
  });

  it("reads a zone-less date-time as UTC", () => {
    expect(isoToUtcDate("2026-01-16T00:07").toISOString()).toBe("2026-01-16T00:07:00.000Z");
  });

  it("keeps an explicit offset", () => {
    expect(isoToUtcDate("2026-01-16T01:07+01:00").toISOString()).toBe("2026-01-16T00:07:00.000Z");
    expect(isoToUtcDate("2026-01-16T00:07:30Z").toISOString()).toBe("2026-01-16T00:07:30.000Z");
  });
});

describe("formatBuckets", () => {
  it("shows the year on the first label and where it changes", () => {
    expect(formatBuckets(["2024-12-30", "2025-01-06", "2025-01-13"], "week")).toEqual(["30 Dec 2024", "6 Jan 2025", "13 Jan"]);
    expect(formatBuckets(["2025-11-01", "2025-12-01", "2026-01-01", "2026-02-01"], "month")).toEqual([
      "Nov 2025",
      "Dec",
      "Jan 2026",
      "Feb",
    ]);
    expect(formatBuckets(["2025-01-01", "2025-04-01"], "quarter")).toEqual(["Q1 2025", "Q2"]);
  });

  it("labels days like weeks, and years by the year alone", () => {
    expect(formatBuckets(["2025-06-19", "2025-06-20"], "day")).toEqual(["19 Jun 2025", "20 Jun"]);
    expect(formatBuckets(["2024-01-01", "2025-01-01"], "year")).toEqual(["2024", "2025"]);
  });

  it("uses Sep, not Sept", () => {
    expect(formatBuckets(["2025-09-01"], "month")).toEqual(["Sep 2025"]);
  });
});

describe("bucketTicks", () => {
  const twoYears = { from: "2024-01-01", to: "2025-12-01" };

  it("uses every bucket when they fit", () => {
    expect(bucketTicks({ from: "2025-01-01", to: "2025-04-01" }, "month", 10)).toEqual([
      "2025-01-01",
      "2025-02-01",
      "2025-03-01",
      "2025-04-01",
    ]);
  });

  it("steps months on calendar multiples", () => {
    expect(bucketTicks(twoYears, "month", 8)).toEqual([
      "2024-01-01",
      "2024-04-01",
      "2024-07-01",
      "2024-10-01",
      "2025-01-01",
      "2025-04-01",
      "2025-07-01",
      "2025-10-01",
    ]);
    expect(bucketTicks({ from: "2024-02-01", to: "2025-12-01" }, "month", 4)).toEqual(["2024-07-01", "2025-01-01", "2025-07-01"]);
  });

  it("steps weeks from the first bucket, never finer than a week", () => {
    const ticks = bucketTicks({ from: "2024-12-30", to: "2025-12-29" }, "week", 6);
    expect(ticks[0]).toBe("2024-12-30");
    expect(ticks[1]).toBe("2025-03-31"); // 13 weeks on
    expect(ticks.length).toBeLessThanOrEqual(6);
  });

  it("is empty for an empty range", () => {
    expect(bucketTicks({ from: "2025-02-01", to: "2025-01-01" }, "day", 5)).toEqual([]);
  });
});
