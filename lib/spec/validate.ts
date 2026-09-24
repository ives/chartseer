import type { ColumnSummary, DatasetSummary } from "./columns";
import type { ChartSpec, Filter, Measure } from "./schema";

// Semantic checks: does a structurally valid spec make sense for this dataset?
// Every message is read by the model on its retry, so each one says what is
// wrong, where ("path: message"), and what it could use instead.

const MAX_BAR_CATEGORIES = 50; // Matches the most BarSpec.limit allows.
const MAX_SERIES_VALUES = 12;
const ORDER_OPS = new Set<Filter["op"]>(["gt", "gte", "lt", "lte"]);

type Value = string | number;

export function validateSpec(spec: ChartSpec, dataset: DatasetSummary): string[] {
  const errors: string[] = [];
  const columns = dataset.columns;
  const numeric = columns.filter((c) => c.kind === "number");
  const filters = spec.filters ?? [];

  // The column called `name`, or undefined after recording an error that
  // lists `alternatives`. Checks that need a missing column are skipped.
  function findColumn(path: string, name: string, alternatives = { label: "Columns", columns }) {
    const column = columns.find((c) => c.name === name);
    if (!column) {
      errors.push(`${path}: there is no column "${name}". ${alternatives.label}: ${names(alternatives.columns)}.`);
    }
    return column;
  }

  // Distinct values left once an eq or in filter on the same column applies.
  function effectiveDistinct(column: ColumnSummary): number {
    let count = column.distinct;
    for (const filter of filters) {
      if (filter.field !== column.name) continue;
      if (filter.op === "eq") count = Math.min(count, 1);
      if (filter.op === "in") count = Math.min(count, new Set(filter.values).size);
    }
    return count;
  }

  function checkMeasure(y: Measure) {
    if (y.aggregate === "count") return;
    const column = findColumn("y.field", y.field, { label: "Numeric columns", columns: numeric });
    if (column && column.kind !== "number") {
      errors.push(
        `y.field: "${column.name}" is a ${column.kind} column; ${y.aggregate} needs a number. ` +
          `Numeric columns: ${names(numeric)}. Or use aggregate "count" to count rows.`,
      );
    }
  }

  function checkScatterAxis(axis: "x" | "y", field: string, scale: "linear" | "log" | undefined) {
    const column = findColumn(`${axis}.field`, field, { label: "Numeric columns", columns: numeric });
    if (!column) return;
    if (column.kind !== "number") {
      errors.push(
        `${axis}.field: "${column.name}" is a ${column.kind} column; scatter axes need numbers. Numeric columns: ${names(numeric)}.`,
      );
      return;
    }
    if (scale !== "log") return;
    if (column.min === undefined) {
      errors.push(`${axis}.scale: "${column.name}" has no values, so it can't use a log scale. Use "linear".`);
    } else if (column.min <= 0) {
      errors.push(
        `${axis}.scale: a log scale needs every value above zero, but the smallest value of "${column.name}" is ${column.min}. Use "linear".`,
      );
    }
  }

  function checkSeries(path: string, field: string) {
    const column = findColumn(path, field);
    if (!column) return;
    const count = effectiveDistinct(column);
    if (count > MAX_SERIES_VALUES) {
      const fewer = columns.filter((c) => c.distinct <= MAX_SERIES_VALUES);
      errors.push(
        `${path}: "${column.name}" has ${count} values; a series can have at most ${MAX_SERIES_VALUES}. ` +
          `Columns with ${MAX_SERIES_VALUES} or fewer values: ${names(fewer)}. ` +
          `Or add an "in" filter on "${column.name}" that keeps at most ${MAX_SERIES_VALUES} of its values.`,
      );
    }
  }

  // A value the spec compares against `column`: in a filter, or an annotation on the x axis.
  function checkValue(path: string, column: ColumnSummary, value: Value) {
    switch (column.kind) {
      case "number":
        if (typeof value !== "number") {
          errors.push(`${path}: "${column.name}" is a number column, so the value must be a number, not the string ${JSON.stringify(value)}.`);
        }
        return;
      case "date":
        if (typeof value !== "string" || !isIsoDate(value)) {
          errors.push(
            `${path}: "${column.name}" is a date column, so the value must be an ISO 8601 date string ` +
              `such as ${JSON.stringify(column.min ?? "2025-06-19")}, not ${JSON.stringify(value)}.`,
          );
        }
        return;
      case "category":
      case "text":
        if (typeof value !== "string") {
          errors.push(`${path}: "${column.name}" is a ${column.kind} column, so the value must be a string: "${value}", not ${value}.`);
          return;
        }
        if (column.kind === "category" && column.values && !column.values.includes(value)) {
          const match = nearest(value, column.values);
          const suggestion = match === undefined ? "" : ` Did you mean ${JSON.stringify(match)}?`;
          errors.push(
            `${path}: ${JSON.stringify(value)} is not a value of "${column.name}".${suggestion} Values: ${quoted(column.values)}.`,
          );
        }
        return;
      default: {
        const unreachable: never = column;
        throw new Error(`Unknown column kind: ${JSON.stringify(unreachable)}`);
      }
    }
  }

  switch (spec.type) {
    case "line":
    case "area":
    case "bar": {
      const x = findColumn("x.field", spec.x.field);
      checkMeasure(spec.y);
      if (spec.series) checkSeries("series.field", spec.series.field);
      if (spec.type === "bar" && x && spec.limit === undefined) {
        const count = effectiveDistinct(x);
        if (count > MAX_BAR_CATEGORIES) {
          errors.push(
            `x.field: "${x.name}" has ${count} values; a bar chart shows at most ${MAX_BAR_CATEGORIES}. ` +
              `Add limit (e.g. 15, with sort "desc" for the top 15), or choose a column with fewer values.`,
          );
        }
      }
      if (x) {
        spec.annotations?.forEach((annotation, i) => {
          if (annotation.kind === "point") {
            checkValue(`annotations[${i}].x`, x, annotation.x);
          } else {
            checkValue(`annotations[${i}].from`, x, annotation.from);
            checkValue(`annotations[${i}].to`, x, annotation.to);
          }
        });
      }
      break;
    }
    case "scatter":
      checkScatterAxis("x", spec.x.field, spec.x.scale);
      checkScatterAxis("y", spec.y.field, spec.y.scale);
      if (spec.group) checkSeries("group.field", spec.group.field);
      break;
    default: {
      const unreachable: never = spec;
      throw new Error(`Unknown chart type: ${JSON.stringify(unreachable)}`);
    }
  }

  filters.forEach((filter, i) => {
    const path = `filters[${i}]`;
    const column = findColumn(`${path}.field`, filter.field);
    if (!column) return;
    if (filter.op === "in") {
      filter.values.forEach((value, j) => checkValue(`${path}.values[${j}]`, column, value));
      return;
    }
    if (ORDER_OPS.has(filter.op) && column.kind !== "number" && column.kind !== "date") {
      errors.push(
        `${path}.op: "${filter.op}" compares order, which only number and date columns have; ` +
          `"${column.name}" is a ${column.kind} column. Use "eq", "neq" or "in".`,
      );
    }
    checkValue(`${path}.value`, column, filter.value);
  });

  return errors;
}

function names(columns: ColumnSummary[]): string {
  return columns.length === 0 ? "none" : quoted(columns.map((c) => c.name));
}

function quoted(values: string[]): string {
  return values.map((v) => JSON.stringify(v)).join(", ");
}

// YYYY-MM-DD, optionally followed by THH:mm or THH:mm:ss, naming a real date and time.
function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part ?? 0));
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === (month ?? 0) - 1 &&
    date.getUTCDate() === day &&
    (hour ?? 0) < 24 &&
    (minute ?? 0) < 60 &&
    (second ?? 0) < 60
  );
}

// The candidate closest to `value`, ignoring case, if it is close enough to be a likely typo.
function nearest(value: string, candidates: readonly string[]): string | undefined {
  const target = value.toLowerCase();
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = editDistance(target, candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return bestDistance <= Math.max(2, Math.floor(value.length / 3)) ? best : undefined;
}

// Levenshtein distance: the fewest single-character insertions, deletions or substitutions.
function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution));
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}
