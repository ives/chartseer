import Link from "next/link";
import type { ReactNode } from "react";
import type { BundledDataset } from "@/lib/data/datasets";
import { Icon } from "./icon";

const OPEN =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[11px] bg-ink px-[18px] text-[15px] font-medium text-on-ink md:min-h-11";

// One bundled dataset. The facts come from its meta, shared with the app.
export function DemoCard({
  meta,
  title,
  description,
  prompt,
  drawing,
  onOpen,
  fullCredit = false,
}: {
  meta: BundledDataset;
  title: string;
  description: string;
  prompt: string;
  drawing: ReactNode;
  // In the app: pick the dataset in place, and show the full attribution, which
  // must appear wherever the dataset is displayed (D-045).
  onOpen?: () => void;
  fullCredit?: boolean;
}) {
  const credit = fullCredit
    ? [meta.attribution, meta.note].filter(Boolean).join(" ")
    : meta.sampleEvery
      ? `${meta.credit} · a 1-in-${meta.sampleEvery} sample`
      : meta.credit;
  const open = (
    <>
      Open demo<span className="sr-only">: {title}</span>
      <Icon name="arrow-right" size={14} />
    </>
  );
  return (
    <li className="flex min-w-0 basis-[486px] grow flex-col rounded-[20px] border border-border-card bg-card p-2.5 md:rounded-3xl md:p-3">
      <div className="rounded-[13px] bg-surface px-[18px] pt-5 pb-3.5 md:rounded-2xl md:px-7 md:pt-7 md:pb-5">{drawing}</div>
      <div className="flex grow flex-col px-2.5 pt-5 pb-2.5 md:px-4 md:pt-6 md:pb-4">
        <p className="flex items-center gap-2">
          <span
            className={`rounded-full px-[9px] py-[3px] text-xs font-medium ${meta.invented ? "bg-tag-invented text-tag-invented-foreground" : "bg-tag-real text-tag-real-foreground"}`}
          >
            {meta.invented ? "Invented data" : "Real data"}
          </span>
          <span className="text-[13px] text-muted">{meta.scale}</span>
        </p>
        <h3 className="mt-3 text-[23px] font-semibold tracking-[-0.025em] md:mt-3.5 md:text-[26px]">{title}</h3>
        <p className="mt-1.5 text-[15px] leading-[1.55] text-secondary md:mt-2 md:text-base">{description}</p>
        <p className="mt-3.5 text-sm text-muted md:mt-5">
          Try asking <span className="text-foreground">“{prompt}”</span>
        </p>
        <div className="hidden min-h-6 grow md:block" />
        <div className="mt-[18px] flex flex-col gap-3 md:mt-0 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-4">
          {onOpen ? (
            <button type="button" onClick={onOpen} className={`${OPEN} cursor-pointer`}>
              {open}
            </button>
          ) : (
            <Link href={`/app?dataset=${meta.id}`} className={OPEN}>
              {open}
            </Link>
          )}
          <p className="text-center text-xs text-muted md:text-left">{credit}</p>
        </div>
      </div>
    </li>
  );
}
