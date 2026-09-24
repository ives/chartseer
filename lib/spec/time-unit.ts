import type { ColumnSummary } from "./columns";
import type { Filter, TimeUnit } from "./schema";

// Calendar buckets for dates on the x axis (D-026). A bucket is named by its
// first day as "YYYY-MM-DD", in UTC; weeks start on Monday. A date-time is
// cut to the day it names, so its time and any zone offset are ignored.
// These live in lib/spec because the validator counts buckets too.

export type DayRange = { from: string; to: string };

export function bucketStart(iso: string, unit: TimeUnit): string {
  const d = parseDay(iso);
  const [year, month, day] = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
  switch (unit) {
    case "day":
      return formatDay(d);
    case "week":
      return formatDay(utc(year, month, day - ((d.getUTCDay() + 6) % 7)));
    case "month":
      return formatDay(utc(year, month, 1));
    case "quarter":
      return formatDay(utc(year, month - (month % 3), 1));
    case "year":
      return formatDay(utc(year, 0, 1));
    default: {
      const unreachable: never = unit;
      throw new Error(`Unknown time unit: ${JSON.stringify(unreachable)}`);
    }
  }
}

// The start of the bucket `steps` after the one starting at `start`.
export function addBuckets(start: string, unit: TimeUnit, steps: number): string {
  const d = parseDay(start);
  const [year, month, day] = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
  switch (unit) {
    case "day":
      return formatDay(utc(year, month, day + steps));
    case "week":
      return formatDay(utc(year, month, day + 7 * steps));
    case "month":
      return formatDay(utc(year, month + steps, day));
    case "quarter":
      return formatDay(utc(year, month + 3 * steps, day));
    case "year":
      return formatDay(utc(year + steps, month, day));
    default: {
      const unreachable: never = unit;
      throw new Error(`Unknown time unit: ${JSON.stringify(unreachable)}`);
    }
  }
}

// The last day of the bucket starting at `start`.
export function bucketEnd(start: string, unit: TimeUnit): string {
  return addDays(addBuckets(start, unit, 1), -1);
}

// How many buckets the days from `from` to `to` touch, both inclusive.
export function bucketCount({ from, to }: DayRange, unit: TimeUnit): number {
  const [a, b] = [parseDay(bucketStart(from, unit)), parseDay(bucketStart(to, unit))];
  if (b < a) return 0;
  const months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
  switch (unit) {
    case "day":
      return Math.round((b.getTime() - a.getTime()) / DAY_MS) + 1;
    case "week":
      return Math.round((b.getTime() - a.getTime()) / (7 * DAY_MS)) + 1;
    case "month":
      return months + 1;
    case "quarter":
      return months / 3 + 1;
    case "year":
      return b.getUTCFullYear() - a.getUTCFullYear() + 1;
    default: {
      const unreachable: never = unit;
      throw new Error(`Unknown time unit: ${JSON.stringify(unreachable)}`);
    }
  }
}

// The days a spec asks for on a date column: the column's own span, narrowed
// by filters on it. Undefined if the column has no dates or nothing is left.
// Values that aren't ISO dates are skipped; the validator reports them.
export function requestedRange(column: ColumnSummary, filters: Filter[]): DayRange | undefined {
  if (column.kind !== "date" || column.min === undefined || column.max === undefined) return undefined;
  let from = toDay(column.min);
  let to = toDay(column.max);
  const later = (day: string) => (from = day > from ? day : from);
  const earlier = (day: string) => (to = day < to ? day : to);
  for (const filter of filters) {
    if (filter.field !== column.name) continue;
    if (filter.op === "in") {
      const days = filter.values.filter(isIsoString).map(toDay).sort();
      const [first, last] = [days[0], days[days.length - 1]];
      if (first !== undefined && last !== undefined) {
        later(first);
        earlier(last);
      }
      continue;
    }
    if (!isIsoString(filter.value)) continue;
    const day = toDay(filter.value);
    // A date-only bound excludes its whole day; a date-time bound only part of it.
    const dateOnly = !filter.value.includes("T");
    const op = filter.op;
    switch (op) {
      case "eq":
        later(day);
        earlier(day);
        break;
      case "gte":
        later(day);
        break;
      case "gt":
        later(dateOnly ? addDays(day, 1) : day);
        break;
      case "lte":
        earlier(day);
        break;
      case "lt":
        earlier(dateOnly ? addDays(day, -1) : day);
        break;
      case "neq":
        break;
      default: {
        const unreachable: never = op;
        throw new Error(`Unknown filter op: ${JSON.stringify(unreachable)}`);
      }
    }
  }
  return from <= to ? { from, to } : undefined;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isIsoString(value: string | number): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value);
}

function toDay(iso: string): string {
  return iso.slice(0, 10);
}

function parseDay(iso: string): Date {
  return new Date(`${toDay(iso)}T00:00:00Z`);
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function addDays(day: string, days: number): string {
  const d = parseDay(day);
  return formatDay(utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}
