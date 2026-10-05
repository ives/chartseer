// A category column with this many distinct values or fewer lists them all,
// so filter values can be checked. Enough for every area in the bikes data (D-039).
// On its own, without Zod, so the first screen can infer an upload without
// loading the schemas (D-066).
export const MAX_LISTED_VALUES = 200;
