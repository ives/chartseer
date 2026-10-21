"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { type DatasetMeta, datasets } from "@/lib/data/datasets";
import { type DateOrder, inferDataset } from "@/lib/data/infer";
import type { ParsedCsv } from "@/lib/data/parse";
import { starterPrompts } from "@/lib/data/starters";
import { readUpload } from "@/lib/data/upload";
import { AppHeader } from "./app-header";
import { ConfirmDialog } from "./confirm-dialog";
import { DatasetChooser } from "./dataset-chooser";
import { type DatasetId, DatasetPicker } from "./dataset-picker";
import { DropOverlay } from "./drop-overlay";
import { clearHandoff, peekHandoff } from "./handoff";
import { PrivacyNote } from "./privacy-note";
import { UploadButton } from "./upload-button";
import { useFileDrop } from "./use-file-drop";
import type { WorkspaceSource } from "./workspace";

// The workspace brings the chat, the charts, the AI SDK and Zod. None of it is
// needed on the first screen, so it loads once a dataset is picked (D-066).
const Workspace = dynamic(() => import("./workspace").then((m) => m.Workspace), { loading: Skeleton });

function Skeleton() {
  return <div aria-busy="true" aria-label="Loading" className="h-[360px] rounded-[20px] bg-surface-track motion-safe:animate-pulse" />;
}

// The page: the header across the full width, then the content.
const PAGE = "flex min-h-full w-full flex-1 flex-col bg-page";

// Each upload gets its own n, so loading a file again starts afresh.
type Upload = { n: number; name: string; csv: ParsedCsv };
type Source = { kind: "bundled"; id: DatasetId } | { kind: "upload"; upload: Upload };

function isDatasetId(id: string | null): id is DatasetId {
  return id !== null && Object.hasOwn(datasets, id);
}

// The URL that reopens a source: a demo can be, an upload can't (D-067).
function urlFor(source: Source) {
  return source.kind === "bundled" ? `/app?dataset=${source.id}` : "/app";
}

// Reading the search params needs a Suspense boundary, or /app can't be
// prerendered. The fallback is the header and a skeleton, so a deep link
// never flashes the chooser (D-067).
export function Studio() {
  return (
    <Suspense
      fallback={
        <main className={PAGE}>
          <AppHeader />
          <div className="p-3 md:px-6 md:pt-4 md:pb-6">
            <Skeleton />
          </div>
        </main>
      }
    >
      <StudioContent />
    </Suspense>
  );
}

