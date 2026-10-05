"use client";

import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";
import { type DatasetSummary, MAX_CONVERSATION_MESSAGES } from "@/lib/spec";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { type Limit, friendlyError, limitMessage, limitOf } from "./error-message";
import { type ChartseerMessage, specsIn, textOf } from "./messages";
import { useOnline } from "./use-online";

type ChatPanelProps = {
  messages: ChartseerMessage[];
  // Null while the dataset loads.
  dataset: DatasetSummary | null;
  status: ChatStatus;
  error: Error | undefined;
  busy: boolean;
  onSend: (text: string) => void;
  onRetry: () => void;
  // Clears the chat and chart, keeping the dataset.
  onNewChat: () => void;
  // Set when this panel replaces a full chat, whose button had the focus.
  focusOnMount?: boolean;
};

// Limits that a fresh conversation gets round.
const NEW_CHAT_FIXES: Limit[] = ["conversation_full", "too_large"];

export function ChatPanel({ messages, dataset, status, error, busy, onSend, onRetry, onNewChat, focusOnMount = false }: ChatPanelProps) {
  const online = useOnline();
  const input = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const wasBusy = useRef(false);
  const limit = error ? limitOf(error) : null;
  // The next message would take the chat over its limit, so it isn't offered (D-063).
  const full = messages.length >= MAX_CONVERSATION_MESSAGES;

  // A new chat starts with the cursor in the input, once, as soon as the
  // input is enabled: a demo dataset loads again first.
  const focusFirst = useRef(focusOnMount);
  useEffect(() => {
    if (!focusFirst.current || !dataset) return;
    focusFirst.current = false;
    input.current?.focus();
  }, [dataset]);

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
        {limit && !full && <LimitNotice limit={limit} onNewChat={onNewChat} />}
        {error && !limit && (
          <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-danger">
            <span>{friendlyError(error, online)}</span>
            <button
              type="button"
              onClick={onRetry}
              className="rounded border border-border px-2 py-0.5 text-foreground"
            >
              Try again
            </button>
          </div>
        )}
      </div>
      <p role="status" className="sr-only">
        {announcement(messages, status, dataset)}
      </p>
      {!online && (
        <p role="alert" className="border-t border-border px-3 pt-2 text-sm text-muted">
          You’re offline. Chartseer will work again when your connection is back.
        </p>
      )}
      {/* Offline, typing still works; sending waits, as while a reply streams. */}
      {/* On a phone the input is pinned to the bottom of the screen, so it is
          always within reach below the chart (D-055). */}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-surface pb-[env(safe-area-inset-bottom)] md:static md:z-auto md:rounded-b-lg md:pb-0">
        {full ? (
          <div className="border-t border-border p-3">
            <LimitNotice limit="conversation_full" onNewChat={onNewChat} />
          </div>
        ) : (
          <ChatInput ref={input} onSend={onSend} busy={busy || !online} disabled={!dataset} />
        )}
      </div>
    </section>
  );
}

// A limit reads as an error, but with no "Try again", which can't help. A
// fresh chat gets round some of them (D-063).
function LimitNotice({ limit, onNewChat }: { limit: Limit; onNewChat: () => void }) {
  return (
    <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-danger first:mt-0">
      <span>{limitMessage(limit)}</span>
      {NEW_CHAT_FIXES.includes(limit) && (
        <button type="button" onClick={onNewChat} className="rounded-md bg-accent px-3 py-1 font-medium text-accent-foreground">
          Start a new chat
        </button>
      )}
    </div>
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
