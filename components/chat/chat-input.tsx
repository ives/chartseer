"use client";

import { type KeyboardEvent, type Ref, useId, useState } from "react";

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
        placeholder="Describe a chart…"
        className="min-h-[3rem] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted disabled:opacity-50"
      />
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
