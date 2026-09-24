# Decisions

A short log of choices a future reader would ask "why?" about.
Append new entries at the bottom. Don't delete old ones — mark them *Superseded by D-0xx*.

Format: **Context** (what prompted it) · **Decision** · **Consequences** (what it costs or implies).

---

## D-001 · 2026-09-23 · The model fills in a contract; it never writes code

**Context:** A chart can come out of a language model as generated D3 code, as a Vega-Lite spec, or as our own schema.
**Decision:** The model calls a `renderChart` tool whose input is our Zod-defined `ChartSpec`. Our own components render it.
**Consequences:** No code execution, so no sandbox. Specs are plain data, so they are testable and diffable. The model can only produce charts the schema can express — that limit is deliberate.

## D-002 · 2026-09-23 · Name: Chartseer

**Context:** "Chart Whisperer" felt dated and made a hyphenated URL slug.
**Decision:** Chartseer — one word, reads as both *seer* and *see-er*, unclaimed on npm.
**Consequences:** One string everywhere: repo `chartseer`, deploy `chartseer.vercel.app`.

## D-003 · 2026-09-23 · Stack

**Decision:** Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Vercel AI SDK, D3, Zod, Vitest, pnpm. Hosted on Vercel.
**Consequences:** The AI SDK gives streaming and tool calling across providers. Vitest is Jest-compatible.

## D-004 · 2026-09-23 · Provider abstraction is one function

**Context:** We want to switch models without rewriting code, but not build a plugin system.
**Decision:** `lib/ai/provider.ts` exports `getModel()`, reading the model id from an environment variable. Default: Claude Sonnet (`claude-sonnet-5`).
**Consequences:** Switching provider is a config change. If a second real need appears, revisit.

## D-005 · 2026-09-23 · Data stays in the browser

**Context:** Datasets may be large or sensitive, and sending them to the model costs money.
**Decision:** CSVs are parsed client-side. The model sees a column summary and at most 10 sample rows.
**Consequences:** Cheaper, more private, and the model can't invent data values — it can only reference columns. The server never holds user data.

## D-006 · 2026-09-23 · Two-layer validation, one retry

**Decision:** Zod checks structure; `validateSpec` checks the spec against the actual columns. Errors go back to the model as the tool result, with one retry before explaining the failure to the user.
**Consequences:** Nothing half-valid is rendered. Error messages must be written for the model to act on.

## D-007 · 2026-09-23 · Refinements return a full spec, not a patch

**Context:** Follow-ups like "make it stacked" could be expressed as JSON patches.
**Decision:** Every tool call returns a complete spec; the current spec is sent as context.
**Consequences:** Slightly more output tokens. In exchange: no patch logic, each spec stands alone, and undo is just a history list.

## D-008 · 2026-09-23 · The model chooses meaning, not appearance

**Decision:** The spec contains no colours, fonts or sizes. Styling lives in CSS variables and the chart frame.
**Consequences:** Consistent visual quality, dark mode for free, and a smaller schema for the model to get right.

## D-009 · 2026-09-23 · React owns the DOM; D3 does the maths

**Context:** D3 and React both want to control the DOM.
**Decision:** React renders SVG elements. D3 provides scales, shape generators and ticks. `d3.select` only inside a ref'd `<g>` for axes.
**Consequences:** Components stay declarative and testable with React Testing Library.

## D-010 · 2026-09-23 · Render only complete, validated specs

**Context:** Partial tool arguments stream in before the call finishes.
**Decision:** Show a skeleton while the tool call streams; render once the spec is complete and has passed validation.
**Consequences:** Simpler and never shows a broken chart. Text still streams live, so the app doesn't feel slow.

## D-011 · 2026-09-23 · Scope fence

**Decision:** No accounts, database, saved projects, Excel, joins or collaboration in v1. Full list in `docs/ARCHITECTURE.md` §11.
**Consequences:** When time runs short, cut scope — never code quality.
## D-012 · 2026-09-24 · Minimal Vitest setup for M0

