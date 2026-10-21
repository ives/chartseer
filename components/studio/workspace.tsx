"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChartseerChat } from "@/components/chat/use-chartseer-chat";
import type { BundledDataset, DatasetMeta } from "@/lib/data/datasets";
import type { InferredDataset } from "@/lib/data/infer";
import { explainEmpty } from "@/lib/data/empty";
import { prepareChartData } from "@/lib/data/prepare";
import { ChartArea } from "./chart-area";
import { PRIVACY_NOTE } from "./upload-button";
import { undoShortcut } from "./undo-shortcut";
import { type DatasetState, useDataset } from "./use-dataset";

// A bundled dataset is fetched and brings its own starters; an upload arrives
// parsed and inferred, with starters built from its summary (D-045).
export type WorkspaceSource =
  | { kind: "bundled"; meta: BundledDataset }
  | { kind: "upload"; meta: DatasetMeta; dataset: InferredDataset; starters: readonly string[] };

type WorkspaceProps = {
  source: WorkspaceSource;
  // Called with whether a conversation has started, so Studio can confirm before replacing it.
  onConversationChange: (active: boolean) => void;
  // A bundled file failed to load; Studio remounts this to fetch it again.
  onRetryLoad: () => void;
  // The chat is full; Studio remounts this for a fresh chat on the same data.
  onNewChat: () => void;
  // This is that fresh chat, so the cursor goes to its input.
  newChat?: boolean;
};

// One dataset's data, chat and chart. Studio remounts it on a dataset change.
export function Workspace({ source, onConversationChange, onRetryLoad, onNewChat, newChat = false }: WorkspaceProps) {
  const { meta } = source;
  const fetched = useDataset(source.kind === "bundled" ? source.meta : null);
  const loaded: DatasetState = source.kind === "upload" ? { status: "ready", dataset: source.dataset } : fetched;
  const inferred = loaded.status === "ready" ? loaded.dataset : null;
  const chat = useChartseerChat(inferred?.summary ?? null);

  const active = chat.messages.length > 0;
  useEffect(() => onConversationChange(active), [active, onConversationChange]);

  const { undo, redo, canUndo, canRedo } = chat;
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const action = undoShortcut(event);
      // Left to the browser when there is nothing to undo or redo.
      if (action === "undo" && canUndo) undo();
      else if (action === "redo" && canRedo) redo();
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // A chip in the chat shows its chart; on a phone the chart is above the
  // chat, so it scrolls into view too (task 03).
  const chartCard = useRef<HTMLElement>(null);
  function showChart(index: number) {
    chat.goTo(index);
    if (!window.matchMedia("(max-width: 47.99rem)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    chartCard.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  const chart = useMemo(() => {
    if (!inferred || !chat.currentSpec) return null;
    const data = prepareChartData(inferred.rows, inferred.summary, chat.currentSpec, meta);
    const empty = explainEmpty(inferred.rows, inferred.summary, chat.currentSpec, data, meta);
    return { spec: chat.currentSpec, data, dataset: meta, empty };
  }, [inferred, chat.currentSpec, meta]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:gap-4">
      <section
        ref={chartCard}
        aria-label="Chart"
        className="flex min-w-0 scroll-mt-3 flex-col rounded-[18px] border border-border-card bg-card px-3.5 pt-3 pb-4 md:min-h-0 md:flex-[3_1_0] md:overflow-y-auto md:rounded-[20px] md:px-7 md:pt-5 md:pb-[22px]"
      >
        {loaded.status === "error" ? (
          <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-danger">
            <span>Couldn’t load {meta.title}. Check your connection.</span>
            <button
              type="button"
              onClick={onRetryLoad}
              className="min-h-11 rounded-xl border border-border bg-card px-4 font-medium text-foreground md:min-h-10"
            >
              Try again
            </button>
          </div>
        ) : (
          <ChartArea
            pending={!inferred || chat.drawing}
            chart={chart}
            dataset={meta}
            starters={source.kind === "bundled" ? source.meta.starters : source.starters}
            canAsk={inferred !== null && !chat.busy}
            onAsk={chat.send}
            steps={{
              canUndo: chat.canUndo,
              canRedo: chat.canRedo,
              announcement: chat.announcement,
              onUndo: undo,
              onRedo: redo,
              shown: (chat.shownIndex ?? 0) + 1,
              drawn: chat.history.length,
            }}
          />
        )}
      </section>
      <div className="flex flex-col md:min-h-0 md:max-w-[520px] md:min-w-[340px] md:flex-[2_1_0]">
        <ChatPanel
          messages={chat.messages}
          dataset={inferred?.summary ?? null}
          status={chat.status}
          error={chat.error}
          busy={chat.busy}
          onSend={chat.send}
          onRetry={chat.retry}
          onNewChat={onNewChat}
          focusOnMount={newChat}
          links={{ shown: chat.shownIndex, reachable: chat.reachable, canShow: !chat.busy, onShow: showChart }}
          privacyNote={PRIVACY_NOTE}
        />
      </div>
    </div>
  );
}
