import { z } from "zod";

const columnBase = {
  name: z.string().describe("Exact column name, as used in chart specs"),
  distinct: z.int().min(0).describe("Number of distinct non-null values"),
  nulls: z.int().min(0).describe("Number of empty cells"),
};

const NumberColumn = z.strictObject({
  ...columnBase,
  kind: z.literal("number"),
  min: z.number().optional().describe("Smallest value; absent if every cell is empty"),
  max: z.number().optional().describe("Largest value; absent if every cell is empty"),
  examples: z.array(z.number()).max(5).describe("Up to 5 example values"),
});

const DateColumn = z.strictObject({
  ...columnBase,
  kind: z.literal("date"),
  min: z.string().optional().describe("Earliest value as an ISO 8601 string"),
  max: z.string().optional().describe("Latest value as an ISO 8601 string"),
  examples: z.array(z.string()).max(5).describe("Up to 5 example values, ISO 8601"),
});

// A category column with this many distinct values or fewer lists them all.
// It matches the most categories a bar chart can show.
export const MAX_LISTED_VALUES = 50;

const CategoryColumn = z
  .strictObject({
    ...columnBase,
    kind: z.literal("category"),
    values: z
      .array(z.string())
      .max(MAX_LISTED_VALUES)
      .optional()
      .describe(
        `Every distinct value, in natural order. Present when there are ${MAX_LISTED_VALUES} or fewer; filter and annotation values must be one of these, spelt exactly.`,
      ),
    examples: z
      .array(z.string())
      .max(5)
      .optional()
      .describe(`Up to 5 example values. Present instead of values when there are more than ${MAX_LISTED_VALUES}.`),
  })
  .refine(
    (c) =>
      c.distinct <= MAX_LISTED_VALUES
        ? c.values?.length === c.distinct && c.examples === undefined
        : c.values === undefined && c.examples !== undefined,
    {
      message: `A category column lists all its values when it has ${MAX_LISTED_VALUES} or fewer, and up to 5 examples otherwise`,
    },
  );

const TextColumn = z.strictObject({
  ...columnBase,
  kind: z.literal("text"),
  examples: z.array(z.string()).max(5).describe("Up to 5 example values"),
});

export const ColumnSummary = z
  .discriminatedUnion("kind", [NumberColumn, DateColumn, CategoryColumn, TextColumn])
  .describe(
    "One column of the dataset. kind is number, date, category (a small set of repeated labels) or text (free text, rarely chartable).",
  );
export type ColumnSummary = z.infer<typeof ColumnSummary>;

const Cell = z.union([z.string(), z.number(), z.null()]);

export const DatasetSummary = z
  .strictObject({
    rowCount: z.int().min(0).describe("Total rows in the dataset"),
    columns: z.array(ColumnSummary).min(1).describe("Every column, in file order"),
    sampleRows: z
      .array(z.record(z.string(), Cell))
      .max(10)
      .describe("Up to 10 rows from the dataset, keyed by column name; null means an empty cell"),
  })
  .describe("A summary of the dataset. You never see the full data, only this.");
export type DatasetSummary = z.infer<typeof DatasetSummary>;
