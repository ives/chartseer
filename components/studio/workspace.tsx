"use client";

import { useEffect, useMemo } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChartseerChat } from "@/components/chat/use-chartseer-chat";
import type { BundledDataset, DatasetMeta } from "@/lib/data/datasets";
import type { InferredDataset } from "@/lib/data/infer";
import { explainEmpty } from "@/lib/data/empty";
import { prepareChartData } from "@/lib/data/prepare";
import { ChartArea } from "./chart-area";
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
};

// One dataset's data, chat and chart. Studio remounts it on a dataset change.
export function Workspace({ source, onConversationChange, onRetryLoad }: WorkspaceProps) {
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

  const chart = useMemo(() => {
    if (!inferred || !chat.currentSpec) return null;
    const data = prepareChartData(inferred.rows, inferred.summary, chat.currentSpec, meta);
    const empty = explainEmpty(inferred.rows, inferred.summary, chat.currentSpec, data, meta);
    return { spec: chat.currentSpec, data, dataset: meta, empty };
  }, [inferred, chat.currentSpec, meta]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
      <section aria-label="Chart" className="min-w-0 md:flex-[3] md:overflow-y-auto">
        {loaded.status === "error" ? (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger">
            <span>Couldn’t load {meta.title}. Check your connection.</span>
            <button
              type="button"
              onClick={onRetryLoad}
              className="rounded border border-border px-2 py-0.5 text-foreground"
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
            }}
          />
        )}
      </section>
      <div className="flex min-h-[12rem] flex-col md:min-h-0 md:min-w-[18rem] md:flex-[2]">
        <ChatPanel
          messages={chat.messages}
          dataset={inferred?.summary ?? null}
          status={chat.status}
          error={chat.error}
          busy={chat.busy}
          onSend={chat.send}
          onRetry={chat.retry}
        />
      </div>
    </div>
  );
}
