// Sends natural-language requests through lib/ai against the real demo data
// and reports how often the model produces a valid spec (ARCHITECTURE §12).
// Also measures the tool schema, rules and dataset summaries in tokens.
//
// Usage: pnpm check-prompts
// Makes about 29 live model calls; the token counts are free. Reads
// ANTHROPIC_API_KEY from .env.local. Never runs in the test suite.
// Full results go to scripts/reports/ (git-ignored).
//
// Exit code: 0 once every case has run, 1 if a case hit an API error.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { UIMessage } from "ai";
import { type ChatRequest, parseChatRequest, streamChart } from "../lib/ai/chat";
import { buildSystemPrompt } from "../lib/ai/prompt";
import { getModel } from "../lib/ai/provider";
import { RENDER_CHART_DESCRIPTION, RENDER_CHART_SCHEMA } from "../lib/ai/tools";
import { datasets } from "../lib/data/datasets";
import { inferDataset } from "../lib/data/infer";
import { parseCsv, readCsv } from "../lib/data/parse";
import { type ChartSpec, type DatasetSummary, type ParseResult, examples } from "../lib/spec";

type BundledId = keyof typeof datasets;
// "market" is a small uploaded-style file built below (D-048).
type DatasetId = BundledId | "market";
type Kind = "plain" | "refinement" | "vague" | "misspelt" | "impossible" | "off-topic" | "undo" | "upload";
type Expect = "chart" | "no-chart" | "either";
type Case = {
  dataset: DatasetId;
  kind: Kind;
  prompt: string;
  current?: string;
  // Earlier turns, each a request and the example spec it drew.
  earlier?: { prompt: string; drew: string }[];
  // The example spec the user undid back to before sending (D-044). It is also the current spec.
  backTo?: string;
  expect: Expect;
  // A chart only meets the expectation if it passes this too.
  check?: (spec: ChartSpec) => boolean;
};
type Outcome = "valid first time" | "valid after retry" | "failed" | "no chart" | "api error";