function StudioContent() {
  const router = useRouter();
  const requested = useSearchParams().get("dataset");
  // Null until the user picks a dataset on the first screen (D-045). A file
  // handed over by the landing page, or a demo in the URL, opens straight away.
  const [source, setSource] = useState<Source | null>(() => {
    const handoff = peekHandoff();
    if (handoff) return { kind: "upload", upload: { n: 0, ...handoff } };
    return isDatasetId(requested) ? { kind: "bundled", id: requested } : null;
  });
  // Bumped to remount the workspace: to fetch a bundled file again after it
  // failed to load, or to start a new chat on the same data.
  const [restarts, setRestarts] = useState(0);
  const [newChat, setNewChat] = useState(false);
  const [dateOrder, setDateOrder] = useState<DateOrder>("day-first");
  const [conversation, setConversation] = useState(false);
  // A dataset waiting for the user to confirm that the conversation can go.
  const [pending, setPending] = useState<Source | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const uploads = useRef(0);
  const home = useRef<HTMLAnchorElement>(null);
  const stayed = useRef(false);
  const { dragging, handlers } = useFileDrop((file) => void loadFile(file), setError);

  // The hand-off is read once.
  useEffect(clearHandoff, []);

  // An unknown demo id falls back to the chooser quietly.
  useEffect(() => {
    if (requested !== null && !isDatasetId(requested)) router.replace("/app");
  }, [requested, router]);

  // After Stay, focus goes back to the wordmark. This runs after the dialog's
  // own effect has closed it, which would otherwise put focus elsewhere.
  useEffect(() => {
    if (leaving || !stayed.current) return;
    stayed.current = false;
    home.current?.focus();
  }, [leaving]);

  // An upload is inferred here, so the date notice can see it; switching the
  // date order re-infers it without remounting the workspace (D-042).
  const workspace = useMemo((): WorkspaceSource | null => {
    if (!source) return null;
    if (source.kind === "bundled") return { kind: "bundled", meta: datasets[source.id] };
    const dataset = inferDataset(source.upload.csv, { ambiguousDates: dateOrder });
    // The inferred labels carry units such as "(£)", and the chart takes its labels from the meta.
    const meta: DatasetMeta = {
      id: "upload",
      title: source.upload.name,
      columnLabels: Object.fromEntries(dataset.summary.columns.map((c) => [c.name, c.label ?? c.name])),
    };
    return { kind: "upload", meta, dataset, starters: starterPrompts(dataset.summary) };
  }, [source, dateOrder]);
  const ambiguous = workspace?.kind === "upload" && workspace.dataset.ambiguousDates.length > 0;
  // The switcher's second line: the demo's size and period, or the upload's rows.
  const summary = !workspace
    ? ""
    : workspace.kind === "bundled"
      ? `${workspace.meta.scale} · ${workspace.meta.period}`
      : `${workspace.dataset.rows.length.toLocaleString("en-GB")} rows`;

  function open(next: Source) {
    setSource(next);
    // Replace, so Back leaves the app rather than stepping through datasets.
    router.replace(urlFor(next));
    setDateOrder("day-first");
    setConversation(false);
    setPending(null);
    setNewChat(false);
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

  return (
    <main
      // From tablet width the page fits the screen and each pane scrolls; on a
      // phone the page scrolls, with room at the bottom for the pinned input (D-055).
      className={`${PAGE} ${source ? "pb-28 md:h-dvh md:pb-0" : ""}`}
      {...handlers}
    >
      <AppHeader
        homeRef={home}
        // Nothing is saved, so leaving a conversation asks first. Back isn't intercepted (D-067).
        onHomeNavigate={(event) => {
          if (!conversation) return;
          event.preventDefault();
          setLeaving(true);
        }}
        controls={
          source && (
            <>
              <DatasetPicker
                value={source.kind === "bundled" ? source.id : "upload"}
                upload={source.kind === "upload" ? source.upload.name : null}
                summary={summary}
                onChange={(id) => choose({ kind: "bundled", id })}
              />
              {ambiguous && (
                <p className="text-sm text-secondary">
                  Dates read as {dateOrder === "day-first" ? "day/month" : "month/day"} ·{" "}
                  <button
                    type="button"
                    onClick={() => setDateOrder(dateOrder === "day-first" ? "month-first" : "day-first")}
                    className="min-h-11 text-accent underline underline-offset-2 md:min-h-0"
                  >
                    switch
                  </button>
                </p>
              )}
            </>
          )
        }
        note={source && <PrivacyNote />}
        actions={source && <UploadButton label="Upload CSV" compact onFile={(file) => void loadFile(file)} />}
      >
        {error && (
          <p role="alert" className="text-sm text-danger md:self-end">
            {error}
          </p>
        )}
      </AppHeader>
      {source && workspace ? (
        // Remounting on a new dataset clears the data, the chat and the chart history together.
        <div className="flex min-h-0 flex-1 flex-col p-3 md:px-6 md:pt-4 md:pb-6">
          <Workspace
            key={`${source.kind === "bundled" ? source.id : `upload-${source.upload.n}`}-${restarts}`}
            source={workspace}
            onConversationChange={setConversation}
            onRetryLoad={() => {
              setNewChat(false);
              setRestarts((n) => n + 1);
            }}
            onNewChat={() => {
              setNewChat(true);
              setRestarts((n) => n + 1);
            }}
            newChat={newChat}
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <DatasetChooser onPick={(id) => choose({ kind: "bundled", id })} onFile={(file) => void loadFile(file)} />
        </div>
      )}
      <ConfirmDialog
        open={pending !== null}
        title="Start a new conversation?"
        message="The current chat and chart will be cleared."
        confirmLabel="Start afresh"
        onConfirm={() => pending && open(pending)}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={leaving}
        title="Leave and lose this chat?"
        message="Nothing is saved, so the chat and its charts will be gone."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => router.push("/")}
        onCancel={() => {
          stayed.current = true;
          setLeaving(false);
        }}
      />
      {dragging && <DropOverlay />}
    </main>
  );
}
