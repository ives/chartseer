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
*The 50 threshold is superseded by D-039: 200 values.*

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
*The text floor is now `TEXT_MIN_DISTINCT` in `lib/data/infer.ts`, still 50; `MAX_LISTED_VALUES` rose to 200 (D-039).*
*UK and US numbers and slash dates are now recognised (D-042).*

## D-020 · 2026-09-24 · Chart components may import types from `lib/data`

**Context:** Renderers take a validated spec and the output of `prepareChartData`. That output's type, `ChartData`, belongs beside the pipeline that produces it, in `lib/data/prepare.ts`; putting it in `lib/spec` would make the contract depend on how data is shaped.
**Decision:** `components/charts/` may import types from `lib/spec/` and `lib/data/`, and never from `lib/ai/`.
**Consequences:** `lib/data` is pure (no fetching, no React, no AI), so charts still know nothing about the model, chat or the network. Import direction is unchanged: `components → lib/data → lib/spec`.

## D-021 · 2026-09-24 · `ChartData` conventions

**Context:** `prepareChartData` has to settle every data question so renderers only do scales and layout.
**Decision:**
- A missing x × series combination is `null`, never 0. Renderers decide: stacks treat null as 0, lines show a gap.
- Filters: a null cell fails every op except `neq`, so "shop ≠ Brixton" keeps rows with no shop.
- Rows with a null x, series, group or `per` value are dropped.
- Order: bar `sort` orders by value (by total with a series), stably, with empty totals last. Otherwise categories follow the column's value list, and numbers and dates ascend. `limit` applies after sorting.
- x values are only those present after filtering. Dates are not gap-filled, so Christmas Day, when every gelato shop is shut, is simply absent.
- Axis and series labels are resolved here: the spec's label, else the column name, else "Count" or "Sum of scoops" and so on. *(Refined by D-025.)*
**Consequences:** Renderers never aggregate or reorder. Missing combinations stay visible (Earl Grey before launch, Brixton's refit). A line across a day with no rows at all joins its neighbours; if that misleads, gap-filling needs a known date granularity and belongs here, not in the renderer.

## D-022 · 2026-09-24 · Chart rendering

**Context:** The first renderers (line and bar) and the shared chart frame had to settle how React and D3 split the work, and a few layout questions every later renderer inherits.
**Decision:**
- **React draws the axes too.** Ticks come from `scale.ticks()` and `scale.tickFormat()`; there is no `d3-axis` or `d3-selection`, so no `d3.select` anywhere. The only D3 packages are `d3-scale` and `d3-shape`.
- **The frame takes scales as a function of the plot size.** Scales need the inner width, which needs the measured width and the left margin. `ChartFrame` calls the renderer's `axes(inner)` and passes the result to its `children`, so layout is one pass with no state beyond the `ResizeObserver` width.
- **The left margin is estimated**, from the longest y tick label at about 7px a character, capped at 40% of the width; longer labels are truncated with an ellipsis and a `<title>`. No DOM measurement, so the frame renders the same in tests.
- **Dates sit on a UTC axis.** `isoToUtcDate` reads zone-less date-times as UTC, as JavaScript already does for date-only strings, so a chart looks the same in every time zone.
- **The value axis always includes zero**, and gridlines are drawn only on it. Stacked bars use the diverging offset, so negative values stack below the baseline.
- **Annotations off the axis are skipped**, not errors: a category removed by a filter or `limit`, or a date outside the plotted range. Ranges on a time axis are clamped to it.
- ~~**Area and scatter show a placeholder** with the title and attribution until their renderers exist.~~ *Superseded by D-027 and D-028.*
**Consequences:** Renderers stay declarative and testable in jsdom. Estimated label widths can be off for very wide or narrow glyphs; revisit only if real labels collide. A bar or stacked segment thinner than the 2px gap disappears.

## D-023 · 2026-09-24 · Component tests

**Context:** D-012 deferred jsdom and React Testing Library until the first chart components.
**Decision:** Add `jsdom`, `@testing-library/react` and `@testing-library/dom`. Component tests opt in with a `// @vitest-environment jsdom` comment and call `cleanup` themselves; `lib/` tests stay in the `node` environment. `@vitejs/plugin-react` is not needed: Vitest's own transform handles JSX with the tsconfig's `react-jsx`. Tests stub `ResizeObserver`, which jsdom lacks.
**Consequences:** Three dev dependencies instead of the guide's five. Tests check structure and accessible text, never pixels; visual checks happen on `/dev/gallery`.

## D-024 · 2026-09-24 · Series palette

**Context:** The schema allows up to 12 series, and colours must come from CSS so dark mode needs no JavaScript (D-008).
**Decision:** `--chart-1` … `--chart-12` in `app/globals.css`, assigned in series order. Slots 1–8 are a validated categorical palette with separate light and dark steps; slots 9–12 (teal, brown, plum, olive) extend it, using the same values in both modes. The whole set passes lightness, chroma, adjacent-pair colour-blind separation and normal-vision checks against the app's actual backgrounds (`#ffffff`, `#0a0a0a`). In light mode three slots (aqua, yellow, pink) sit below 3:1 contrast with the background. *Fixed in D-050.*
**Consequences:** Colour is never the only identity channel: the legend always names each series, and the table view (§10) will carry the values. Past about eight series, neighbouring colours are distinguishable but not easily.

## D-025 · 2026-09-24 · Column labels

**Context:** Without a spec label, axis and legend titles fell back to raw column names (`day_type`, `Sum of revenue_gbp`), and a count of bike hires was titled "Count".
**Decision:** Display labels live in `DatasetMeta` (`lib/data/labels.ts` defines `LabelMeta`): `columnLabels` maps a column name to its label, and `rowLabel` says what one row is (bikes: "Journeys"; gelato has none, as a row is a shop, flavour and day). Every bundled column has a label, and a test checks the labels against each CSV's header. `prepareChartData` takes the meta as an optional fourth argument. Titles use the spec's label first, then the column's label. A column with no label, as in an uploaded file, gets one derived from its name: underscores become spaces and the first letter is capitalised, with the rest untouched so acronyms survive (`GDP_per_capita` → "GDP per capita"). A count is titled with the spec's label, else `rowLabel`, else "Count". Other aggregates keep their prefix, "Sum of revenue (£)", with the label's first letter lower-cased unless it begins with an acronym. The prefix stays because the label alone would hide whether a value is a sum or a mean.
**Consequences:** Labels are for display only. The model still sees column names in the dataset summary and writes them in specs, so nothing in `lib/spec` changes. Renaming or adding a bundled column now means adding its label too, or the test fails.

## D-026 · 2026-09-24 · Time grain on date axes

**Context:** A daily x axis over a year or two gives hundreds of noisy points, and a bar per month was impossible: 729 distinct gelato dates broke the 50-bar limit. Summing over a period also raises a question daily data never had. A period cut short by the edge of the range, such as a first week with only some of its days, looks like a dip.
**Decision:**
- **`x.timeUnit`** (`day | week | month | quarter | year`) is optional on line, area and bar charts, and allowed only on a date column. The validator says so, listing the date columns. For bars, the 50-category check counts the periods the requested dates span, not the distinct dates.
- **Buckets are calendar periods in UTC.** Each is named by its first day (`YYYY-MM-DD`), and weeks start on Monday (ISO 8601; also the UK convention). A date-time is cut to the day it names.
- **Filters run on the raw dates, before bucketing.** "In 2025" means exactly 1 January to 31 December, even though the first week then starts in 2024. Widening the range to whole buckets would override what the user asked for.
- **Annotations move to the start of their bucket** in `prepareChartData`, so a date lands on its bar or point and renderers stay free of data logic.
- **The bucket functions live in `lib/spec/time-unit.ts`,** because the validator needs them to count bars and `lib/spec` can't import `lib/data`. `lib/data/dates.ts` has the display side: `formatBuckets` and `bucketTicks`.
- **Ticks never go finer than the unit.** They fall on bucket starts, in steps of a neat multiple (months by 1, 2, 3, 6 or 12). Months, quarters and years fall on calendar multiples, so every third month is Jan, Apr, Jul or Oct. Labels name the period and show the year on the first tick and wherever it changes: "30 Dec 2024", "6 Jan"; "Jan 2025", "Feb"; "Q1 2025", "Q2". Month names are fixed English abbreviations, not `Intl`, whose en-GB September is "Sep" on some runtimes and "Sept" on others. Without a spec label, the x title names the unit, e.g. "Week commencing".
- **Partial buckets are kept and flagged.** A bucket is partial when it reaches past the *requested range*: the x column's min and max, narrowed by `eq`, `in`, `gt`, `gte`, `lt` and `lte` filters on it. The range doesn't depend on which days have rows, so Brixton's refit and Christmas Day stay visible as real dips. Only `sum` and `count` are flagged, since mean, median, min and max don't shrink with fewer days. `CartesianData.x.partial` runs parallel to the values and is present only when something is partial. Lines are dashed into partial buckets and bars drawn lighter (`--chart-partial-dash`, `--chart-partial-opacity`). A footnote names the periods, e.g. *"Dashed: the weeks commencing 30 Dec 2024 and 29 Dec 2025 cover only part of the date range, so their totals run low."*
- **Rejected for partial buckets:** scaling a partial total up to a full period invents numbers; widening the filters overrides the user's range; dropping the buckets loses real data without a word.
- **Charts import date helpers from `lib/data`.** This refines D-020: `components/charts/` may import pure functions from `lib/data/dates.ts` as well as types, as the line chart already did with `isoToUtcDate`.
**Consequences:** The gelato daily example is now weekly (`gelato-weekly-2025`), and its first and last weeks are drawn as partial. The Brixton daily-gap test keeps its daily spec inline. A new `gelato-monthly-revenue` example shows 24 whole months as stacked bars. The tool schema grows by one enum on three x axes. D-021's note that gap-filling needs a known granularity still stands: buckets aren't gap-filled, so a period with no rows at all is absent rather than null.

## D-027 · 2026-09-24 · Area charts

**Context:** The area renderer shares the line chart's x axis, annotations and partial-bucket handling. It also has to settle how overlapping and stacked areas look.
**Decision:**
- **Shared helpers.** The line chart's x axis, positioning, annotation placement and dashed-edge paths move to `components/charts/cartesian.ts`, now that a second chart uses them.
- **Plain areas are a wash.** Each series fills down to zero at `--chart-area-opacity` (0.12 light, 0.2 dark), with a solid 2px edge in the series colour, so overlapping series stay readable. Gaps and lone values behave as on lines.
- **Stacks use the default offset,** with missing values stacked as 0 (D-021). Bars use the diverging offset (D-022), but on areas it makes bands cross wherever a value changes sign. Stacked fills are opaque and separated by a 2px line in the surface colour.
- **Partial buckets** get a dashed edge on plain areas, like lines. On stacked areas they are filled lighter, like bars. The footnote says "Dashed" or "Lighter" to match.
**Consequences:** A stacked area with negative values draws them overlapping below the layer beneath rather than below zero. No bundled data has any. `stacked` with a single series draws a plain area.

## D-028 · 2026-09-24 · Scatter charts

**Context:** Scatter axes are two numeric measures, not a category or time axis plus a value.
**Decision:**
- **Axes span the data, not zero.** Each axis runs from its smallest to its largest value, rounded out with `.nice()`. D-022's zero baseline is for measures; a longitude axis from 0 would squash London into a line. With no spread, the axis widens by a unit, or a decade on a log scale.
- **Log axes** are a new frame `Axis` kind. Ticks come from `scaleLog().ticks()`, keeping only those `tickFormat` labels (1, 2, 10, 20, 100 …). Both scatter axes have gridlines.
- **Points** are 4px-radius circles in the group colour at `--chart-point-opacity` (0.5 light, 0.6 dark). The opacity is `fill-opacity` on each circle, so overlapping points build up density. There is no surface ring: at 25,000 points it would hide the density.
- **Numeric axes only.** The contract allows only number columns on scatter axes. A date axis (e.g. duration against start time) would need a schema and validation change. Deferred until a real prompt asks for it.
**Consequences:** Groups are drawn in order, so a later group covers an earlier one where points coincide. On the bikes station map, 25,132 hires fall on about 805 station positions, and Classic almost hides E-bike. *Largest group now drawn first: D-050. The map example was replaced: D-051.*

## D-029 · 2026-09-24 · Accessible description and table view

**Context:** ARCHITECTURE §10 promised `describeSpec(spec, data)` in `lib/spec` and a "view as table" toggle. The description needs `ChartData`, which is defined in `lib/data` (D-020), and `lib/spec` can't import it.
**Decision:**
- **`describeChart(spec, data)` lives in `lib/data/describe.ts`.** It returns up to three sentences: the chart type, measure, x and series; the x span, or the category count; and the value range with where the largest value is. Stacked charts report totals. Scatters report point count, groups and log axes. It reads the prepared data, so it describes exactly what is drawn.
- **Numbers use `Intl.NumberFormat("en-GB")`** with at most two decimals. Unlike month names (D-026), en-GB digit grouping is the same on every runtime. `formatNumber` and `formatXValue` are shared with the table.
- **`chart.tsx` builds the description and the table once** and passes them through each renderer to `ChartFrame`. The frame owns the description (a visually hidden paragraph the SVG points to with `aria-describedby`) and the toggle: an `aria-pressed` button that swaps the plot for the table. The legend is hidden in table view. The plot's container stays mounted, but hidden, so its `ResizeObserver` stays attached.
- **`components/charts/` may import pure functions from `lib/data`,** not just `dates.ts`. This refines D-026. `describe.ts` is pure, like `dates.ts`.
**Consequences:** Descriptions are in English and deterministic, so tests pin them exactly. The table renders only while it is shown. At 25,000 rows it is slow (D-030).

## D-030 · 2026-09-24 · SVG for large scatters, measured

**Context:** ARCHITECTURE §14 asked whether large scatters need sampling or canvas. The bikes station map draws 25,132 points.
**Decision:** Keep SVG for now. Measured on `/dev/gallery` in Chrome, with dev-mode React, so these are upper bounds. Medians of three runs:
- Redrawing the map alone (table → chart): React render 337 ms, painted after 428 ms.
- First load: the map's render is 391 ms of a gallery-wide commit, painted after about 580 ms.
- A width change (every chart redraws): painted after about 510 ms, so a drag-resize runs at about two frames a second.
- The 25,132-row table: React render about 810 ms, painted after about 2.1 s.
- `prepareChartData` runs outside the measured tree and is not included.
The gallery's per-chart readout (React `Profiler`, then the next frame plus a task) stays in place, so this can be re-measured.
**Consequences:** One-off rendering is acceptable; resizing and the table view are sluggish. Options, not yet chosen: canvas above a point threshold (this loses per-point DOM for hover); drawing each distinct position once (the map has about 805); debouncing width changes; paginating or capping the table. Revisit before M5's responsive and accessibility pass. *The 25,000-point map is no longer an example (D-051), so the gallery no longer draws it; a user can still ask for one.*

## D-031 · 2026-09-28 · Column labels travel in the dataset summary

**Context:** The M3 system prompt should show the model readable column labels (D-025). The server doesn't know which dataset the browser loaded. Sending labels, or a dataset id, as a separate field would add to the request body.
**Decision:** `ColumnSummary` gets an optional `label`. `inferDataset` fills it on every column: from `DatasetMeta.columnLabels` if given, otherwise `deriveLabel`, so uploaded files get labels too. The fixtures carry the bundled labels. The request body stays messages, dataset summary and current spec.
**Consequences:** The model sees labels, so it can use them in titles, while specs keep using `name`. `label` is optional in the schema, so a hand-written summary without it is still valid. `prepareChartData` still takes labels from its `meta` argument; switching it to read the summary would be a separate change.

## D-032 · 2026-09-28 · AI SDK v7; how the retry works

**Context:** M3 needs streaming and tool calling (D-003) and the one-retry rule (D-006). The installed versions are `ai` 7.0.118 and `@ai-sdk/anthropic` 4.0.65. v7 renames several v5-era APIs: `isStepCount` rather than `stepCountIs`, `instructions` for the system prompt, and `toUIMessageStream` with `createUIMessageStreamResponse` for the response.
**Decision:**
- **The SDK doesn't validate tool input.** Given a Zod schema, the SDK rejects bad input itself, with Zod's generic messages, before `execute` runs. Instead, `renderChart`'s input schema is `jsonSchema()` over `RenderChartInput`'s JSON Schema, with no validate function. The model still sees the full schema, but `execute` gets the raw input and `parseSpec` writes every error. The only check before `parseSpec` is that the input is `{ spec }`.
- **One retry per user message.** Each POST is one user message. `stopWhen` stops once a `renderChart` result is `ok`, with a hard cap of three steps. After two failed results, `prepareStep` sets `toolChoice: "none"`, so the last step can only be prose explaining the problem. The prompt tells the model it gets two attempts.
- **The model writes its sentence before the tool call.** The loop stops as soon as a chart is valid, so nothing is generated after it.
**Consequences:** Every error message the model sees is ours, and tested. The Anthropic provider handles `toolChoice: "none"` by leaving the tools out of the request. The explanation step therefore misses the cache (D-033), and it sends history that contains `tool_use` blocks with no tools defined. That hasn't been tested against the live API yet.

## D-033 · 2026-09-28 · Prompt cache breakpoints

**Context:** Every request repeats the tool schema (about 17 KB), the rules and the dataset summary. Only the messages and the current spec change from turn to turn.
**Decision:** The system prompt goes to `instructions` as three system messages, most stable first: the rules, the dataset summary and the current spec. The first two carry an Anthropic `cacheControl: { type: "ephemeral" }` breakpoint. Anthropic caches in the order tools, then system, then messages, so the first breakpoint covers the tools and the rules, and the second adds the dataset. The rules are a constant, and a test checks that they don't vary by dataset or spec. The current spec and the messages come after both breakpoints.
**Consequences:** The first request on a dataset writes the cache; later turns on the same dataset read it for about five minutes. Changing any word of the rules or the tool descriptions invalidates the cache for everyone, which is expected. The cache options are specific to Anthropic, and other providers ignore them (D-004).
**Measured** (2026-09-28, `claude-sonnet-5`, gelato, first turn): the cached prefix (tools, rules and dataset) is 10,181 tokens of 10,285 input. The first request wrote it; an identical second request read all of it back.

## D-034 · 2026-09-28 · `/api/chat` is off by default; logic lives in `lib/ai/chat.ts`

**Context:** The endpoint spends money on every call, and rate limiting doesn't arrive until M6. `app/` holds no logic, and nothing may import from it, so a route can't be tested directly.
**Decision:** `POST /api/chat` returns 503 unless `CHARTSEER_CHAT_ENABLED` is `"true"`, and checks that before reading the body. `lib/ai/chat.ts` holds everything else. `parseChatRequest` checks the body with Zod (1–50 messages, `DatasetSummary`, nullable `ChartSpec`), then with the SDK's `safeValidateUIMessages`, and rejects system messages. `streamChart` takes an optional model, so tests pass the SDK's mock. In development, `onFinish` logs total token usage, including cache reads and writes.
**Consequences:** Production stays dark until the flag is set on Vercel. Environment variables: `ANTHROPIC_API_KEY` (read by the provider), `CHARTSEER_MODEL` (default `claude-sonnet-5`) and `CHARTSEER_CHAT_ENABLED`.

## D-035 · 2026-09-28 · The studio: chat state and requests

**Context:** M3 part 2 puts the chat on the home page. It needs a place for the page shell, a source for the chart state, and a request body the strict `/api/chat` schema accepts.
**Decision:**
- **The page shell lives in `components/studio/`:** the dataset picker, the chart area, the dataset loader, and `Workspace`, which holds one dataset's data, chat and chart. The chat UI stays in `components/chat/`. `Studio` remounts `Workspace` with `key={datasetId}`, so switching dataset clears the data, the messages and the chart history together.
- **`useChat` from `@ai-sdk/react` 4.0.121,** wrapped in `useChartseerChat`. It pins `ai` 7.0.118, which matches ours, so the bundle has one copy of `ai`. Newer releases are held back by the repo's pnpm `minimumReleaseAge` policy.
- **The chart history is derived from the messages:** every `renderChart` result that is `ok` *and* passes `parseSpec` against the summary loaded in the browser. The current chart is the last one. It can't drift from the conversation, and a broken spec can't reach `<Chart>` even if the server's copy of the summary differed. M4's undo can add a pointer into this list. *It does: D-044.*
- **The client builds the request body itself.** The SDK's default body adds `id`, `trigger` and `messageId`, which the server's strict schema rejects. `send` and `retry` pass `{ dataset, currentSpec }` as the per-call body, and the transport's `prepareSendMessagesRequest` keeps exactly those fields plus the messages (`buildChatBody`). The transport is a module-level constant: reading a ref from it breaks React's rules of refs.
- **Screen readers:** the message list isn't a live region, because streamed text would be read out word by word. A `role="status"` line says "Working on it…" during a request, then the finished reply and "Chart drawn: {title}". Errors are announced by their own `role="alert"`. Focus returns to the input when a request ends.
**Consequences:** No shadcn/ui yet: plain elements styled with Tailwind, plus `--surface`, `--border`, `--muted` and `--danger` tokens. The CSV loader repeats a few lines of the dev gallery's.

## D-036 · 2026-09-28 · Chat errors: a code from the server, wording on the client

**Context:** The user should see a short, friendly message for rate limits, an overloaded model, or the 503 switch, never provider details.
**Decision:** The route passes `chatErrorCode` to `toUIMessageStream({ onError })`. It unwraps the SDK's `RetryError` and maps status 429 to `rate_limited`, 529 to `overloaded`, and anything else to `failed`, so errors inside the stream reach the client only as that code. HTTP errors (503, 400, a future 429) reach `useChat` as an `APICallError` with the status. `friendlyError` in `components/chat/error-message.ts` turns either kind into one sentence. The chat shows it with a "Try again" button that regenerates the reply.
**Consequences:** The wording lives in one tested function. When rate limiting arrives in M6, a 429 from our own route already has a message.

## D-037 · 2026-09-30 · Prompt checks: one retry is enough for now

**Context:** ARCHITECTURE §12 promised a hand-run check of how often the model produces a valid spec, and §14 asked whether one validation retry is enough.
**Decision:** `pnpm check-prompts` (`scripts/check-prompts.ts`) sends 24 requests through `streamChart`, not HTTP, against summaries inferred from the real CSVs. There are 12 per dataset: 4 plain, 3 refinements of an example spec, 2 vague questions, a misspelt value, an impossible request and an off-topic message. For each case it records the outcome (valid first time, valid after retry, failed, or no chart), any `parseSpec` errors, the tokens used and the response time. It prints a table and writes the full results to `scripts/reports/` (git-ignored). It's a report, not a test, and never runs in `pnpm test`.
**First run** (2026-09-30, `claude-sonnet-5`):
- **Validity:** every one of the 20 cases that drew a chart was valid first time. No retries, no failures, and all 24 expectations met.
- **Refinements** changed only what was asked. "Make it stacked" turned the line chart into a stacked area chart. The titles stayed descriptive even when the example spec's own title stated a finding.
- **Misspellings:** "Amalfi Lemno" and "Sohoo" were corrected by the model, not by validation.
- **Requests it couldn't meet:** a pie chart became a bar chart, with an explanation. "Revenue per hire" and "just the summer" (the bikes data runs January to May) got prose and an offer of something close, with no chart.
- **Response time:** median 2.7 s, p90 3.9 s.
**Answer:** one retry is enough. It wasn't needed once in 24 cases, and a second would add latency for no measured gain. Re-run the check after any change to the rules, the schema descriptions or the model.
**Consequences:** The explanation step after two failures is still untested live, so D-032's caveat stands. Follow-ups, not made here:
- A category column with more than 50 values shows the model only 5 examples, and validation can't check filter values against it. "Sohoo" worked only because Soho was one of the examples; a typo of any other bike area would pass validation and draw an empty chart. M4's empty states should cover a filter that matches no rows. *Addressed by D-039.*
- Several example specs in `lib/spec/examples.ts` have titles that state findings, and the schema's `title` description says "States what the chart shows". Both contradict the prompt's rule. The model followed the prompt in every case here. *Addressed by D-040.*

## D-038 · 2026-09-30 · Tool schema size and caching, measured

**Context:** ARCHITECTURE §14 asked whether the size of `RenderChartInput`'s schema needs attention once caching is in place (D-033).
**Measured** with Anthropic's free `count_tokens`, each part as the difference between two counts:
- tool schema: 7,561 tokens, including Anthropic's tool-use overhead (18.9 KB of JSON Schema)
- rules: 486 tokens
- dataset summary: 2,215 tokens for gelato, 3,368 for bikes
The schema is about 74% of gelato's cached prefix of about 10,200 tokens, and about 67% of bikes' 11,300.
**Caching works as designed.**
- Across the 24-call run, 94% of input tokens were cache reads.
- Each dataset's first call wrote the cache.
- The first bikes call read 7,979 tokens (tools and rules, cached by the gelato calls just before) and wrote only its 3,367-token dataset part. The two breakpoints behave independently.
- Every later call read the whole prefix.
**Decision:** don't trim the schema.
- Once cached, the prefix is billed at about a tenth of the normal input rate, so the schema costs about 750 token-equivalents per turn.
- Only an uncached first turn pays for it in full.
- The tools and rules are the same for every visitor and every dataset, and the bundled dataset parts are too, so on a public demo any visit within the five-minute cache window shares them.
- An uncached first call took 2.7 s against a median of 2.7 s overall, so latency isn't affected either.
- Trimming descriptions would risk the 100% first-time validity measured in D-037 for a small saving.
**Consequences:** Revisit if traffic is so sparse that most requests miss the five-minute cache, which M6's cost figures will show, or if the schema grows. `lib/ai/tools.ts` exports `RENDER_CHART_SCHEMA` and `RENDER_CHART_DESCRIPTION`, so `pnpm check-prompts` counts exactly what the model is sent.

## D-039 · 2026-09-30 · Full value lists up to 200

**Context:** D-037 found that the bikes area columns (`start_area`, `end_area`, 126 values each) showed the model only 5 examples, so validation couldn't check filter values on them. A typo such as "Sohoo" would pass and draw an empty chart. D-015 tied the list threshold to the bar chart's 50-category limit.
**Decision:** `MAX_LISTED_VALUES` rises from 50 to 200. A category column with 200 or fewer distinct values lists them all, which covers both area columns. The stations (805 and 806) keep their examples. Nothing else changes:
- The bar chart's 50-category limit (`MAX_BAR_CATEGORIES`) is separate and stays at 50. A listed column can now have more values than a bar chart shows, and the existing "Add limit" message covers that.
- The text floor in column inference (D-019) stays at 50, as its own constant `TEXT_MIN_DISTINCT`. Raising it with the list would turn a mostly unique notes column of 51–200 values into a category that lists every note.
**Consequences:**
- A misspelt area in a filter or annotation is now rejected with a nearest-match suggestion, and the model can spell areas it has seen.
- Measured with `count_tokens`, the bikes dataset summary grew from 3,368 to 4,908 tokens (+1,540, +46%). It sits in the cached prefix (D-033), so it's billed at about a tenth of the normal rate after the first turn. Gelato is unchanged at 2,215.
- A rejected value's error message lists every value, up to 200 of them. This costs tokens only on a retry.
- The full lists show data quirks the examples hid: TfL's `The Regent's Park_OLD` and `Liverpool Street_OLD` are areas in their own right.

## D-040 · 2026-09-30 · Titles describe what is plotted; prompt checks re-run

**Context:** D-037 found that the schema's `title` description ("States what the chart shows") and several example titles stated findings, which contradicts the prompt rule. The model has seen only a summary, so a finding in a title is a guess.
**Decision:** The `title` description now reads "Describe what is plotted, not what it reveals, e.g. 'Weekly scoops by shop, 2025'". Example titles that stated a finding or asked a question are rewritten as plain descriptions: "Classic bikes carry most hires at every hour" is now "Journeys by hour of day and bike type". So is the one subtitle that stated a finding (gelato scoops by weekday).
**Re-run** (2026-09-30, `claude-sonnet-5`, after this change and D-039):
- **Validity:** all 21 cases that drew a chart were valid first time, with no retries or failures, and all 24 expectations were met, as in D-037.
- **Titles:** every title described what was plotted; none stated a finding.
- **Misspellings:** "Sohoo" became Soho and "Amalfi Lemno" became Amalfi Lemon, both corrected by the model on the first try.
- **One outcome changed:** "Just the summer" on the bikes top-areas chart, which runs January to May, now draws a chart filtered to spring, titled "…, Spring 2026", where D-037 got prose. It's allowed ("either"), and the reply said so first: there is no summer data, so it shows spring, the closest season.
- **Tokens:** the tool schema grew from 7,561 to 7,661, because the longer title description appears once per chart type. The bikes dataset summary grew from 3,368 to 4,908 (D-039). 94% of input tokens were cache reads.
- **Response time:** median 2.8 s, p90 3.9 s.
**Consequences:** D-032's caveat stands, narrowed. The two-failures-then-prose path is covered by a mock-model test (`lib/ai/chat.test.ts`, "allows only prose after the retry fails"), which checks three calls, `toolChoice: "none"` on the last, and the prose reply. No live case has failed twice yet, so the wording of that explanation is still unmeasured.

## D-041 · 2026-09-30 · CSV uploads

**Context:** M4 brings uploads into the UI (ARCHITECTURE §11). A file from a user can be anything, and the lenient `parseCsv` used for the bundled files silently drops extra cells and leaves missing ones empty.
**Decision:**
- **Where:** an "Upload Own CSV" button beside the dataset picker, and drag and drop anywhere on the page. The file is read and parsed in the browser (D-005). The privacy note sits under the header controls and on the drop overlay.
- **Checks before reading** (`checkFile` in `lib/data/upload.ts`): the name must end in `.csv`, because MIME types vary too much by OS to rely on; and the size must be at most 5 MB. The size in the message is rounded up, so a file just over the limit never reads as "5.0 MB".
- **Reading** (`readCsv` in `lib/data/parse.ts`):
  - Strips a UTF-8 byte-order mark.
  - Takes the delimiter from the header line: whichever of comma, semicolon and tab appears most often outside quotes, or comma if none appears.
  - Skips blank lines and trims column names.
  - `parseCsv` shares the splitting but keeps blank rows, because in a one-column file they are empty cells.
- **Errors, each with its own message, in this order:** binary content (NUL characters), empty file, a first row that looks like data (every cell a number or date), a column with no name, duplicate names, a single column, no data rows, and a row with the wrong number of values.
  - Rows are numbered as a spreadsheet shows them, with the header as row 1, and only the first bad row is named.
  - Unnamed and duplicate columns weren't in the brief, but without these checks one column would silently overwrite another.
- **Switching dataset**, by picking another one or loading a valid upload, starts a new conversation. If one has started, a native `<dialog>` asks first, which needs no new dependency. A rejected upload shows its error and leaves everything as it was.
- **Uploads have no attribution:** `attribution` is optional on `DatasetMeta` and required on `BundledDataset`.
**Consequences:** A file is held in memory until another dataset replaces it; nothing is stored. Leading-index columns exported by pandas (an empty first header cell) are rejected with "Column 1 has no name", which is clear but strict; revisit if it comes up.

## D-042 · 2026-09-30 · Locale formats in uploads

**Context:** ARCHITECTURE §14 left UK-style dates and formatted numbers to M4. Until now they came through as categories (D-019).
**Decision:**
- **Numbers:** a column is numeric if every cell is a plain decimal, or a number with an optional sign, an optional leading £, $ or € (`-£5` and `£-5` both work), comma thousands in strict groups of three, and an optional trailing %.
  - Values are stored plain. `12%` is 12, not 0.12, so the axis reads as the file does.
  - When every cell carries the same symbol and the label is derived, it gains the unit: "Price (£)", "Growth (%)". The model and the axes keep the meaning; Studio passes the inferred labels to the chart as `columnLabels`.
- **Decimal commas (`3,50`) are not recognised** and stay categories. `1,234` can't be both a thousands separator and a decimal, and the app is British. Semicolon files, often European, still load, but their decimal-comma columns won't be numeric.
- **Dates:** `D/M/YYYY` or `M/D/YYYY`, with 1–2-digit day and month and a 4-digit year, decided per column:
  - Any first part over 12 means day-first. Any second part over 12 means month-first.
  - Both, a date that doesn't exist, or a mix with other formats makes the column a category, as with impossible ISO dates.
  - With neither, the column is ambiguous and read day-first: the app is British, and day-first is the more common order outside the US.
  - Every date becomes ISO (`YYYY-MM-DD`) on load, so the model, validation and bucketing only see ISO.
- **The switch:** when any column is ambiguous, "Dates read as day/month · switch" appears beside the dataset name. The switch flips every ambiguous column at once, since a file uses one convention; columns whose order is known are unaffected.
  - Switching re-infers the file but **keeps the conversation**: the data changed, not the question, and the current chart redraws from the re-read rows.
**Consequences:** Two-digit years, dates with times (`24/09/2026 14:30`), other separators (`24.09.2026`, `24-09-2026`) and accounting negatives (`(5)`) are still categories. The ambiguity flag is kept out of `DatasetSummary`, so nothing changes for the model or `/api/chat`.

## D-043 · 2026-09-30 · Vercel Web Analytics

**Context:** The app is deployed on Vercel (M0), and we want to see page views on the public demo.
**Decision:** Add `@vercel/analytics` and render its `<Analytics />` component once, in `app/layout.tsx`. It's first-party to the host, needs no configuration in code, and does nothing in development.
**Consequences:** Web Analytics must be enabled for the project in the Vercel dashboard before any data appears. It records page views, not what users type or upload: file contents never leave the browser, as the privacy note says (D-005, D-041).

## D-044 · 2026-09-30 · Undo and redo

**Context:** ARCHITECTURE §8 promised undo from the spec history, and D-035 left room for a pointer into it. A refinement must build on the chart the user sees, not on whichever chart the conversation drew last.
**Decision:**
- **Steps are positions in the derived history.** `chartHistory` stays derived from the messages. `components/chat/history.ts` keeps a stack of positions in it, plus the shown position. The stack is synced during render by a pure, idempotent `syncSteps`, so no effect is needed to keep it in step with the messages.
- **The shown chart is the current spec.** `useChartseerChat` sends it with the next request through the existing `RequestContext`, so the transport is unchanged.
- **The undo is recorded in the conversation itself.** When the user sends a message while the shown chart isn't the latest, the message starts with a `data-back-to` part holding that chart's title. Only where the user ended up counts, not each click, and a message sent from the latest chart has no event.
  - The server validates the part (`BackToEvent` in `lib/spec/events.ts`, a title of 1–200 characters; any other data part is rejected). `convertToModelMessages`' `convertDataPart` turns it into text written by the server, just before the user's words: "The user went back to the chart '…'. Later charts are no longer shown."
  - The chat shows it as a small line above the message: "↩ Back to: {title}".
  - Retries resend the same message, and later turns keep the event, so the model's record of the conversation matches the screen.
- **A new chart after an undo discards the redo steps,** as in any editor. The model's earlier charts stay in the conversation but drop out of the stack. If a retry removes a message that drew a chart, that chart leaves the stack too.
- **Controls:** Undo and Redo buttons above the chart, disabled at either end. Ctrl/Cmd+Z undoes and Shift+Ctrl/Cmd+Z redoes.
  - The shortcut is ignored in any text field (`input`, `textarea`, `contenteditable`), not just the chat input: anything a user types into keeps its own text undo.
  - `preventDefault` is called only when the shortcut acts.
- **Undo and redo are disabled while a request is in flight,** because the reply builds on the spec the request was sent with.
- **Screen readers:** after an undo or redo, a status line reads "Showing chart 2 of 4: {title}". The title is added so the user knows which chart came back. A new chart is announced by the chat panel as before (D-035), not here.
**Why a system-prompt rule wasn't enough:** the first version only added a rule: "The current chart below is always the one the user sees… Base follow-ups on it, not on later charts." In Chrome, after two charts and an undo, "Make it stacked" stacked the *later* chart. An in-page capture showed the request did carry the restored chart as the current spec. Asked again, the model replied "That's already stacked", about a chart no longer on screen. The conversation's record, in which the later chart was the last one drawn, outweighed a general rule and a spec in the system prompt. The rule was removed, and the rules went back to 486 tokens.
**Why a data part, not a mid-conversation system message:** the Anthropic provider (4.0.65) supports mid-conversation system messages through beta features. But `/api/chat` rejects every system message from the client ("the system prompt is ours alone"), so the choice was between relaxing that rule and having the server build system messages from client state, while depending on a beta. A data part is the SDK's documented way to add context to a user message. It keeps the security rule, and the server still writes every word the model reads.
**Consequences:**
- **Tests:**
  - A mock-model test drives the hook through a stand-in for `/api/chat`: two charts, an undo, then "Make it stacked". The third request carried the restored spec, its user message began with the event text, earlier messages had none, and the discarded step can't be redone. The test fails if the current spec reverts to the latest chart.
  - Server tests check that the event reaches the model as text before the user's words, and that unknown data parts, overlong titles and extra fields are rejected.
- **`pnpm check-prompts`** has a permanent `undo` case:
  - It sends two earlier turns (weekly scoops by shop, then revenue by flavour) and a back-to event for the weekly chart, then "Make it stacked".
  - It counts as met only if the chart still plots scoops by date, split by shop.
  - First run (2026-09-30, `claude-sonnet-5`): met. The result was a stacked area chart of weekly scoops by shop.
  - Overall 25/25 expectations met, all charts valid first time. "Just the summer" on bikes went back to prose this run; either outcome is allowed.
- **Live check in Chrome:** the same steps drew weekly scoops by shop, then weekly revenue by flavour; then Undo and "Make it stacked". The chat showed "↩ Back to: Weekly scoops by shop, 2025" and the result was a stacked area chart of weekly scoops by shop, with Redo unavailable.

## D-045 · 2026-09-30 · First screen and starter prompts

**Context:** The app opened straight into Gelato, and its empty state listed two example prompts as plain text. M4 asked for a first screen and starter prompts that can be clicked.
**Decision:**
- **The app opens on a choice.** `Studio` starts with no dataset. `DatasetChooser` offers a card for each demo dataset (title, a one-line `summary`, the attribution and any note), the upload button with a hint about drag and drop, and the privacy note. The header's picker and upload appear once a dataset is loaded. The first choice needs no confirmation, because there's no conversation yet.
- **Starters are chips that send.** Before the first chart, the empty state shows three or four buttons. Each sends its text into the chat as if typed, and they're disabled while a request is in flight.
  - Demo datasets carry hand-written `starters` on `BundledDataset`, each one a check-prompts case measured valid (D-037, D-040).
  - Uploads get `starterPrompts(summary)` (`lib/data/starters.ts`), which is deterministic and makes no model call. It picks the first date, number and small category columns, and builds up to four requests: a monthly total, the same over time by category, a total by category, and one number against another.
    - Labels read as prose: "Takings (£)" becomes "takings", and "GDP per capita" keeps its capitals (`inlineLabel` in `lib/data/labels.ts`).
    - A file of only free text gets no starters, just "Ask for a chart of your data."
- **Attribution travels with the dataset.** The chart frame already showed the TfL attribution and the bike sample ratio. Both empty states and the first screen now do too, which settles the §14 item.
**Consequences:**
- The generated starters are a heuristic, and a number column that is really a code (an hour, a latitude) gives odd prompts such as "Total hour of day by month". That only affects uploads; the demo datasets use their own. Revisit if uploads show it matters.
- "Map the start stations" needed a retry in the D-048 run (the model used `per` without aggregates), the first retry ever recorded for it. It stays a starter: it was valid after the retry.

## D-046 · 2026-09-30 · Charts with nothing to draw

**Context:** A valid spec could still draw blank axes. A misspelt value on a column too large for a full value list passes validation (D-039 lists only up to 200 values; there are 805 stations), and so does a date range outside the data. A column can also be empty in every row the filters keep.
**Decision:** `explainEmpty(rows, dataset, spec, data, meta)` (`lib/data/empty.ts`) runs after `prepareChartData`. It returns null when anything would be drawn. Otherwise the chart area shows the spec's title and a message in the chart's place, with Undo and Redo still available.
- **Filters that matched nothing:** each filter is tried alone on all the rows, and the first that matches nothing is named in words, e.g. "No rows where start station is 'Waterlo Road'."
  - For text values it adds up to three close values from the rows. They're ranked by edit distance to the whole value or to its start, so "Waterlo Road" finds "Waterloo Road, South Bank".
  - For dates and numbers it adds the column's span. Dates are written as readers say them ("16 Jan 2026").
  - If each filter matches on its own but not together, it says so and lists them.
  - **"Ask Chartseer to fix it"** sends the same text plus "Please fix the filter." into the chat as the user's message, so the model sees exactly what the user saw.
- **No values:** when rows match but the x, y, or series/group column is empty in all of them, it says which: "Nothing to plot: rainfall is empty in all 31 matching rows." There's no button; changing the data isn't the model's job.
**Consequences:**
- The close values are real values from the data, sent to the model only when the user clicks, and visible in the message first. A few values are in the spirit of the privacy note ("a few sample rows"), and they're what makes a typo on a large column fixable.
- Checked in Chrome: "Journeys by hour from the start station called exactly 'Waterlo Road'" drew the empty state with three close stations. "Ask Chartseer to fix it" then drew hourly journeys from "Waterloo Road, South Bank".

## D-047 · 2026-09-30 · Offline and an unreachable server

**Context:** A failed request said "Couldn't reach the server. Check your connection." whether the device was offline or the server was down, and a failed demo file load said "Reload the page".
**Decision:**
- **`useOnline`** (`components/chat/use-online.ts`) follows `navigator.onLine` and the `online`/`offline` events. While offline, the chat panel shows "You're offline. Chartseer will work again when your connection is back." and holds sending, as it does during a reply. Typing still works.
- **`friendlyError`** tells the cases apart:
  - a failed fetch while offline: "You're offline. Check your connection, then try again."
  - a failed fetch while online: "Couldn't reach the Chartseer server. Try again in a moment."
  - 500, 502 or 504: "The Chartseer server isn't responding. Try again in a moment."
  - Each keeps the existing Try again button, which resends the same request.
- **A demo file that fails to load** shows "Couldn't load {title}. Check your connection." with Try again, which remounts the workspace to fetch it again. A failed load has no conversation to lose.
**Consequences:** `navigator.onLine` can say online behind a captive portal or a dead router; the failed request then gives the "couldn't reach the server" wording, which is still true. The browser tool couldn't switch Chrome offline, so the offline states are covered by jsdom tests only.

## D-048 · 2026-09-30 · Prompt checks on an uploaded-style file

**Context:** Every check-prompts case used the bundled datasets, which have hand-written labels and clean ISO data. Uploads go through a different path: UK dates, currency, derived labels, and column names the model has never seen.
**Decision:** `scripts/check-prompts.ts` builds a small "market" file:
- two months of daily takings for three stalls;
- `DD/MM/YYYY` dates, including days over 12;
- `"£1,234.50"` takings;
- `nobbles_sold`, a made-up name.

It's read through `readCsv` and `inferDataset` with no meta, exactly as an upload is. Three cases each carry a `check`:
- "Weekly takings by stall": a weekly sum of takings by stall.
- "Nobbles sold per day at the Cheese stall": `nobbles_sold` with a stall filter.
- "Takings for the first half of March only": ISO date bounds, although the file's dates are slash dates.

**First run** (2026-09-30, `claude-sonnet-5`, 28 cases):
- **Market:** 3/3 valid first time, every check met. The March filter used `2025-03-01` to `2025-03-15`.
- **Overall:** 28/28 expectations met; 23 valid first time, 1 after a retry, 4 prose replies as expected. The retry was "Map the start stations" (see D-045).
- **Tokens:** the market summary is 744 tokens. Median response 3.0 s, p90 5.1 s. The first market call took 9.5 s, because it wrote that dataset's cache.

## D-049 · 2026-09-30 · Forcing a theme in development

**Context:** M5 needs screenshots and checks in both themes, but the dark theme followed only the system setting, which the tools in a session can't change.
**Decision:** `html[data-theme="dark" | "light"]` overrides the system. The dark variables are declared twice in `app/globals.css`: under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])`, and for `:root[data-theme="dark"]`. CSS can't share one block between a media query and a selector. `app/theme.test.ts` checks that the two blocks are identical. The only switch is on `/dev/gallery` (`theme-switch.tsx`); the app has no theme control. The gallery's one Tailwind `dark:` class became the `surface` token, so everything follows the override.
**Consequences:** A dark-mode variable is added in two places, and the test fails if one is forgotten. The same override can force light for a future export (§14).

## D-050 · 2026-09-30 · Palette contrast, fainter gridlines, a dark panel, scatter order

**Context:** Parked items from D-024, D-028 and §14.
**Decision:**
- **Every light-mode series colour now has at least 3:1 contrast with white.** Slot 3 `#1baf7a` → `#22a775` (3.06), slot 4 `#eda100` → `#da7e00` (3.01) and slot 5 `#e87ba4` → `#d97696` (3.01).
  - Each change is the lightest shade that reaches 3:1, within a few degrees of hue.
  - A yellow dark enough for 3:1 becomes gold and sat too close to the olive under protanopia. So slot 12 moved from `#7f9500` to `#9c9900` (3.01) in light mode. Its dark-mode value is unchanged.
- **Separation, checked against the other eleven slots** with CIE76 ΔE and Machado 2009 simulations:
  - Normal vision: the worst pair is still 22.0 (slots 2 and 8).
  - Deuteranopia: the worst pair is still 5.4 (slots 6 and 10).
  - Protanopia: the worst pair goes from 6.6 to 5.4 (slots 4 and 12), matching the deuteranopia floor.
  - Dark-mode colours are unchanged.
- **Gridlines are a step fainter:** `#ecebe6` in light mode (was the border colour `#e1e0d9`) and `#232321` in dark mode (was `#2c2c2a`).
- **Dark mode gets a subtly raised panel** (`--chart-panel: #121211`) behind each chart. Light mode keeps a transparent one, with the same padding, so layout doesn't shift.
  - `--chart-gap` is whatever sits behind the marks: the page background in light mode, the panel in dark mode.
  - Stacked-area separators and hover-dot rings use it, so they no longer show as seams on the panel.
- **Scatter groups are drawn largest first,** so smaller groups sit on top (`drawOrder`). Colours and the legend keep the groups' own order.
- **Render timing** exists only in the dev gallery's `Timed` wrapper, and `/dev/gallery` returns 404 in production. Nothing to change.

## D-051 · 2026-09-30 · A scatter example that suits a scatter

**Context:** The bikes scatter example was a longitude/latitude map of 25,000 points: a map drawn as a scatter, the slowest chart in the gallery (D-030), with one group hiding the other (D-028).
**Decision:** It's replaced by `bikes-daily-journeys-duration`: one point per day, journeys started against median hire length, grouped by day type. Two real measures, 31 points (the sample covers 31 days), and a visible pattern: weekend days sit higher, with longer median hires for the number of journeys. The bikes starter chip "Map the start stations" became "Daily journeys against median hire length, weekdays and weekends". Starters must be measured (D-045), so it's a check-prompts case: valid first time, with the spec intended.
**Consequences:** "Map the start stations" stays a check-prompts case: users can still ask for a map. The first chip no longer leads to the only chart that has needed a retry.
**Christmas Day on the daily gelato line:** a daily line joins 24 December straight to 26 December. All shops are shut on Christmas Day, so it has no rows and no point, and the join reads as if there were sales that day. Buckets aren't gap-filled (D-021, D-026), so this applies to any missing day or period inside the range. A gap would be honest. With a `timeUnit`, the grain is known, so `prepareChartData` could add the missing buckets inside the requested range as null values: lines and areas then break, and the table says "no data". Not done here; it changes `prepareChartData` for every chart with a time unit, and it's a separate decision.

## D-052 · 2026-09-30 · Tooltips

**Context:** M5 asked for values on hover and tap, with readable labels, without hiding anything keyboard users need.
**Decision:**
- **`ChartFrame` owns the behaviour:**
  - a transparent layer over the plot takes pointer events;
  - a tap keeps its tooltip until the next tap elsewhere; Escape or leaving the plot closes it;
  - the tooltip is placed beside the pointer and flips at the right edge.
- **The plot is memoised on its size and props,** so a pointer move redraws only the hover mark and the tooltip, even over 25,000 points. Browsers already deliver `pointermove` at most once a frame, so there's no throttle. A `requestAnimationFrame` throttle was tried and dropped: it never fires in a hidden tab.
- **Each renderer supplies a `hover` function** that hit-tests and returns content and a mark:
  - lines and areas snap to the nearest x value, with a guide line and a dot per series (`snap-hover.tsx`);
  - bars hit-test the same rectangles they draw (`rectsFor`), with an outline;
  - scatters find the nearest point within 20 px, top-drawn groups first, with a ring.
- **Content is pure** (`tooltip-content.ts`) and uses the table's formatting:
  - the x value with its label ("Week commencing: 30 Dec 2024");
  - the measure with its unit ("Sum of revenue (£)") and each series' value, "no data" where there's none;
  - a stack's total;
  - for scatters, the `per` value, both measures and the group;
  - a note on partial buckets.
- **Accessibility:** the tooltip is `aria-hidden`, and `pointer-events: none`, so it can't cover a control. It never opens from the keyboard. Everything it shows is in the table view (§10).
**Consequences:** Hover needs a pointer. Keyboard and screen reader users get the same values from the table and the description.

## D-053 · 2026-09-30 · Motion

**Context:** A refinement replaced the chart instantly, which made it hard to see what changed. No animation library (a dependency), and nothing may move for readers who prefer reduced motion.
**Decision:**
- **`useTween`** (`use-tween.ts`) eases from what was last drawn to the new target in 250 ms (ease-out cubic) with `requestAnimationFrame`.
  - It starts only when the data changes, not on a resize.
  - It runs in a layout effect, so the first frame is painted from the old position.
  - Bars (`BarMarks`), lines (`LineMarks`) and areas (`AreaMarks`) tween their pixel geometry against the new scales, and the axes switch at once. Bars are keyed by category and series, so a bar that stays moves and a new one fades in. Line and area points move point for point.
- **`transitionKind`** (`motion.ts`) chooses a crossfade instead when marks don't correspond: a different chart type, bars turned on their side, a change of stacking, different x values or series on a line or area, or any scatter.
  - `Chart` then keeps the old chart on top for 200 ms, fading out, while the new one fades in. The old one is `inert` and `aria-hidden`.
- **Reduced motion:** `useReducedMotion` follows `prefers-reduced-motion`. When set, nothing tweens and nothing crossfades; the chart simply changes. It also assumes reduced motion on the server.
**Consequences:** Tests drive the tween with fake animation frames. They check that the first frame after a change is the old one, that the chart settles within 300 ms, and that with reduced motion the new chart is final at once with no timers scheduled. The easing test fails if the tween is removed. An animation paused in a hidden tab finishes when the tab is shown again.