// `current` names a spec in lib/spec/examples.ts to refine. Those specs pass
// against the real data (see the dev gallery), so no case depends on another.
const CASES: Case[] = [
  { dataset: "gelato", kind: "plain", prompt: "Daily revenue by shop in 2025", expect: "chart" },
  { dataset: "gelato", kind: "plain", prompt: "Scoops against peak temperature", expect: "chart" },
  { dataset: "gelato", kind: "plain", prompt: "Which flavours bring in the most revenue? Top 5", expect: "chart" },
  { dataset: "gelato", kind: "plain", prompt: "Monthly scoops of sorbet versus gelato", expect: "chart" },
  { dataset: "gelato", kind: "refinement", prompt: "Make it stacked", current: "gelato-weekly-2025", expect: "chart" },
  { dataset: "gelato", kind: "refinement", prompt: "Only Brixton", current: "gelato-monthly-revenue", expect: "chart" },
  { dataset: "gelato", kind: "refinement", prompt: "Show it weekly as a line", current: "gelato-monthly-revenue", expect: "chart" },
  { dataset: "gelato", kind: "vague", prompt: "What sells best?", expect: "either" },
  { dataset: "gelato", kind: "vague", prompt: "Anything interesting about the weather?", expect: "either" },
  { dataset: "gelato", kind: "misspelt", prompt: "Monthly revenue for Amalfi Lemno", expect: "chart" },
  { dataset: "gelato", kind: "impossible", prompt: "A pie chart of flavours", expect: "either" },
  { dataset: "gelato", kind: "off-topic", prompt: "What's the capital of France?", expect: "no-chart" },
  {
    dataset: "gelato",
    kind: "undo",
    prompt: "Make it stacked",
    earlier: [
      { prompt: "Weekly scoops by shop in 2025", drew: "gelato-weekly-2025" },
      { prompt: "Revenue by flavour instead", drew: "gelato-revenue-by-flavour" },
    ],
    backTo: "gelato-weekly-2025",
    expect: "chart",
    // Built on the weekly chart the user went back to, not the later revenue one.
    check: (spec) =>
      spec.type !== "scatter" && spec.x.field === "date" && "field" in spec.y && spec.y.field === "scoops" && spec.series?.field === "shop",
  },

  // An uploaded-style file: UK dates, £ amounts and a column name the model can't know (D-048).
  {
    dataset: "market",
    kind: "upload",
    prompt: "Weekly takings by stall",
    expect: "chart",
    check: (spec) =>
      spec.type !== "scatter" &&
      spec.x.field === "date" &&
      spec.x.timeUnit === "week" &&
      "field" in spec.y &&
      spec.y.field === "takings" &&
      spec.y.aggregate === "sum" &&
      spec.series?.field === "stall",
  },
  {
    dataset: "market",
    kind: "upload",
    prompt: "Nobbles sold per day at the Cheese stall",
    expect: "chart",
    check: (spec) =>
      "field" in spec.y &&
      spec.y.field === "nobbles_sold" &&
      (spec.filters ?? []).some(
        (f) => f.field === "stall" && ((f.op === "eq" && f.value === "Cheese") || (f.op === "in" && f.values.join() === "Cheese")),
      ),
  },
  {
    dataset: "market",
    kind: "upload",
    prompt: "Takings for the first half of March only",
    expect: "chart",
    // ISO bounds, although the file's dates are DD/MM/YYYY. "First half"
    // of a 31-day month may reasonably end on the 14th, 15th or 16th.
    check: (spec) => {
      const date = (spec.filters ?? []).filter((f) => f.field === "date");
      const bound = (ops: string[], values: string[]) => date.some((f) => ops.includes(f.op) && "value" in f && values.includes(String(f.value)));
      return (
        bound(["gte", "gt"], ["2025-03-01", "2025-02-28"]) &&
        bound(["lte", "lt"], ["2025-03-14", "2025-03-15", "2025-03-16", "2025-03-17"])
      );
    },
  },

  { dataset: "bikes", kind: "plain", prompt: "Journeys by hour of day, weekdays against weekends", expect: "chart" },
  { dataset: "bikes", kind: "plain", prompt: "The 10 busiest start areas", expect: "chart" },
  { dataset: "bikes", kind: "plain", prompt: "Map the start stations", expect: "chart" },
  // A starter chip (D-045, D-051): one point per day, two measures.
  {
    dataset: "bikes",
    kind: "plain",
    prompt: "Daily journeys against median hire length, weekdays and weekends",
    expect: "chart",
    check: (spec) =>
      spec.type === "scatter" &&
      spec.per?.field === "date" &&
      [spec.x, spec.y].some((a) => a.aggregate === "count") &&
      [spec.x, spec.y].some((a) => a.field === "duration_min" && a.aggregate !== undefined && a.aggregate !== "count"),
  },
  { dataset: "bikes", kind: "plain", prompt: "Median hire length by bike type", expect: "chart" },
  { dataset: "bikes", kind: "refinement", prompt: "Split it by bike type instead", current: "bikes-hourly-by-day-type", expect: "chart" },
  { dataset: "bikes", kind: "refinement", prompt: "Horizontal, top 5 only", current: "bikes-busiest-areas", expect: "chart" },
  { dataset: "bikes", kind: "refinement", prompt: "Just the summer", current: "bikes-busiest-areas", expect: "either" },
  { dataset: "bikes", kind: "vague", prompt: "When do people ride?", expect: "either" },
  { dataset: "bikes", kind: "vague", prompt: "Show me something about e-bikes", expect: "either" },
  { dataset: "bikes", kind: "misspelt", prompt: "Journeys starting in Sohoo, by hour", expect: "chart" },
  { dataset: "bikes", kind: "impossible", prompt: "Revenue per hire", expect: "either" },
  { dataset: "bikes", kind: "off-topic", prompt: "Hello", expect: "no-chart" },
];

