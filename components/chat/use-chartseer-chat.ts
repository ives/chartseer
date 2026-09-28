"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo } from "react";
import type { DatasetSummary } from "@/lib/spec";
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
  const currentSpec = history.at(-1) ?? null;
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
    send: (text: string) => {
      const body = context();
      if (!body || busy) return;
      chat.clearError();
      void chat.sendMessage({ text }, { body });
    },
    retry: () => {
      const body = context();
      if (!body || busy) return;
      chat.clearError();
      void chat.regenerate({ body });
    },
  };
}
