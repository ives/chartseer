// Runs parseSpec on a hand-written spec and prints what the model would be told.
//
// Usage: pnpm try-spec <file.json>
// The file is { "dataset": "bikes" | "gelato", "spec": { ... } }; the dataset
// names one of the fixtures in lib/spec/fixtures.ts. Samples in scripts/specs/.
//
// Exit code: 0 valid, 1 invalid spec, 2 usage or file problem.

import { readFileSync } from "node:fs";
import { z } from "zod";
import { bikesSummary, gelatoSummary, parseSpec } from "../lib/spec";

const datasets = { bikes: bikesSummary, gelato: gelatoSummary };

const Input = z.strictObject({
  dataset: z.enum(["bikes", "gelato"], { error: 'dataset must be "bikes" or "gelato"' }),
  spec: z.unknown(),
});

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

const file = process.argv[2];
if (!file) fail("Usage: pnpm try-spec <file.json>");

let json: unknown;
try {
  json = JSON.parse(readFileSync(file, "utf8"));
} catch (error) {
  fail(`${file}: ${error instanceof Error ? error.message : String(error)}`);
}

const input = Input.safeParse(json);
if (!input.success) {
  fail(`${file}: ${input.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ")}`);
}

const result = parseSpec(input.data.spec, datasets[input.data.dataset]);
if (result.ok) {
  console.log("Valid");
  console.log(JSON.stringify(result.spec, null, 2));
} else {
  const count = result.errors.length;
  console.log(`${count} ${count === 1 ? "error" : "errors"}:`);
  result.errors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
  process.exitCode = 1;
}
