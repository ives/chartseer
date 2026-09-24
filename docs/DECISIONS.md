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
**Decision:** `--chart-1` … `--chart-12` in `app/globals.css`, assigned in series order. Slots 1–8 are a validated categorical palette with separate light and dark steps; slots 9–12 (teal, brown, plum, olive) extend it, using the same values in both modes. The whole set passes lightness, chroma, adjacent-pair colour-blind separation and normal-vision checks against the app's actual backgrounds (`#ffffff`, `#0a0a0a`). In light mode three slots (aqua, yellow, pink) sit below 3:1 contrast with the background.
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
**Consequences:** Groups are drawn in order, so a later group covers an earlier one where points coincide. On the bikes station map, 25,132 hires fall on about 805 station positions, and Classic almost hides E-bike.

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
**Consequences:** One-off rendering is acceptable; resizing and the table view are sluggish. Options, not yet chosen: canvas above a point threshold (this loses per-point DOM for hover); drawing each distinct position once (the map has about 805); debouncing width changes; paginating or capping the table. Revisit before M5's responsive and accessibility pass.
