# Chartseer

A conversational data-visualisation studio. Load a CSV, describe the chart you want in plain English, and get a chart back.

The model never writes code. It replies by calling a `renderChart` tool that returns a **chart spec** — strictly typed JSON defined in `lib/spec/schema.ts` — which is validated and then drawn by our own D3 components. The model decides what a chart says; the app decides how it looks.

> **Status:** work in progress. The spec contract (M1) is done; CSV parsing, column inference and data shaping are in place (M2, in progress). Charts, chat and `/api/chat` are not built yet. See the milestones in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#13-milestones).

## Getting started

Requires Node and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## URLs

These are all the URLs the app currently serves. Paths are relative to `http://localhost:3000` in development, or to the deployment (`chartseer.vercel.app`).

| URL | What it is |
|---|---|
| `/` | Home page. Currently a placeholder. |
| `/data/bikes.csv` | Demo dataset: Santander Cycles journeys, London (real TfL data, sampled). |
| `/data/gelato.csv` | Demo dataset: Gelateria Nebbia daily sales (invented data). |
| `/favicon.ico` | Site icon. |

Any other path returns a 404.

**Planned, not yet available:** `POST /api/chat` — the only server endpoint, which will stream the model's reply and a validated chart spec (M3). The directory `app/api/chat/` exists but has no route yet.

## Commands

```bash
pnpm dev             # local dev server
pnpm build           # production build
pnpm start           # serve the production build
pnpm test            # vitest run
pnpm typecheck       # next typegen && tsc --noEmit
pnpm lint            # eslint
pnpm try-spec <file> # run parseSpec on a { dataset, spec } JSON file
```

`try-spec` is the quickest way to check a hand-written spec against a demo dataset. Samples live in `scripts/specs/`:

```bash
pnpm try-spec scripts/specs/gelato-valid.json    # passes
pnpm try-spec scripts/specs/bikes-mistakes.json  # shows validation errors
```

## Demo data

Both datasets live in `public/data/` and are rebuilt by scripts in `scripts/`. Sources, licences, columns and the stories planted in the data are documented in [`docs/DATA.md`](docs/DATA.md).

The bikes data requires attribution wherever it is shown:
*Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016 and Geomni UK Map data © and database rights 2019.*

## Project layout

```
app/                  Routes. Wiring only; no business logic.
lib/spec/             The contract: ChartSpec schema, semantic validation, example specs.
lib/data/             CSV parsing, column inference, spec → chart data. Pure functions.
lib/ai/               Model selection, system prompt, tool definition. Server-only.
components/charts/    D3 renderers.
components/chat/      Chat UI.
docs/                 Architecture, decisions log, dataset notes.
scripts/              Dataset builders and the try-spec checker.
```

## Further reading

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — design, request lifecycle, the spec, validation, scope.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — why things are the way they are.
- [`docs/DATA.md`](docs/DATA.md) — the demo datasets.
- [`CLAUDE.md`](CLAUDE.md) — conventions and rules for working in this repo.