type Result = Case & {
  outcome: Outcome;
  attempts: number;
  expectMet: boolean;
  errors: string[][];
  title: string | null;
  spec: ChartSpec | null;
  text: string;
  tokens: { input: number; cacheRead: number; cacheWrite: number; output: number };
  firstChunkMs: number | null;
  totalMs: number;
  apiError?: string;
};

// A market with three stalls over March and April 2025, as a user might
// upload it: DD/MM/YYYY dates (some days over 12, so they read day-first),
// "£1,234.50" takings, and nobbles_sold, a name the model can't know.
// Deterministic, and read through the same path as an upload.
function marketSummary(): DatasetSummary {
  const stalls = ["Cheese", "Flowers", "Bakery"];
  const lines = ["date,stall,takings,nobbles_sold"];
  for (let day = 0; day < 61; day++) {
    const date = new Date(Date.UTC(2025, 2, 1 + day));
    const dmy = `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/2025`;
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    stalls.forEach((stall, i) => {
      const takings = 500 + i * 300 + ((day * 37 + i * 11) % 400) + (weekend ? 350 : 0) + 0.5;
      const pounds = takings.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      lines.push(`${dmy},${stall},"£${pounds}",${(day * 7 + i * 3) % 23}`);
    });
  }
  const read = readCsv(lines.join("\n") + "\n");
  if (!read.ok) throw new Error(`market.csv: ${read.message}`);
  return inferDataset(read.csv).summary;
}

function loadSummary(id: BundledId): DatasetSummary {
  const csv = readFileSync(`public/data/${id}.csv`, "utf8");
  return inferDataset(parseCsv(csv), datasets[id]).summary;
}

function exampleSpec(id: string): ChartSpec {
  const example = examples.find((e) => e.id === id);
  if (!example) throw new Error(`No example spec "${id}"`);
  return example.spec;
}

// Anthropic's token counter: free, and exact for what we send. Each part's
// size is the difference between a count with it and one without.
async function countTokens(model: string, extra: { system?: string; tools?: unknown[] }): Promise<number> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set; is .env.local present?");
  const response = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: "Hi" }], ...extra }),
  });
  if (!response.ok) throw new Error(`count_tokens: ${response.status} ${await response.text()}`);
  const { input_tokens } = (await response.json()) as { input_tokens: number };
  return input_tokens;
}

async function measure(model: string, summaries: Record<DatasetId, DatasetSummary>) {
  const tool = { name: "renderChart", description: RENDER_CHART_DESCRIPTION, input_schema: RENDER_CHART_SCHEMA };
  const base = await countTokens(model, {});
  const tools = (await countTokens(model, { tools: [tool] })) - base;
  const rules = (await countTokens(model, { system: buildSystemPrompt(summaries.gelato, null).rules })) - base;
  const dataset: Record<string, number> = {};
  for (const id of Object.keys(summaries) as DatasetId[]) {
    dataset[id] = (await countTokens(model, { system: buildSystemPrompt(summaries[id], null).dataset })) - base;
  }
  return { tools, rules, dataset, schemaBytes: JSON.stringify(RENDER_CHART_SCHEMA).length };
}

// The conversation so far, as the browser would send it: earlier requests and
// the charts they drew, then this prompt, after a back-to event if there is one.
function conversation(c: Case): UIMessage[] {
  const earlier = (c.earlier ?? []).flatMap(({ prompt, drew }, i): UIMessage[] => {
    const spec = exampleSpec(drew);
    return [
      { id: `u${i}`, role: "user", parts: [{ type: "text", text: prompt }] },
      {
        id: `a${i}`,
        role: "assistant",
        parts: [
          { type: "tool-renderChart", toolCallId: `call-${i}`, state: "output-available", input: { spec }, output: { ok: true, spec } },
        ],
      },
    ];
  });
  const backTo = c.backTo ? [{ type: "data-back-to" as const, data: { title: exampleSpec(c.backTo).title } }] : [];
  return [...earlier, { id: "m", role: "user", parts: [...backTo, { type: "text", text: c.prompt }] }];
}

