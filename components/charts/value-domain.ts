// The value axis always includes zero: bars and stacks need the baseline, and
// a line chart's y axis reads the same way (D-022). Nulls are ignored.
export function valueDomain(values: (number | null)[]): [number, number] {
  const present = values.filter((v): v is number => v !== null && Number.isFinite(v));
  const lo = Math.min(0, ...present);
  const hi = Math.max(0, ...present);
  return lo === hi ? [0, 1] : [lo, hi];
}
