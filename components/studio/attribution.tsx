import type { DatasetMeta } from "@/lib/data/datasets";

// Wherever a dataset is shown, so is its attribution and any note, such as the bikes sample ratio (§14).
export function Attribution({ dataset }: { dataset: DatasetMeta }) {
  if (!dataset.attribution && !dataset.note) return null;
  return (
    <div className="mt-auto flex flex-col gap-0.5 border-t border-border-faint pt-3 text-[11px] leading-relaxed text-muted md:pt-4 md:text-xs">
      {dataset.attribution && <p>{dataset.attribution}</p>}
      {dataset.note && <p>{dataset.note}</p>}
    </div>
  );
}
