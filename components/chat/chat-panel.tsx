"use client";

import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";
import type { DatasetSummary } from "@/lib/spec";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { friendlyError } from "./error-message";
import { type ChartseerMessage, specsIn, textOf } from "./messages";

type ChatPanelProps = {
  messages: ChartseerMessage[];
  // Null while the dataset loads.
  dataset: DatasetSummary | null;
  status: ChatStatus;
  error: Error | undefined;
  busy: boolean;
  onSend: (text: string) => void;
  onRetry: () => void;
};

export function ChatPanel({ messages, dataset, status, error, busy, onSend, onRetry }: ChatPanelProps) {
  const input = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const wasBusy = useRef(false);

  // Focus returns to the input after each reply, or after an error.
  useEffect(() => {
    if (wasBusy.current && !busy) input.current?.focus();
    wasBusy.current = busy;
  }, [busy]);

  // Keep the newest message in view as the reply streams.
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages]);

  return (
    <section aria-label="Chat" className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-surface">
      <div ref={list} className="min-h-0 flex-1 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">Describe the chart you want, and follow up to refine it.</p>
        ) : (
          // Not a live region: streamed text would be read out word by word.
          // The status line below announces each finished reply instead.
          <ol className="flex flex-col gap-3">
            {dataset && messages.map((message) => <ChatMessage key={message.id} message={message} dataset={dataset} />)}
          </ol>
        )}
        {error && (
          <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-danger">
            <span>{friendlyError(error)}</span>
            <button
              type="button"
              onClick={onRetry}
              className="rounded border border-border px-2 py-0.5 text-foreground focus-visible:outline-2 focus-visible:outline-foreground"
            >
              Try again
            </button>
          </div>
        )}
      </div>
      <p role="status" className="sr-only">
        {announcement(messages, status, dataset)}
      </p>
      <ChatInput ref={input} onSend={onSend} busy={busy} disabled={!dataset} />
    </section>
  );
}

// What the status line says. Errors are announced by their own alert.
function announcement(messages: ChartseerMessage[], status: ChatStatus, dataset: DatasetSummary | null): string {
  if (status === "submitted" || status === "streaming") return "Working on it…";
  const last = messages.at(-1);
  if (status !== "ready" || !dataset || last?.role !== "assistant") return "";
  const drawn = specsIn(last, dataset).map((spec) => `Chart drawn: ${spec.title}.`);
  return [textOf(last), ...drawn].filter(Boolean).join(" ");
}