async function runCase(c: Case, dataset: DatasetSummary): Promise<Result> {
  // Checked as /api/chat would, so a case can't send what the app couldn't.
  const current = c.backTo ?? c.current;
  const parsed = await parseChatRequest({ messages: conversation(c), dataset, currentSpec: current ? exampleSpec(current) : null });
  if (!parsed.ok) throw new Error(`Case "${c.prompt}": ${parsed.errors.join("; ")}`);
  const request: ChatRequest = parsed.request;
  const started = performance.now();
  let firstChunkMs: number | null = null;
  let apiError: string | undefined;

  const result = await streamChart(request);
  for await (const part of result.stream) {
    if (firstChunkMs === null && (part.type === "text-delta" || part.type === "tool-input-start")) {
      firstChunkMs = performance.now() - started;
    }
    if (part.type === "error") apiError = part.error instanceof Error ? part.error.message : String(part.error);
  }
  const totalMs = performance.now() - started;
  const steps = await result.steps;
  const usage = await result.totalUsage;

  const outputs: ParseResult[] = steps.flatMap((step) => step.toolResults).flatMap((r) => (r.dynamic ? [] : [r.output]));
  const valid = outputs.find((o) => o.ok);
  const outcome: Outcome = apiError
    ? "api error"
    : outputs.length === 0
      ? "no chart"
      : outputs[0]?.ok
        ? "valid first time"
        : valid
          ? "valid after retry"
          : "failed";
  const drew = valid !== undefined;
  const expectMet =
    (c.expect === "either" ? outcome !== "api error" : c.expect === "chart" ? drew : outcome === "no chart") &&
    (!c.check || (valid?.ok === true && c.check(valid.spec)));

  return {
    ...c,
    outcome,
    attempts: outputs.length,
    expectMet,
    errors: outputs.flatMap((o) => (o.ok ? [] : [o.errors])),
    title: valid?.ok ? valid.spec.title : null,
    spec: valid?.ok ? valid.spec : null,
    text: steps.map((step) => step.text).join("").trim(),
    tokens: {
      input: usage.inputTokens ?? 0,
      cacheRead: usage.inputTokenDetails.cacheReadTokens ?? 0,
      cacheWrite: usage.inputTokenDetails.cacheWriteTokens ?? 0,
      output: usage.outputTokens ?? 0,
    },
    firstChunkMs,
    totalMs,
    ...(apiError && { apiError }),
  };
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
}

function summarise(results: Result[]) {
  const count = (outcome: Outcome) => results.filter((r) => r.outcome === outcome).length;
  const chartCases = results.filter((r) => r.attempts > 0);
  const sum = (pick: (r: Result) => number) => results.reduce((total, r) => total + pick(r), 0);
  const input = sum((r) => r.tokens.input);
  return {
    cases: results.length,
    validFirstTime: count("valid first time"),
    validAfterRetry: count("valid after retry"),
    failed: count("failed"),
    noChart: count("no chart"),
    apiErrors: count("api error"),
    firstTimeRate: chartCases.length ? count("valid first time") / chartCases.length : 0,
    expectMet: results.filter((r) => r.expectMet).length,
    tokens: {
      input,
      cacheRead: sum((r) => r.tokens.cacheRead),
      cacheWrite: sum((r) => r.tokens.cacheWrite),
      output: sum((r) => r.tokens.output),
      cacheReadShare: input ? sum((r) => r.tokens.cacheRead) / input : 0,
    },
    ms: { median: percentile(results.map((r) => r.totalMs), 50), p90: percentile(results.map((r) => r.totalMs), 90) },
  };
}