**Context:** The Next.js Vitest guide installs jsdom, React Testing Library, `@vitejs/plugin-react` and `vite-tsconfig-paths` alongside Vitest. Until M2, the only tests will be pure functions in `lib/`.
**Decision:** Install Vitest only. Tests run in the `node` environment. The `@` alias is set by hand in `vitest.config.mts` rather than with the tsconfig-paths plugin. `passWithNoTests` is on until M1 adds the first tests. `pnpm typecheck` runs `next typegen` before `tsc --noEmit`, because `app/layout.tsx` uses the generated `LayoutProps` type, which doesn't exist on a fresh clone.
**Consequences:** One dependency instead of six. jsdom and React Testing Library arrive with the first chart component tests (M2). If the tsconfig `paths` change, the Vitest alias has to change with them.

## D-013 · 2026-09-24 · Zod v4, strict objects

**Context:** The spec schema is both the runtime validator and, via `z.toJSONSchema`, the model's documentation for the `renderChart` tool.
**Decision:** Zod 4 (`import { z } from "zod"`), using the built-in `z.toJSONSchema` rather than a separate converter. Every object in `lib/spec` is a `z.strictObject`.
**Consequences:** An unknown key (a typo, or `colour` on a spec) is a validation error the model can correct on its retry, rather than being silently dropped. The JSON Schema carries `additionalProperties: false`. The cost: adding an optional field to the spec is a breaking change for anything that already sends extra keys — which today is nothing.

## D-014 · 2026-09-24 · Refinements to the v1 spec sketch

**Context:** Writing the first example specs against the two demo datasets exposed gaps in the sketch in `docs/ARCHITECTURE.md` §5.
**Decision:** `lib/spec/schema.ts` is now authoritative. Changes from the sketch:
- **Count takes no field.** A measure is `{ aggregate: "count" }` or `{ field, aggregate: sum|mean|median|min|max }`. `aggregate` is always required, so there is no hidden default. (Bikes has no ID column, so "count of what?" had no good answer.)
- **Log scale on scatter only.** Scatter has its own numeric axes with an optional `scale`. Bars and stacked areas need a zero baseline, so log is never offered there. Add it to line charts if a real prompt needs it.
- **No x-scale field.** On line, area and bar charts, the x scale follows the column kind.
- **Annotations only on line, area and bar charts.** On a scatter there's no single x axis for a note to sit on.
- **Filters are split.** A comparison has one `value`; `in` has a non-empty `values` list. A single `value` field that could be a scalar or an array was easy to get wrong.
- **Dates are ISO 8601 strings** in filters and annotations.
- **Bars take an optional `limit`** (1–50): keep the top N categories after sorting. It makes high-cardinality columns such as `start_area` (126 values) chartable.
**Consequences:** Semantic validation (next) checks what Zod can't: that dates really are ISO dates, that fields exist and have the right kind.

## D-015 · 2026-09-24 · Category columns carry their full value list

**Context:** Semantic validation has to catch a misspelt filter value such as "Amalfi Lemno", and the model can only spell values it has seen. Five examples cover some columns completely (`shop`) and others only partly (`flavour` has 7 values).
**Decision:** A category column with 50 or fewer distinct values carries every value in `values`; above that it carries up to 5 `examples`, never both. 50 matches the most categories a bar chart can show, so a column has a full list exactly when it can be charted without `limit`. Values are in natural order: calendar order for weekdays, months and seasons, otherwise first appearance in the file. First appearance alone isn't enough — the bikes file starts on a Friday, so its weekdays would read Fri … Thu.
**Consequences:** Filter and annotation values on these columns are checked exactly, with a nearest-match suggestion, and the model sees the order the chart will use. The summary sent to the model grows by at most 50 short strings per column. Column inference (M2) has to implement the ordering rule; the fixtures follow it by hand until then.

