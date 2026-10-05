"use client";

import { type KeyboardEvent, type Ref, useId, useState } from "react";
import { MAX_MESSAGE_CHARS } from "@/lib/spec";

// The count appears once a message is this close to the limit (D-062).
const COUNT_FROM = MAX_MESSAGE_CHARS - 200;

type ChatInputProps = {
  onSend: (text: string) => void;
  // A reply is streaming: typing is fine, sending waits.
  busy: boolean;
  // No dataset yet.
  disabled: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

// Enter sends; Shift+Enter starts a new line. The textarea stays enabled while
// a reply streams, so it keeps focus.
export function ChatInput({ onSend, busy, disabled, ref }: ChatInputProps) {
  const [text, setText] = useState("");
  const id = useId();
  const countId = useId();
  const canSend = !busy && !disabled && text.trim() !== "";

  function send() {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter during an IME composition confirms the composition, not the message.
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    send();
  }

  return (
    <form
      className="flex items-end gap-2 border-t border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Describe a chart
      </label>
      <textarea
        id={id}
        ref={ref}
        rows={2}
        value={text}
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        maxLength={MAX_MESSAGE_CHARS}
        aria-describedby={text.length >= COUNT_FROM ? countId : undefined}
        placeholder="Describe a chart…"
        className="min-h-[3rem] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted disabled:opacity-50"
      />
      {text.length >= COUNT_FROM && (
        <span id={countId} className="self-center text-xs text-muted tabular-nums">
          {text.length.toLocaleString("en-GB")} / {MAX_MESSAGE_CHARS.toLocaleString("en-GB")}
        </span>
      )}
      <button
        type="submit"
        disabled={!canSend}
        className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-40"
      >
        Send
      </button>
    </form>
  );
}
