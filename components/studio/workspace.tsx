"use client";

import { useMemo } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useChartseerChat } from "@/components/chat/use-chartseer-chat";
import type { DatasetMeta } from "@/lib/data/datasets";
import { prepareChartData } from "@/lib/data/prepare";
import { ChartArea } from "./chart-area";
import { useDataset } from "./use-dataset";

// One dataset's data, chat and chart. Studio remounts it on a dataset change.
export function Workspace({ meta, examples }: { meta: DatasetMeta; examples: readonly string[] }) {
  const loaded = useDataset(meta);
  const inferred = loaded.status === "ready" ? loaded.dataset : null;
  const chat = useChartseerChat(inferred?.summary ?? null);

  const chart = useMemo(() => {
    if (!inferred || !chat.currentSpec) return null;
    const data = prepareChartData(inferred.rows, inferred.summary, chat.currentSpec, meta);
    return { spec: chat.currentSpec, data, dataset: meta };
  }, [inferred, chat.currentSpec, meta]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <section aria-label="Chart" className="min-w-0 lg:flex-[2] lg:overflow-y-auto">
        {loaded.status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            Couldn’t load {meta.title}. Reload the page to try again.
          </p>
        ) : (
          <ChartArea pending={!inferred || chat.drawing} chart={chart} dataset={meta} examples={examples} />
        )}
      </section>
      <div className="flex min-h-[24rem] flex-col lg:min-h-0 lg:flex-1">
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
