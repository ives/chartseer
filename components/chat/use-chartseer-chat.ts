"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import type { DatasetSummary } from "@/lib/spec";
import { canRedo, canUndo, currentIndex, initialSteps, redo, stepLabel, syncSteps, undo } from "./history";
import { type ChartseerMessage, type RequestContext, buildChatBody, chartHistory, isDrawing } from "./messages";

// send and retry pass the request context as the per-call body; the transport
// turns it and the messages into exactly the body /api/chat accepts.
const transport = new DefaultChatTransport<ChartseerMessage>({
  api: "/api/chat",
  prepareSendMessagesRequest: ({ messages, body }) => ({ body: buildChatBody(messages, body as RequestContext) }),
});

// The chat for one dataset. The caller remounts it when the dataset changes,
// which clears the messages and the chart history together.
export function useChartseerChat(dataset: DatasetSummary | null) {
  const chat = useChat<ChartseerMessage>({ transport });
  const history = useMemo(() => (dataset ? chartHistory(chat.messages, dataset) : []), [chat.messages, dataset]);
  const [stored, setSteps] = useState(initialSteps);
  // Synced during render: pure, and a no-op once it has seen every chart.
  const steps = syncSteps(stored, history.length);
  const index = currentIndex(steps);
  // The chart on screen, which may be an earlier one after an undo. It is
  // also the spec sent with the next request, so a refinement builds on it.
  const currentSpec = index === undefined ? null : (history[index] ?? null);
  const busy = chat.status === "submitted" || chat.status === "streaming";

  const context = (): RequestContext | null => (dataset ? { dataset, currentSpec } : null);

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    busy,
    drawing: isDrawing(chat.messages, chat.status),
    history,
    currentSpec,
    // Not while a request is in flight: its reply builds on the spec it was sent with.
    canUndo: !busy && canUndo(steps),
    canRedo: !busy && canRedo(steps),
    undo: () => {
      if (!busy) setSteps(undo(steps));
    },
    redo: () => {
      if (!busy) setSteps(redo(steps));
    },
    // For screen readers, after an undo or redo; the chat announces new charts.
    announcement: steps.announce && currentSpec ? `${stepLabel(steps)}: ${currentSpec.title}` : "",
    send: (text: string) => {
      const body = context();
      if (!body || busy) return;
      chat.clearError();
      // After an undo, the message says so first, so the model's record of the
      // conversation matches the screen. Only where the user ended up counts (D-044).
      const wentBack = currentSpec && index !== history.length - 1;
      void chat.sendMessage(
        wentBack
          ? { parts: [{ type: "data-back-to", data: { title: currentSpec.title } }, { type: "text", text }] }
          : { text },
        { body },
      );
    },
    retry: () => {
      const body = context();
      if (!body || busy) return;
      chat.clearError();
      void chat.regenerate({ body });
    },
  };
}
