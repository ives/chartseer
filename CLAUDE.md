# Chartseer

A conversational data-visualisation studio. The user loads a CSV and describes a chart in plain English. The model replies by calling a tool that returns a **chart spec** — validated JSON — and our own D3 components render it.

@AGENTS.md

Read `docs/ARCHITECTURE.md` before changing anything in `lib/spec/` or `lib/ai/`.
Log any choice a future reader would ask "why?" about in `docs/DECISIONS.md`.

## Non-negotiables

- The model never generates, returns or executes code (JS, D3, SQL, HTML). Its only outputs are prose and the `renderChart` tool call.
- Every chart is described by one `ChartSpec`, defined once in `lib/spec/schema.ts` with Zod. The TypeScript type is inferred from it — never hand-write a parallel type.
- The full dataset never goes to the model. It receives a column summary and at most 10 sample rows.
- Chart components receive a validated spec and prepared data. They know nothing about AI, chat or the network.
- The model decides what a chart means, never how it looks: no colours, fonts or pixel sizes in the spec.
- Out of scope: user accounts, database, saved projects, Excel parsing, collaboration. See the scope fence in `docs/ARCHITECTURE.md`.

## Layout

```
app/                  Routes. Wires things together; no business logic.
  api/chat/route.ts   The only server endpoint.
lib/spec/             The contract: schema, semantic validation, example specs. Depends only on zod.
lib/data/             CSV parsing, column inference, spec → chart data. Pure functions.
lib/ai/               Model selection, system prompt, tool definition. Server-only.
components/charts/    D3 renderers. Import types from lib/spec only.
components/chat/      Chat UI.
components/ui/        shadcn/ui primitives. Generated; edit sparingly.
```

Imports flow one way: `app → components, lib/ai → lib/data → lib/spec`.
Nothing imports from `app/`. `components/charts/` never imports from `lib/ai/`.

## Commands

```
pnpm dev          # local dev server
pnpm build        # production build
pnpm test         # vitest run
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm try-spec <f> # run parseSpec on a { dataset, spec } JSON file (samples in scripts/specs/)
```

## Conventions

- TypeScript `strict` and `noUncheckedIndexedAccess`. No `any` — use `unknown` and narrow.
- Named exports. One component per file. kebab-case file names (matches shadcn).
- React owns the DOM; D3 does the maths (scales, shapes, ticks). Don't use `d3.select` on React-rendered nodes, except inside a ref'd `<g>` for axes.
- Switches over `spec.type` end with an exhaustive `never` check.
- Chart colours come from CSS variables, so dark mode needs no JS.
- Pure functions in `lib/` get Vitest tests beside them (`*.test.ts`).
- British English in UI copy and docs; US spelling in code identifiers (`color`), to match CSS and libraries.

## How to work in this repo

- Start any non-trivial task in plan mode and wait for approval before editing.
- One concern per change. Don't refactor unrelated code in passing.
- Prefer the simplest thing that works. No new abstraction, option or generalisation until a second real use case exists.
- Ask before adding a dependency.
- Before calling a task done, run `pnpm typecheck`, `pnpm test` and `pnpm lint`. Report anything that failed or couldn't be run.
- AI SDK APIs change between major versions. Check the installed version and its docs before writing AI SDK code; don't rely on memory.
- Secrets live only in `.env.local`. Never print, log or commit them.