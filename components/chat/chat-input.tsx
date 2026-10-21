"use client";

import { type KeyboardEvent, type Ref, useId, useState } from "react";
import { Icon } from "@/components/landing/icon";
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
    // One box: the focus shows on it, as an accent border and a faint ring.
    <form
      className="flex items-center gap-2 rounded-[15px] border border-border-strong bg-card py-1.5 pr-1.5 pl-3.5 shadow-[0_1px_2px_rgba(17,17,16,0.04),0_12px_32px_-20px_rgba(17,17,16,0.25)] focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/12 md:items-end md:rounded-2xl md:p-2.5 md:pl-4"
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
        placeholder="Describe a chart, or ask for a change…"
        // 16px on phones, so iOS doesn't zoom in.
        className="min-w-0 flex-1 resize-none bg-transparent py-1.5 text-base leading-normal placeholder:text-muted focus-visible:outline-none disabled:opacity-50 md:text-[15px]"
      />
      {text.length >= COUNT_FROM && (
        <span id={countId} className="flex-none self-center text-xs text-muted tabular-nums">
          {text.length.toLocaleString("en-GB")} / {MAX_MESSAGE_CHARS.toLocaleString("en-GB")}
        </span>
      )}
      <button
        type="submit"
        aria-label="Send"
        disabled={!canSend}
        className="inline-flex size-11 flex-none items-center justify-center rounded-[11px] bg-accent text-accent-foreground disabled:opacity-40 md:rounded-xl"
      >
        <Icon name="arrow-up" size={18} />
      </button>
    </form>
  );
}
