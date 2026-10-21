"use client";

import type { ChatStatus } from "ai";
import { useEffect, useRef } from "react";
import { type DatasetSummary, MAX_CONVERSATION_MESSAGES } from "@/lib/spec";
import { ChatInput } from "./chat-input";
import { type ChartLinks, ChatMessage, type DrawnChart } from "./chat-message";
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
  // What the chips need to show a chart of the history (task 03).
  links: ChartLinks;
  // What is sent to the AI, said before the first message.
  privacyNote: string;
};

// Limits that a fresh conversation gets round.
const NEW_CHAT_FIXES: Limit[] = ["conversation_full", "too_large"];

export function ChatPanel({
  messages,
  dataset,
  status,
  error,
  busy,
  onSend,
  onRetry,
  onNewChat,
  focusOnMount = false,
  links,
  privacyNote,
}: ChatPanelProps) {
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
    <section
      aria-label="Chat"
      className="flex min-h-[560px] flex-1 flex-col rounded-[18px] border border-border-card bg-surface-chat md:min-h-0 md:overflow-hidden md:rounded-[20px]"
    >
      <div ref={list} className="min-h-0 flex-1 px-3.5 pt-[18px] pb-5 md:overflow-y-auto md:px-6 md:pt-6 md:pb-3">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2 text-sm leading-relaxed">
            <p>Describe the chart you want, and follow up to refine it.</p>
            <p className="text-muted">{privacyNote}</p>
          </div>
        ) : (
          // Not a live region: streamed text would be read out word by word.
          // The status line below announces each finished reply instead.
          <ol className="flex flex-col gap-4 md:gap-[18px]">
            {dataset &&
              drawnPerMessage(messages, dataset).map(({ message, drawn }) => (
                <ChatMessage key={message.id} message={message} drawn={drawn} links={links} />
              ))}
          </ol>
        )}
        {limit && !full && <LimitNotice limit={limit} onNewChat={onNewChat} />}
        {error && !limit && (
          <div role="alert" className={`mt-4 ${NOTICE}`}>
            <span>{friendlyError(error, online)}</span>
            <button type="button" onClick={onRetry} className={SECONDARY_BUTTON}>
              Try again
            </button>
          </div>
        )}
      </div>
      <p role="status" className="sr-only">
        {announcement(messages, status, dataset)}
      </p>
      {!online && (
        <p role="alert" className="mx-3.5 mb-3 rounded-xl border border-border-card bg-card px-3 py-2 text-sm text-secondary md:mx-4 md:mb-0">
          You’re offline. Chartseer will work again when your connection is back.
        </p>
      )}
      {/* Offline, typing still works; sending waits, as while a reply streams. */}
      {/* On a phone the input is pinned to the bottom of the screen, so it is
          always within reach below the chart (D-055). */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border-card bg-page/94 px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-12px_28px_-16px_rgba(17,17,16,0.18)] backdrop-blur-sm md:static md:z-auto md:border-0 md:bg-transparent md:px-4 md:pt-3 md:pb-4 md:shadow-none md:backdrop-blur-none">
        {full ? (
          <LimitNotice limit="conversation_full" onNewChat={onNewChat} />
        ) : (
          <ChatInput ref={input} onSend={onSend} busy={busy || !online} disabled={!dataset} />
        )}
      </div>
    </section>
  );
}

const NOTICE =
  "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border-card bg-card px-3.5 py-3 text-sm text-danger";
const SECONDARY_BUTTON =
  "min-h-11 rounded-xl border border-border bg-card px-3.5 font-medium text-foreground hover:border-border-strong md:min-h-10";

// Each message with the charts it drew, numbered by their place in the chart history.
function drawnPerMessage(messages: ChartseerMessage[], dataset: DatasetSummary) {
  let next = 0;
  return messages.map((message) => {
    const drawn: DrawnChart[] = specsIn(message, dataset).map((spec) => ({ index: next++, spec }));
    return { message, drawn };
  });
}

// A limit reads as an error, but with no "Try again", which can't help. A
// fresh chat gets round some of them (D-063).
function LimitNotice({ limit, onNewChat }: { limit: Limit; onNewChat: () => void }) {
  return (
    <div role="alert" className={`mt-4 first:mt-0 ${NOTICE}`}>
      <span>{limitMessage(limit)}</span>
      {NEW_CHAT_FIXES.includes(limit) && (
        <button
          type="button"
          onClick={onNewChat}
          className="min-h-11 rounded-xl bg-accent px-4 font-medium text-accent-foreground md:min-h-10"
        >
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
