import { scaleLinear, scalePoint, scaleUtc } from "d3-scale";
import { line } from "d3-shape";
import type { Annotation } from "@/lib/spec";
import { isoToUtcDate } from "@/lib/data/dates";
import type { CartesianData, XValue } from "@/lib/data/prepare";
import type { Span } from "./annotation-layer";
import type { Axis } from "./chart-frame";

// Shared by the line and area charts, which put x on the same kind of axis.

export type Point = { x: number; y: number | null; partial: boolean };

// The x scale follows the column kind: dates on a UTC time axis, numbers on a
// linear one, categories evenly spaced.
export function xAxis(data: CartesianData, width: number): Axis {
  const label = data.x.label;
  switch (data.x.kind) {
    case "date": {
      const times = data.x.values.map((v) => isoToUtcDate(String(v)).getTime());
      const domain = [new Date(Math.min(...times)), new Date(Math.max(...times))];
      const scale = scaleUtc().domain(domain).range([0, width]);
      return { kind: "time", scale, label, unit: data.x.timeUnit };
    }
    case "number": {
      const numbers = data.x.values.map(Number);
      return { kind: "linear", scale: scaleLinear().domain([Math.min(...numbers), Math.max(...numbers)]).range([0, width]), label };
    }
    case "category":
    case "text":
      return { kind: "point", scale: scalePoint().domain(data.x.values.map(String)).range([0, width]).padding(0.5), label };
    default: {
      const unreachable: never = data.x.kind;
      throw new Error(`Unknown column kind: ${JSON.stringify(unreachable)}`);
    }
  }
}

// Pixel position of an x value, or null if it isn't on the axis.
export function position(axis: Axis, value: XValue): number | null {
  switch (axis.kind) {
    case "time":
      return axis.scale(isoToUtcDate(String(value)));
    case "linear":
    case "log":
      return axis.scale(Number(value));
    case "point":
    case "band":
      return axis.scale(String(value)) ?? null;
    default: {
      const unreachable: never = axis;
      throw new Error(`Unknown axis: ${JSON.stringify(unreachable)}`);
    }
  }
}

// Continuous axes clamp a range to the plot and drop anything wholly outside it.
export function locate(axis: Axis, annotation: Annotation): Span | null {
  const [lo, hi] = [0, axisLength(axis)];
  if (annotation.kind === "point") {
    const at = position(axis, annotation.x);
    return at === null || !Number.isFinite(at) || at < lo || at > hi ? null : { start: at, end: at };
  }
  const [from, to] = [position(axis, annotation.from), position(axis, annotation.to)];
  if (from === null || to === null || !Number.isFinite(from) || !Number.isFinite(to)) return null;
  const [start, end] = [Math.max(lo, Math.min(from, to)), Math.min(hi, Math.max(from, to))];
  return start > end ? null : { start, end };
}

function axisLength(axis: Axis): number {
  const [a = 0, b = 0] = axis.scale.range();
  return Math.abs(b - a);
}

// The points of one series along the x axis, flagged where the bucket is partial.
export function seriesPoints(data: CartesianData, values: (number | null)[], x: Axis): Point[] {
  return data.x.values.map((value, j) => ({
    x: position(x, value) ?? 0,
    y: values[j] ?? null,
    partial: data.x.partial?.[j] ?? false,
  }));
}

// Two paths through the points: a solid one that leaves out partial buckets
// (D-026) and gaps, and a dashed one joining each partial bucket to its neighbours.
export function edgePaths(points: Point[], py: (value: number) => number): { solid: string; dashed: string } {
  const solid = line<Point>()
    .defined((p) => p.y !== null && !p.partial)
    .x((p) => p.x)
    .y((p) => py(p.y ?? 0));
  const segment = line<Point>()
    .x((p) => p.x)
    .y((p) => py(p.y ?? 0));
  const dashed = points
    .flatMap((p, j) => {
      const next = points[j + 1];
      const joins = next !== undefined && p.y !== null && next.y !== null && (p.partial || next.partial);
      return joins ? [segment([p, next]) ?? ""] : [];
    })
    .join("");
  return { solid: solid(points) ?? "", dashed };
}