## D-016 · 2026-09-24 · Demo datasets

**Context:** ARCHITECTURE §14 asked for two bundled datasets: one real and time-based, one more playful.
**Decision:** TfL Santander Cycles journeys (real, sampled to about 25,000 hires at 1 in 30.8) and Gelateria Nebbia (an invented five-shop gelato chain with planted stories). Sources, licences, columns and rebuild steps are in `docs/DATA.md`.
**Consequences:** The bikes data needs TfL's attribution wherever it is shown, and its counts are a sample, not TfL totals — the app must show both rather than relying on the model (§14). Gelato numbers are fictional, and the demo should say so. Both files are rebuilt by seeded scripts in `scripts/`.

## D-017 · 2026-09-24 · Scatter `per` for aggregated points

**Context:** A scatter drew one point per row. Gelato has one row per shop, flavour and day, so "do hotter days sell more?" plotted 22,964 per-flavour points instead of 729 daily totals.
**Decision:** Scatter takes an optional `per: { field }`. With it, rows are grouped by `per` (and `group`, if set) and each axis carries an aggregate: `count` with no field, or `sum`, `mean`, `median`, `min` or `max` with a numeric field. Without it, scatter works as before and aggregates are not allowed. The axis is one strict object, `{ field?, aggregate?, label?, scale? }`, and `validateSpec` enforces which keys each mode needs, not a Zod union of axis shapes. Whether an aggregate is required depends on `per`, a rule spanning fields that has to live in `validateSpec` anyway. A union would also swallow precise errors (a bad `scale`) into one generic message.
**Consequences:** On scatter axes, "count takes no field" (D-014) is checked by `validateSpec` rather than by Zod, and the JSON Schema shows `field` as optional; the descriptions carry the rule. A log scale is always allowed on a `count` axis. `prepareChartData` (M2) must group by `per` and `group` when `per` is set.

## D-018 · 2026-09-24 · tsx for TypeScript dev scripts

**Context:** `pnpm try-spec` runs `parseSpec` from the command line. Node 24 can strip TypeScript types itself, but it resolves imports literally, and `lib/` imports have no extension (`./columns`), so loading `lib/spec` fails with `ERR_MODULE_NOT_FOUND`.
**Decision:** Add `tsx` as a dev dependency for scripts that import `lib/`. esbuild's install script stays disabled in `pnpm-workspace.yaml`; tsx works without it.
**Consequences:** One dev dependency (plus esbuild), and no changes to how `lib/` is written. The older `.mjs` scripts in `scripts/` don't import `lib/` and stay as they are. If Node gains extensionless resolution for TypeScript, tsx can go.

## D-019 · 2026-09-24 · Column kind inference

**Context:** `inferDataset` has to choose each column's kind from its text alone, with no settings for the user to fill in.
**Decision:** A column is `number` if every non-empty cell is a plain decimal (optionally with an exponent), `date` if every one is an ISO 8601 date or date-time that exists on the calendar, otherwise `category` — unless it has more than 50 distinct values (`MAX_LISTED_VALUES`) and more than half its non-empty cells are distinct, which makes it `text`. The 50 floor keeps small files' columns as categories: in a 10-row file almost every column is mostly unique. Dates stay as their original ISO strings. Thousands separators, currency symbols, decimal commas and non-ISO dates (`24/09/2026`) are not recognised: they are ambiguous across locales, both bundled files are clean, and a wrong guess is worse than a category. Category order is the dataset's own `columnOrder` first, then a known sequence (weekdays, months) when every value belongs to it, then first appearance (D-015). Seasons have no built-in sequence; bikes sets theirs in `lib/data/datasets.ts`.
**Consequences:** A station name repeated across 25,000 hires is a category (805 distinct); a column of free-text notes is text. Uploaded files with locale-formatted numbers or dates come through as categories until a real case justifies more parsing.
