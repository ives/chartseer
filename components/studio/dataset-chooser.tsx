import { datasets } from "@/lib/data/datasets";
import type { DatasetId } from "./dataset-picker";
import { PRIVACY_NOTE, UploadButton } from "./upload-button";

// The first screen: a demo dataset or the user's own file (D-045).
export function DatasetChooser({ onPick, onFile }: { onPick: (id: DatasetId) => void; onFile: (file: File) => void }) {
  return (
    <section aria-labelledby="chooser-title" className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
      <div className="flex flex-col gap-1">
        <h2 id="chooser-title" className="text-lg font-semibold">
          Choose some data to chart
        </h2>
        <p className="text-sm text-muted">Try a demo dataset, or upload a CSV of your own. Then describe the chart you want.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(datasets) as DatasetId[]).map((id) => {
          const meta = datasets[id];
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onPick(id)}
                className="flex h-full w-full flex-col gap-2 rounded-lg border border-border bg-surface p-4 text-left hover:border-accent"
              >
                <span className="font-medium">{meta.title}</span>
                <span className="text-sm text-muted">{meta.summary}</span>
                <span className="mt-auto text-xs text-muted">
                  {meta.attribution}
                  {meta.note && ` ${meta.note}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <UploadButton onFile={onFile} />
          <span className="text-sm text-muted">or drop a .csv file anywhere on the page (up to 5 MB)</span>
        </div>
        <p className="text-xs text-muted">{PRIVACY_NOTE}</p>
      </div>
    </section>
  );
}
