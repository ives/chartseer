import { useId } from "react";
import { Icon, type IconName } from "@/components/landing/icon";
import { type BundledDataset, datasets } from "@/lib/data/datasets";

export type DatasetId = keyof typeof datasets;

const UPLOAD = "upload";

type DatasetPickerProps = {
  value: DatasetId | typeof UPLOAD;
  // The uploaded file's name, listed as a choice while it is loaded.
  upload: string | null;
  // One line under the name, e.g. "About 25,000 rows · January to May 2026".
  summary: string;
  onChange: (id: DatasetId) => void;
};

// The chosen dataset in full, over a transparent native <select>, so the
// keyboard, screen readers and the switch confirmation (D-041) work as ever.
export function DatasetPicker({ value, upload, summary, onChange }: DatasetPickerProps) {
  const id = useId();
  const title = value === UPLOAD ? (upload ?? "") : datasets[value].title;
  const tile =
    value === UPLOAD
      ? { icon: "file" as const, className: "bg-surface-track text-secondary" }
      : { icon: ICONS[value], className: datasets[value].invented ? INVENTED : REAL };
  return (
    <div className="relative flex min-h-[52px] w-full min-w-0 items-center gap-2.5 rounded-xl border border-border bg-card pr-3 pl-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus hover:border-border-strong md:min-h-11 md:w-auto md:pl-1.5">
      <span aria-hidden="true" className={`inline-flex size-[34px] flex-none items-center justify-center rounded-[9px] md:size-[30px] md:rounded-lg ${tile.className}`}>
        <Icon name={tile.icon} size={17} strokeWidth={1.8} />
      </span>
      <span aria-hidden="true" className="min-w-0 flex-1 text-left leading-tight">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted">{summary}</span>
      </span>
      <Icon name="chevron-down" size={14} className="ml-1 flex-none text-muted" />
      <label htmlFor={id} className="sr-only">
        Dataset
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          if (event.target.value !== UPLOAD) onChange(event.target.value as DatasetId);
        }}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      >
        {upload !== null && <option value={UPLOAD}>{upload}</option>}
        {Object.values(datasets).map((meta: BundledDataset) => (
          <option key={meta.id} value={meta.id}>
            {meta.title}
          </option>
        ))}
      </select>
    </div>
  );
}

const ICONS: Record<DatasetId, IconName> = { bikes: "bike", gelato: "scoop" };
// Real data in blue, invented in orange, as on the landing page's tags (D-068).
const REAL = "bg-tag-real text-tag-real-foreground";
const INVENTED = "bg-tag-invented text-tag-invented-foreground";
