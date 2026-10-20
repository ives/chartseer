"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type BundledDataset, datasets } from "@/lib/data/datasets";
import { AppHeader } from "@/components/studio/app-header";
import { DropOverlay } from "@/components/studio/drop-overlay";
import { handOff } from "@/components/studio/handoff";
import { PRIVACY_NOTE, UploadButton } from "@/components/studio/upload-button";
import { useFileDrop } from "@/components/studio/use-file-drop";

// A placeholder until the designed landing page is built. It holds every link
// the design needs, and stays light: no chat, charts or Zod (D-067).
export function LandingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { dragging, handlers } = useFileDrop((file) => void loadFile(file), setError);

  // The same checks and reader as the app. The reader loads only when a file arrives.
  async function loadFile(file: File) {
    setError(null);
    const { readUpload } = await import("@/lib/data/upload");
    const result = await readUpload(file);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    handOff({ name: file.name, csv: result.csv });
    router.push("/app");
  }

  return (
    <main
      className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-4 md:px-6"
      {...handlers}
    >
      <AppHeader
        controls={
          <Link href="/app" className="rounded-md border border-border px-2 py-1 text-sm">
            Open the app
          </Link>
        }
      />
      <section aria-labelledby="landing-title" className="flex flex-col gap-3">
        <h2 id="landing-title" className="text-2xl font-semibold">
          Charts from plain English
        </h2>
        <p className="text-muted">
          Load a CSV, describe the chart you want, and Chartseer draws it. The AI writes a validated chart spec, never
          code.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <UploadButton label="Upload a CSV" onFile={(file) => void loadFile(file)} />
          <span className="text-sm text-muted">or drop a .csv file anywhere on the page (up to 5 MB)</span>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <p className="text-xs text-muted">{PRIVACY_NOTE}</p>
      </section>
      <section id="demos" aria-labelledby="demos-title" className="flex flex-col gap-3">
        <h2 id="demos-title" className="text-lg font-semibold">
          Try a demo
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {Object.values(datasets).map((meta: BundledDataset) => (
            <li key={meta.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
              <span className="font-medium">{meta.title}</span>
              <span className="text-sm text-muted">{meta.summary}</span>
              <span className="text-xs text-muted">
                {meta.attribution}
                {meta.note && ` ${meta.note}`}
              </span>
              <Link href={`/app?dataset=${meta.id}`} className="mt-auto text-sm text-accent underline underline-offset-2">
                Open demo<span className="sr-only">: {meta.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {dragging && <DropOverlay />}
    </main>
  );
}
