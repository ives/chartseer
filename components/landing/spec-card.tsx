import { examples } from "@/lib/spec/examples";
import { Icon } from "./icon";

type Json = string | number | { [key: string]: Json };

const example = examples.find((e) => e.id === "bikes-hourly-by-day-type")?.spec;
if (example?.type !== "line" || !example.series || !("aggregate" in example.y)) {
  throw new Error("The spec card's example has changed shape");
}

// The real example spec, trimmed to the lines that tell the story. A test
// checks it still passes parseSpec against the bikes dataset (D-068).
export const shownSpec = {
  version: example.version,
  type: example.type,
  title: example.title,
  x: { field: example.x.field },
  y: { aggregate: example.y.aggregate },
  series: { field: example.series.field },
} satisfies Record<string, Json>;

function Value({ value }: { value: Json }) {
  if (typeof value === "string") return <span className="text-code-string">{JSON.stringify(value)}</span>;
  if (typeof value === "number") return <>{value}</>;
  const entries = Object.entries(value);
  return (
    <>
      {"{ "}
      {entries.map(([key, inner], i) => (
        <span key={key}>
          <span className="text-accent-on-dark">{JSON.stringify(key)}</span>: <Value value={inner} />
          {i < entries.length - 1 && ", "}
        </span>
      ))}
      {" }"}
    </>
  );
}

const checks = ["Structure checked", "Columns exist", "Values match your data"];

export function SpecCard() {
  const entries = Object.entries(shownSpec);
  return (
    <div className="min-w-0 basis-[456px] grow rounded-[20px] bg-ink-panel p-1.5 shadow-panel md:rounded-[22px] md:p-2">
      <div className="flex items-center justify-between gap-3 px-3 pt-2.5 pb-3 md:px-4 md:pt-3 md:pb-3.5">
        <span className="font-mono text-xs text-on-dark-subtle md:text-[13px]">chart-spec.json</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-on-dark/14 px-[9px] py-[3px] text-xs font-medium text-accent-on-dark md:px-2.5 md:py-1">
          <Icon name="check" size={12} strokeWidth={2.5} />
          Validated
        </span>
      </div>
      {/* Long strings wrap on phones. Focusable, in case a line still overflows. */}
      <pre
        role="region"
        tabIndex={0}
        aria-label="An example chart spec"
        className="overflow-x-auto rounded-[15px] bg-ink-code [color-scheme:dark] whitespace-pre-wrap break-words md:whitespace-pre px-4 py-[18px] font-mono text-xs leading-[1.75] text-code-text md:rounded-2xl md:p-6 md:text-sm"
      >
        {"{\n"}
        {entries.map(([key, value], i) => (
          <span key={key}>
            {"  "}
            <span className="text-accent-on-dark">{JSON.stringify(key)}</span>: <Value value={value} />
            {i < entries.length - 1 ? ",\n" : "\n"}
          </span>
        ))}
        {"}"}
      </pre>
      <ul className="flex flex-col gap-1.5 px-3 pt-3.5 pb-2.5 text-[13px] text-on-dark-subtle md:flex-row md:flex-wrap md:gap-x-5 md:gap-y-2 md:px-4 md:pt-4 md:pb-3">
        {checks.map((check) => (
          <li key={check} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="text-accent-on-dark">
              ✓
            </span>
            {check}
          </li>
        ))}
      </ul>
    </div>
  );
}
