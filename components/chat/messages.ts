import type { ChatStatus, UIMessage } from "ai";
import { type ChartSpec, type DatasetSummary, type ParseResult, parseSpec } from "@/lib/spec";

// A chat message as the client sees it. The tool's types come from lib/spec;
// client code never imports lib/ai.
export type ChartseerMessage = UIMessage<never, never, { renderChart: { input: unknown; output: ParseResult } }>;

// What each request needs besides the messages.
export type RequestContext = { dataset: DatasetSummary; currentSpec: ChartSpec | null };

// Exactly what /api/chat accepts. The SDK's default body adds id, trigger and
// messageId, which the server's strict schema rejects (D-035).
export function buildChatBody(messages: ChartseerMessage[], { dataset, currentSpec }: RequestContext) {
  return { messages, dataset, currentSpec };
}

// The specs one message drew: renderChart results that are ok and still pass
// parseSpec against the loaded dataset, so a broken spec never reaches a chart.
export function specsIn(message: ChartseerMessage, dataset: DatasetSummary): ChartSpec[] {
  if (message.role !== "assistant") return [];
  return message.parts.flatMap((part) => {
    if (part.type !== "tool-renderChart" || part.state !== "output-available" || !part.output.ok) return [];
    const checked = parseSpec(part.output.spec, dataset);
    return checked.ok ? [checked.spec] : [];
  });
}

// Every chart drawn in this conversation, oldest first. The current chart is
// the last one. Derived from the messages, so it can't drift from them.
export function chartHistory(messages: ChartseerMessage[], dataset: DatasetSummary): ChartSpec[] {
  return messages.flatMap((message) => specsIn(message, dataset));
}

// True while the model is writing a renderChart call, or the server is checking it.
export function isDrawing(messages: ChartseerMessage[], status: ChatStatus): boolean {
  if (status !== "submitted" && status !== "streaming") return false;
  const last = messages.at(-1);
  return (
    last?.role === "assistant" &&
    last.parts.some(
      (part) => part.type === "tool-renderChart" && (part.state === "input-streaming" || part.state === "input-available"),
    )
  );
}

export function textOf(message: ChartseerMessage): string {
  return message.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("")
    .trim();
}
