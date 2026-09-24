import { describe, expect, it } from "vitest";
import { type ColumnSummary, type Filter, addBuckets, bucketCount, bucketEnd, bucketStart, requestedRange } from "@/lib/spec";

describe("bucketStart", () => {
  it.each([
    ["2025-06-19", "day", "2025-06-19"],
    ["2025-06-19T23:59", "day", "2025-06-19"],
    ["2025-06-16", "week", "2025-06-16"], // a Monday
    ["2025-06-22", "week", "2025-06-16"], // a Sunday goes back to Monday
    ["2025-01-01", "week", "2024-12-30"], // across a year boundary
    ["2024-03-01", "week", "2024-02-26"], // across a leap day
    ["2025-06-19", "month", "2025-06-01"],
    ["2025-03-31", "quarter", "2025-01-01"],
    ["2025-04-01", "quarter", "2025-04-01"],
    ["2025-12-31", "quarter", "2025-10-01"],
    ["2025-06-19", "year", "2025-01-01"],
  ] as const)("%s by %s is %s", (iso, unit, expected) => {
    expect(bucketStart(iso, unit)).toBe(expected);
  });
});

describe("addBuckets and bucketEnd", () => {
  it("steps whole buckets", () => {
    expect(addBuckets("2024-12-30", "week", 1)).toBe("2025-01-06");
    expect(addBuckets("2025-11-01", "month", 3)).toBe("2026-02-01");
    expect(addBuckets("2025-10-01", "quarter", 1)).toBe("2026-01-01");
  });

  it("gives a bucket's last day", () => {
    expect(bucketEnd("2025-12-29", "week")).toBe("2026-01-04");
    expect(bucketEnd("2024-02-01", "month")).toBe("2024-02-29");
    expect(bucketEnd("2025-01-01", "year")).toBe("2025-12-31");
    expect(bucketEnd("2025-06-19", "day")).toBe("2025-06-19");
  });
});

describe("bucketCount", () => {
  const years = { from: "2024-01-01", to: "2025-12-31" };
  it.each([
    ["day", 731],
    ["week", 105], // w/c 1 Jan 2024 to w/c 29 Dec 2025
    ["month", 24],
    ["quarter", 8],
    ["year", 2],
  ] as const)("counts %s buckets", (unit, expected) => {
    expect(bucketCount(years, unit)).toBe(expected);
  });

  it("counts buckets the range only touches", () => {
    expect(bucketCount({ from: "2025-01-31", to: "2025-02-01" }, "month")).toBe(2);
    expect(bucketCount({ from: "2025-06-19", to: "2025-06-19" }, "week")).toBe(1);
  });
});

describe("requestedRange", () => {
  const date: ColumnSummary = {
    name: "date",
    kind: "date",
    distinct: 731,
    nulls: 0,
    min: "2024-01-01",
    max: "2025-12-31",
    examples: [],
  };
  const range = (...filters: Filter[]) => requestedRange(date, filters);

  it("is the column's span without filters", () => {
    expect(range()).toEqual({ from: "2024-01-01", to: "2025-12-31" });
  });

  it("is narrowed by filters on the column", () => {
    expect(range({ field: "date", op: "gte", value: "2025-01-01" }, { field: "date", op: "lte", value: "2025-03-31" })).toEqual({
      from: "2025-01-01",
      to: "2025-03-31",
    });
    expect(range({ field: "date", op: "gt", value: "2025-01-01" }, { field: "date", op: "lt", value: "2025-02-01" })).toEqual({
      from: "2025-01-02",
      to: "2025-01-31",
    });
    expect(range({ field: "date", op: "eq", value: "2025-06-19" })).toEqual({ from: "2025-06-19", to: "2025-06-19" });
    expect(range({ field: "date", op: "in", values: ["2025-06-19", "2025-02-01"] })).toEqual({ from: "2025-02-01", to: "2025-06-19" });
  });

  it("keeps a date-time bound's own day", () => {
    expect(range({ field: "date", op: "gt", value: "2025-01-01T12:00" })).toEqual({ from: "2025-01-01", to: "2025-12-31" });
  });

  it("never widens the column's span, and ignores other columns and neq", () => {
    expect(
      range(
        { field: "date", op: "gte", value: "2023-01-01" },
        { field: "shop", op: "eq", value: "Brixton" },
        { field: "date", op: "neq", value: "2024-01-01" },
      ),
    ).toEqual({ from: "2024-01-01", to: "2025-12-31" });
  });

  it("is undefined when nothing is left, or the column has no dates", () => {
    expect(range({ field: "date", op: "gt", value: "2025-12-31" })).toBeUndefined();
    expect(requestedRange({ ...date, min: undefined, max: undefined }, [])).toBeUndefined();
  });
});
