import { z } from "zod";

// Every .describe() here becomes the model's documentation via the generated
// JSON Schema, so descriptions are written for the model to read.
// Objects are strict: an unknown key is an error the model can fix, rather
// than something silently dropped.

// Replaces Zod's generic message when no branch of a union matches.
// Other issues, such as a non-object input, keep their own message.
function unionError(message: string) {
  return (issue: z.core.$ZodRawIssue) => (issue.code === "invalid_union" ? message : undefined);
}

const Field = z.string().describe("Exact column name from the dataset summary");

// A string or number, with an error message naming where it was used.
function value(message: string) {
  return z
    .union([z.string(), z.number()], { error: unionError(message) })
    .describe("A value from the column: a number, a category label, or an ISO 8601 date string such as \"2025-06-19\"");
}

const annotationValue = (key: string) =>
  value(`${key} must be a string or a number: a category label, a number, or an ISO 8601 date string`);

const Label = z.string().describe("Axis title to show instead of the column name");

const Dimension = z.strictObject({ field: Field, label: Label.optional() });

const CountMeasure = z
  .strictObject({
    aggregate: z.literal("count").describe("Count the rows"),
    label: Label.optional(),
  })
  .describe("Number of rows for each x (and series) value. Takes no field.");

const FieldMeasure = z
  .strictObject({
    field: Field.describe("Exact name of a numeric column from the dataset summary"),
    aggregate: z
      .enum(["sum", "mean", "median", "min", "max"])
      .describe("How to combine rows that share the same x (and series) value"),
    label: Label.optional(),
  })
  .describe("A numeric column, combined across rows that share the same x (and series) value");

const Measure = z
  .discriminatedUnion("aggregate", [CountMeasure, FieldMeasure], {
    error: unionError(
      'aggregate must be "count" (with no field) to count rows, or "sum", "mean", "median", "min" or "max" with a numeric field',
    ),
  })
  .describe("The value axis. Use aggregate \"count\" to count rows; otherwise name a numeric field.");
export type Measure = z.infer<typeof Measure>;

const NumericAxis = z
  .strictObject({
    field: Field.describe("Exact name of a numeric column from the dataset summary"),
    label: Label.optional(),
    scale: z
      .enum(["linear", "log"])
      .optional()
      .describe("Default linear. Use log only when every value is above zero and they span several orders of magnitude."),
  })
  .describe("One row per point: values are plotted as they are, not aggregated");

const ComparisonFilter = z
  .strictObject({
    field: Field,
    op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]).describe("eq =, neq ≠, gt >, gte ≥, lt <, lte ≤"),
    value: value('value must be a string or a number; use `values` with op "in" for lists'),
  })
  .describe("Keep rows where the field compares true against a single value");

const InFilter = z
  .strictObject({
    field: Field,
    op: z.literal("in"),
    values: z.array(value("each entry in values must be a string or a number")).min(1).describe("Keep rows whose value is any of these"),
  })
  .describe("Keep rows whose value is in a list");

const Filter = z
  .discriminatedUnion("op", [ComparisonFilter, InFilter], {
    error: unionError('op must be "eq", "neq", "gt", "gte", "lt" or "lte" with a single value, or "in" with a list of values'),
  })
  .describe("Applied before aggregation. All filters must hold for a row to be kept.");
export type Filter = z.infer<typeof Filter>;

const Annotation = z
  .discriminatedUnion(
    "kind",
    [
      z
        .strictObject({
          kind: z.literal("point"),
          x: annotationValue("x").describe("Position on the x axis, in the x column's own values"),
          label: z.string().describe("Short note, a few words"),
        })
        .describe("Marks a single x position"),
      z
        .strictObject({
          kind: z.literal("range"),
          from: annotationValue("from").describe("Start of the range on the x axis, in the x column's own values"),
          to: annotationValue("to").describe("End of the range, inclusive"),
          label: z.string().describe("Short note, a few words"),
        })
        .describe("Shades a span of the x axis"),
    ],
    { error: unionError('kind must be "point" (with x) or "range" (with from and to)') },
  )
  .describe("A note that draws attention to part of the chart");
export type Annotation = z.infer<typeof Annotation>;

const Series = z
  .strictObject({ field: Field.describe("Exact name of a category column; at most 12 distinct values") })
  .describe("Split into one line, area or bar group per value of this column");

const Annotations = z.array(Annotation).max(5).optional().describe("Up to 5 notes on the chart");

const Base = z.strictObject({
  version: z.literal(1).describe("Always 1"),
  title: z.string().describe("States what the chart shows, in plain words"),
  subtitle: z.string().optional().describe("Extra context: units, date range, data caveats"),
  filters: z.array(Filter).max(5).optional().describe("Up to 5 row filters"),
});

const XDimension = Dimension.describe(
  "The x axis. Its scale follows the column kind: dates become a time axis, numbers a linear axis, categories evenly spaced.",
);

const LineSpec = Base.extend({
  type: z.literal("line"),
  x: XDimension,
  y: Measure,
  series: Series.optional(),
  annotations: Annotations,
}).describe("Line chart: a trend over an ordered x, usually a date or number");

const AreaSpec = Base.extend({
  type: z.literal("area"),
  x: XDimension,
  y: Measure,
  series: Series.optional(),
  stacked: z.boolean().optional().describe("Default false. Stack series to show their total and each one's share."),
  annotations: Annotations,
}).describe("Area chart: like a line chart, but the magnitude is filled in");

const BarSpec = Base.extend({
  type: z.literal("bar"),
  x: Dimension.describe("The category axis. Drawn vertically when orientation is horizontal."),
  y: Measure,
  series: Series.optional(),
  layout: z
    .enum(["grouped", "stacked"])
    .optional()
    .describe("How series share a category. Default grouped. Ignored without a series."),
  orientation: z
    .enum(["vertical", "horizontal"])
    .optional()
    .describe("Default vertical. Use horizontal for many categories or long labels."),
  sort: z
    .enum(["none", "asc", "desc"])
    .optional()
    .describe("Order categories by their value (their total, if there is a series). Default none keeps the x column's natural order."),
  limit: z
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Keep only the first N categories after sorting, e.g. the top 10 with sort desc"),
  annotations: Annotations,
}).describe("Bar chart: compares a value across categories");

const ScatterSpec = Base.extend({
  type: z.literal("scatter"),
  x: NumericAxis,
  y: NumericAxis,
  group: Series.optional().describe("Split points into groups by the values of this category column (at most 12)"),
}).describe("Scatter plot: one point per row, showing how two numeric columns relate");

export const ChartSpec = z
  .discriminatedUnion("type", [LineSpec, AreaSpec, BarSpec, ScatterSpec], {
    error: unionError('type must be "line", "area", "bar" or "scatter"'),
  })
  .describe("A complete chart. Describe what it means; the app decides how it looks.");
export type ChartSpec = z.infer<typeof ChartSpec>;

export const RenderChartInput = z.strictObject({ spec: ChartSpec });
export type RenderChartInput = z.infer<typeof RenderChartInput>;
