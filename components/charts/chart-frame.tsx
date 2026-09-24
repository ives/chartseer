"use client";

import { type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";
import type { ScaleBand, ScaleLinear, ScaleLogarithmic, ScalePoint, ScaleTime } from "d3-scale";
import type { DatasetMeta } from "@/lib/data/datasets";
import { bucketTicks, formatBuckets, isoToUtcDate } from "@/lib/data/dates";
import type { TimeUnit } from "@/lib/spec";

// One axis of the plot. Gridlines are drawn only where `grid` is set, which
// renderers use for the value axis (D-022). With a time unit, ticks fall on
// bucket starts and are labelled by period, e.g. "Jan 2025", "Feb" (D-026).
export type Axis =
  | { kind: "linear"; scale: ScaleLinear<number, number>; label: string; grid?: boolean }
  | { kind: "log"; scale: ScaleLogarithmic<number, number>; label: string; grid?: boolean }
  | { kind: "time"; scale: ScaleTime<number, number>; label: string; unit?: TimeUnit }
  | { kind: "band"; scale: ScaleBand<string>; label: string; unit?: TimeUnit }
  | { kind: "point"; scale: ScalePoint<string>; label: string };

export type Axes = { x: Axis; y: Axis };
export type Inner = { width: number; height: number };
export type LegendItem = { label: string; color: string };

type ChartFrameProps = {
  title: string;
  subtitle?: string;
  legend?: { title?: string; items: LegendItem[] };
  dataset: DatasetMeta;
  // A footnote about this chart, shown above the attribution.
  note?: string;
  // What the chart shows, in words, for screen readers (describeChart).
  description: string;
  // Shown in place of the plot when the reader asks for the table.
  table: ReactNode;
  // Total SVG height in pixels, margins included.
  height: number;
  // Scales depend on the plot's size, which depends on the measured width.
  axes: (inner: Inner) => Axes;
  children: (axes: Axes, inner: Inner) => ReactNode;
};

type Tick = { offset: number; label: string };
type Side = "x" | "y";

const MARGIN = { top: 28, right: 16, bottom: 44 };
const CHAR_WIDTH = 7; // Rough width of a 12px tick label character; no DOM measurement.
const TICK_GAP = 8;
const LINE_HEIGHT = 14;
const MIN_LEFT = 32;
const MAX_LEFT_SHARE = 0.4;

export function ChartFrame({ title, subtitle, legend, dataset, note, description, table, height, axes, children }: ChartFrameProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [showTable, setShowTable] = useState(false);

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex flex-col gap-1">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        {subtitle && <p className="text-sm opacity-70">{subtitle}</p>}
      </figcaption>
      <p id={descriptionId} className="sr-only">
        {description}
      </p>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        {/* The table's column headers name the series, so it needs no legend. */}
        {!showTable && legend && legend.items.length > 1 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {legend.title && <span className="opacity-70">{legend.title}</span>}
            <ul aria-label={legend.title ?? "Legend"} className="contents">
              {legend.items.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5">
                  <span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: item.color }} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          aria-pressed={showTable}
          onClick={() => setShowTable((shown) => !shown)}
          className="rounded border border-(--chart-axis) px-2 py-0.5 text-xs opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {showTable ? "View as chart" : "View as table"}
        </button>
      </div>
      {showTable && table}
      {/* Hidden rather than unmounted, so its ResizeObserver stays attached. */}
      <div ref={ref} hidden={showTable} className="w-full">
        {width > 0 && !showTable && (
          <Plot width={width} height={height} titleId={titleId} descriptionId={descriptionId} axes={axes}>
            {children}
          </Plot>
        )}
      </div>
      <footer className="flex flex-col gap-0.5 text-xs opacity-70">
        {note && <p>{note}</p>}
        <p>{dataset.attribution}</p>
        {dataset.note && <p>{dataset.note}</p>}
      </footer>
    </figure>
  );
}

