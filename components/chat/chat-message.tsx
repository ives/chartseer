import type { DatasetSummary } from "@/lib/spec";
import { type ChartseerMessage, specsIn, textOf } from "./messages";

// Text only. A drawn chart adds a short line saying so; failed attempts show
// nothing, as the model's own words explain them.
export function ChatMessage({ message, dataset }: { message: ChartseerMessage; dataset: DatasetSummary }) {
  const text = textOf(message);
  const drawn = specsIn(message, dataset);
  if (message.role === "user") {
    return (
      <li className="self-end max-w-[85%] rounded-lg bg-foreground px-3 py-2 text-sm whitespace-pre-wrap text-background">
        <span className="sr-only">You: </span>
        {text}
      </li>
    );
  }
  if (!text && drawn.length === 0) return null;
  return (
    <li className="max-w-[85%] text-sm">
      <span className="sr-only">Chartseer: </span>
      {text && <p className="whitespace-pre-wrap">{text}</p>}
      {drawn.map((spec, i) => (
        <p key={i} className="mt-1 text-xs text-muted">
          Drew: {spec.title}
        </p>
      ))}
    </li>
  );
}
