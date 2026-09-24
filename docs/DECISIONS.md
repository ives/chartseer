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