function Plot({
  width,
  height,
  titleId,
  descriptionId,
  axes,
  children,
}: Pick<ChartFrameProps, "height" | "axes" | "children"> & { width: number; titleId: string; descriptionId: string }) {
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  // y ticks don't depend on the width, so a provisional layout sizes the left margin.
  const provisional = axes({ width: Math.max(0, width - MIN_LEFT - MARGIN.right), height: innerHeight });
  const maxLeft = Math.floor(width * MAX_LEFT_SHARE);
  const longest = Math.max(0, ...ticksFor(provisional.y, innerHeight, "y").map((t) => t.label.length));
  const left = Math.min(maxLeft, Math.max(MIN_LEFT, longest * CHAR_WIDTH + TICK_GAP));
  const maxChars = Math.floor((left - TICK_GAP) / CHAR_WIDTH);

  const inner = { width: Math.max(0, width - left - MARGIN.right), height: innerHeight };
  const scales = axes(inner);
  const xTicks = ticksFor(scales.x, inner.width, "x");
  const yTicks = ticksFor(scales.y, inner.height, "y");

  return (
    <svg width={width} height={height} role="img" aria-labelledby={titleId} aria-describedby={descriptionId} className="block overflow-visible text-xs">
      <g transform={`translate(${left},${MARGIN.top})`}>
        {isGridded(scales.y) &&
          yTicks.map((t) => (
            <line key={`gy${t.offset}`} x1={0} x2={inner.width} y1={t.offset} y2={t.offset} style={gridStyle(t)} />
          ))}
        {isGridded(scales.x) &&
          xTicks.map((t) => (
            <line key={`gx${t.offset}`} x1={t.offset} x2={t.offset} y1={0} y2={inner.height} style={gridStyle(t)} />
          ))}

        {children(scales, inner)}

        {!isGridded(scales.y) && (
          <line x1={0} x2={inner.width} y1={inner.height} y2={inner.height} style={{ stroke: "var(--chart-axis)" }} />
        )}
        {xTicks.map((t) => (
          <text key={`tx${t.offset}`} x={t.offset} y={inner.height + 16} textAnchor="middle" style={tickStyle}>
            {t.label}
          </text>
        ))}
        {yTicks.map((t) => (
          <text key={`ty${t.offset}`} x={-TICK_GAP} y={t.offset} dy="0.32em" textAnchor="end" style={tickStyle}>
            {t.label.length > maxChars && <title>{t.label}</title>}
            {truncate(t.label, maxChars)}
          </text>
        ))}

        <text x={inner.width} y={inner.height + 36} textAnchor="end" style={labelStyle}>
          {scales.x.label}
        </text>
        <text x={-left} y={-14} style={labelStyle}>
          {scales.y.label}
        </text>
      </g>
    </svg>
  );
}

const tickStyle = { fill: "var(--chart-muted)", fontVariantNumeric: "tabular-nums" };
const labelStyle = { fill: "var(--chart-muted)", fontWeight: 600 };

function isGridded(axis: Axis): boolean {
  return (axis.kind === "linear" || axis.kind === "log") && axis.grid === true;
}

// The zero line doubles as the baseline, so it is drawn in the axis colour.
function gridStyle(tick: Tick) {
  return { stroke: tick.label === "0" ? "var(--chart-axis)" : "var(--chart-grid)" };
}

function ticksFor(axis: Axis, length: number, side: Side): Tick[] {
  switch (axis.kind) {
    case "linear": {
      const count = tickCount(length, side);
      const format = axis.scale.tickFormat(count);
      return axis.scale.ticks(count).map((v) => ({ offset: axis.scale(v), label: format(v) }));
    }
    case "log": {
      // A log scale offers a tick at every 1–9 of each decade; tickFormat
      // leaves the ones it wouldn't label blank, so those are dropped.
      const count = tickCount(length, side);
      const format = axis.scale.tickFormat(count, ",");
      return axis.scale
        .ticks(count)
        .map((v) => ({ offset: axis.scale(v), label: format(v) }))
        .filter((t) => t.label !== "");
    }
    case "time": {
      const count = tickCount(length, side);
      if (axis.unit) {
        const [from = new Date(0), to = from] = axis.scale.domain();
        const starts = bucketTicks({ from: from.toISOString(), to: to.toISOString() }, axis.unit, count);
        const labels = formatBuckets(starts, axis.unit);
        return starts.map((start, i) => ({ offset: axis.scale(isoToUtcDate(start)), label: labels[i] ?? start }));
      }
      const format = axis.scale.tickFormat(count);
      return axis.scale.ticks(count).map((v) => ({ offset: axis.scale(v), label: format(v) }));
    }
    case "band":
    case "point": {
      const scale = axis.scale;
      const domain = scale.domain();
      const half = axis.kind === "band" ? axis.scale.bandwidth() / 2 : 0;
      const unit = axis.kind === "band" ? axis.unit : undefined;
      const format = (values: string[]) => (unit ? formatBuckets(values, unit) : values);
      const every = labelInterval(format(domain), scale.step(), side);
      const shown = domain.filter((_, i) => i % every === 0);
      const labels = format(shown);
      return shown.map((v, i) => ({ offset: (scale(v) ?? 0) + half, label: labels[i] ?? v }));
    }
    default: {
      const unreachable: never = axis;
      throw new Error(`Unknown axis: ${JSON.stringify(unreachable)}`);
    }
  }
}

// Roughly one tick per 50px down the side, one per 90px along the bottom.
function tickCount(length: number, side: Side): number {
  return Math.max(2, Math.floor(length / (side === "y" ? 50 : 90)));
}

// Show every k-th category label so neighbours don't collide: along the
// bottom they need their text width, down the side one line height.
function labelInterval(labels: string[], step: number, side: Side): number {
  if (step <= 0) return 1;
  const needed = side === "y" ? LINE_HEIGHT : Math.max(1, ...labels.map((v) => v.length)) * CHAR_WIDTH + TICK_GAP;
  return Math.max(1, Math.ceil(needed / step));
}

function truncate(label: string, maxChars: number): string {
  return label.length > maxChars ? `${label.slice(0, Math.max(1, maxChars - 1))}…` : label;
}

function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
