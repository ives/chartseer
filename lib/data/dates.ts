import { type DayRange, type TimeUnit, addBuckets, bucketCount, bucketStart } from "@/lib/spec";

// ISO 8601 strings as Dates on one UTC timeline. JavaScript reads a date-only
// string as UTC but a zone-less date-time as local time; appending "Z" to the
// latter puts "2026-01-16" and "2026-01-16T00:07" seven minutes apart everywhere.
export function isoToUtcDate(value: string): Date {
  const zoneless = value.includes("T") && !/(Z|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(zoneless ? `${value}Z` : value);
}

// Fixed English month names rather than Intl, whose en-GB September varies
// between "Sep" and "Sept" across runtimes.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Labels for a run of bucket starts, as shown on an axis. The year appears on
// the first label and wherever it changes: "30 Dec 2024", "6 Jan", …;
// "Jan 2025", "Feb", …; "Q1 2025", "Q2", … (D-026).
export function formatBuckets(starts: string[], unit: TimeUnit): string[] {
  let previousYear: number | undefined;
  return starts.map((start) => {
    const { year, month, day } = dayParts(start);
    const text = periodText(unit, month, day);
    const label = unit === "year" ? String(year) : year === previousYear ? text : `${text} ${year}`;
    previousYear = year;
    return label;
  });
}

// The label for a period without its year; empty for a year.
function periodText(unit: TimeUnit, month: number, day: number): string {
  switch (unit) {
    case "day":
    case "week":
      return `${day} ${MONTHS[month - 1]}`;
    case "month":
      return MONTHS[month - 1] ?? "";
    case "quarter":
      return `Q${Math.floor((month - 1) / 3) + 1}`;
    case "year":
      return "";
    default: {
      const unreachable: never = unit;
      throw new Error(`Unknown time unit: ${JSON.stringify(unreachable)}`);
    }
  }
}

function dayParts(iso: string): { year: number; month: number; day: number } {
  const [year = 0, month = 1, day = 1] = iso.slice(0, 10).split("-").map(Number);
  return { year, month, day };
}

// Multiples of a unit that make tidy tick steps.
const TICK_STEPS: Record<TimeUnit, number[]> = {
  day: [1, 2, 7, 14],
  week: [1, 2, 4, 13, 26],
  month: [1, 2, 3, 6, 12],
  quarter: [1, 2, 4],
  year: [1, 2, 5, 10, 20, 50, 100],
};

// At most `max` bucket starts from `from` to `to`, never finer than the unit.
// Months, quarters and years fall on calendar multiples of the step (every
// third month is Jan, Apr, Jul, Oct); days and weeks count from the first.
export function bucketTicks(range: DayRange, unit: TimeUnit, max: number): string[] {
  const count = bucketCount(range, unit);
  if (count === 0) return [];
  const steps = TICK_STEPS[unit];
  const step = steps.find((s) => Math.ceil(count / s) <= max) ?? Math.ceil(count / Math.max(1, max));
  const first = bucketStart(range.from, unit);
  const ticks: string[] = [];
  for (let i = 0; i < count; i++) {
    const start = addBuckets(first, unit, i);
    if (calendarIndex(start, unit, i) % step === 0) ticks.push(start);
  }
  return ticks;
}

function calendarIndex(start: string, unit: TimeUnit, i: number): number {
  const { year, month } = dayParts(start);
  switch (unit) {
    case "day":
    case "week":
      return i;
    case "month":
      return year * 12 + month - 1;
    case "quarter":
      return year * 4 + Math.floor((month - 1) / 3);
    case "year":
      return year;
    default: {
      const unreachable: never = unit;
      throw new Error(`Unknown time unit: ${JSON.stringify(unreachable)}`);
    }
  }
}
