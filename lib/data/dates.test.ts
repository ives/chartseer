import { describe, expect, it } from "vitest";
import { isoToUtcDate } from "./dates";

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
