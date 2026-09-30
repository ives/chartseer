"use client";

import { type DragEvent, useMemo, useRef, useState } from "react";
import { type DatasetMeta, datasets } from "@/lib/data/datasets";
import { type DateOrder, inferDataset } from "@/lib/data/infer";
import type { ParsedCsv } from "@/lib/data/parse";
import { readUpload } from "@/lib/data/upload";
import { ConfirmDialog } from "./confirm-dialog";
import { type DatasetId, DatasetPicker } from "./dataset-picker";
import { PRIVACY_NOTE, UploadButton } from "./upload-button";
import { Workspace, type WorkspaceSource } from "./workspace";

// Suggestions for the empty chart area.
const EXAMPLES: Record<DatasetId, readonly string[]> = {
  bikes: ["Journeys by hour of day, weekdays against weekends", "The 10 busiest start areas"],
  gelato: ["Daily revenue by shop in 2025", "Scoops against peak temperature"],
};

// Each upload gets its own n, so loading a file again starts afresh.
type Upload = { n: number; name: string; csv: ParsedCsv };
type Source = { kind: "bundled"; id: DatasetId } | { kind: "upload"; upload: Upload };

export function Studio() {
  const [source, setSource] = useState<Source>({ kind: "bundled", id: "gelato" });
  const [dateOrder, setDateOrder] = useState<DateOrder>("day-first");
  const [conversation, setConversation] = useState(false);
  // A dataset waiting for the user to confirm that the conversation can go.
  const [pending, setPending] = useState<Source | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const uploads = useRef(0);

  // An upload is inferred here, so the date notice can see it; switching the
  // date order re-infers it without remounting the workspace (D-042).
  const workspace = useMemo((): WorkspaceSource => {
    if (source.kind === "bundled") {
      return { kind: "bundled", meta: datasets[source.id], examples: EXAMPLES[source.id] };
    }
    const dataset = inferDataset(source.upload.csv, { ambiguousDates: dateOrder });
    // The inferred labels carry units such as "(£)", and the chart takes its labels from the meta.
    const meta: DatasetMeta = {
      id: "upload",
      title: source.upload.name,
      columnLabels: Object.fromEntries(dataset.summary.columns.map((c) => [c.name, c.label ?? c.name])),
    };
    return { kind: "upload", meta, dataset };
  }, [source, dateOrder]);
  const ambiguous = workspace.kind === "upload" && workspace.dataset.ambiguousDates.length > 0;

  function open(next: Source) {
    setSource(next);
    setDateOrder("day-first");
    setConversation(false);
    setPending(null);
  }

  // Replacing a conversation needs a yes first (D-041).
  function choose(next: Source) {
    setError(null);
    if (conversation) setPending(next);
    else open(next);
  }

  async function loadFile(file: File) {
    setError(null);
    const result = await readUpload(file);
    if (result.ok) choose({ kind: "upload", upload: { n: ++uploads.current, name: file.name, csv: result.csv } });
    else setError(result.message);
  }

  function hasFiles(event: DragEvent) {
    return event.dataTransfer.types.includes("Files");
  }

  return (
    <main
      className="mx-auto flex min-h-full w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 lg:h-dvh lg:px-6"
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        // Leaving for a child element isn't leaving the page.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setDragging(false);
        const files = event.dataTransfer.files;
        const file = files[0];
        if (files.length !== 1 || !file) setError("Drop one file at a time.");
        else void loadFile(file);
      }}
    >
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Chartseer</h1>
          <div className="flex flex-wrap items-center gap-3">
            <DatasetPicker
              value={source.kind === "bundled" ? source.id : "upload"}
              upload={source.kind === "upload" ? source.upload.name : null}
              onChange={(id) => choose({ kind: "bundled", id })}
            />
            {ambiguous && (
              <p className="text-sm text-muted">
                Dates read as {dateOrder === "day-first" ? "day/month" : "month/day"} ·{" "}
                <button
                  type="button"
                  onClick={() => setDateOrder(dateOrder === "day-first" ? "month-first" : "day-first")}
                  className="underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-foreground"
                >
                  switch
                </button>
              </p>
            )}
            <UploadButton onFile={(file) => void loadFile(file)} />
          </div>
        </div>
        <p className="text-xs text-muted sm:self-end">{PRIVACY_NOTE}</p>
        {error && (
          <p role="alert" className="text-sm text-danger sm:self-end">
            {error}
          </p>
        )}
      </header>
      {/* Remounting on a new dataset clears the data, the chat and the chart history together. */}
      <Workspace
        key={source.kind === "bundled" ? source.id : `upload-${source.upload.n}`}
        source={workspace}
        onConversationChange={setConversation}
      />
      <ConfirmDialog
        open={pending !== null}
        title="Start a new conversation?"
        message="The current chat and chart will be cleared."
        confirmLabel="Start afresh"
        onConfirm={() => pending && open(pending)}
        onCancel={() => setPending(null)}
      />
      {dragging && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-4 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-foreground bg-background/90 p-6 text-center"
        >
          <p className="text-lg font-medium">Drop a CSV file to load it</p>
          <p className="max-w-md text-sm text-muted">{PRIVACY_NOTE}</p>
        </div>
      )}
    </main>
  );
}