const pad = (value: string | number, width: number) => String(value).slice(0, width).padEnd(width);
const pct = (share: number) => `${Math.round(share * 100)}%`;

function printTable(results: Result[]) {
  const header = [pad("#", 3), pad("dataset", 7), pad("kind", 10), pad("outcome", 17), pad("ok?", 3), pad("input", 6), pad("cached", 6), pad("out", 4), pad("ms", 6), "title / reply"];
  console.log(header.join(" "));
  results.forEach((r, i) => {
    const note = r.title ?? r.apiError ?? r.text.replace(/\s+/g, " ");
    console.log(
      [
        pad(i + 1, 3),
        pad(r.dataset, 7),
        pad(r.kind, 10),
        pad(r.outcome, 17),
        pad(r.expectMet ? "yes" : "NO", 3),
        pad(r.tokens.input, 6),
        pad(r.tokens.cacheRead, 6),
        pad(r.tokens.output, 4),
        pad(Math.round(r.totalMs), 6),
        note.slice(0, 70),
      ].join(" "),
    );
    r.errors.forEach((attempt, n) => attempt.forEach((error) => console.log(`${" ".repeat(8)}attempt ${n + 1}: ${error}`)));
  });
}

function printSummary(label: string, s: ReturnType<typeof summarise>) {
  console.log(
    `${label}: ${s.validFirstTime} valid first time, ${s.validAfterRetry} after retry, ${s.failed} failed, ${s.noChart} no chart, ${s.apiErrors} API errors` +
      ` · first-time rate ${pct(s.firstTimeRate)} of charting cases · expectations met ${s.expectMet}/${s.cases}` +
      ` · input ${s.tokens.input} (${pct(s.tokens.cacheReadShare)} cache reads, ${s.tokens.cacheWrite} cache writes), output ${s.tokens.output}` +
      ` · median ${Math.round(s.ms.median)} ms, p90 ${Math.round(s.ms.p90)} ms`,
  );
}

async function main() {
  const model = getModel().modelId;
  const summaries: Record<DatasetId, DatasetSummary> = {
    gelato: loadSummary("gelato"),
    bikes: loadSummary("bikes"),
    market: marketSummary(),
  };
  const startedAt = new Date();

  const sizes = await measure(model, summaries);
  console.log(`Model ${model}`);
  console.log(
    `Tokens · tool schema ${sizes.tools} (${sizes.schemaBytes} bytes of JSON Schema, incl. Anthropic's tool-use overhead)` +
      ` · rules ${sizes.rules} · dataset gelato ${sizes.dataset.gelato}, bikes ${sizes.dataset.bikes}, market ${sizes.dataset.market}\n`,
  );

  // A progress line, only when a terminal can overwrite it.
  const progress = (line: string) => process.stdout.isTTY && process.stdout.write(line.padEnd(80).slice(0, 80) + "\r");
  const results: Result[] = [];
  for (const c of CASES) {
    progress(`${results.length + 1}/${CASES.length} ${c.dataset}: ${c.prompt}`);
    results.push(await runCase(c, summaries[c.dataset]));
  }
  progress("");

  printTable(results);
  console.log();
  const summary = {
    overall: summarise(results),
    gelato: summarise(results.filter((r) => r.dataset === "gelato")),
    bikes: summarise(results.filter((r) => r.dataset === "bikes")),
    market: summarise(results.filter((r) => r.dataset === "market")),
  };
  printSummary("gelato ", summary.gelato);
  printSummary("bikes  ", summary.bikes);
  printSummary("market ", summary.market);
  printSummary("overall", summary.overall);

  mkdirSync("scripts/reports", { recursive: true });
  const file = `scripts/reports/check-prompts-${startedAt.toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify({ startedAt, model, sizes, summary, results }, null, 2) + "\n");
  console.log(`\nFull results: ${file}`);

  if (summary.overall.apiErrors > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
