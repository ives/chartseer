import type { Annotation } from "@/lib/spec";
import type { Inner } from "./chart-frame";

// Where an annotation sits along the category or time axis, in pixels.
// Equal start and end mark a point.
export type Span = { start: number; end: number };

type AnnotationLayerProps = {
  annotations: Annotation[];
  // Null for an annotation that isn't on the axis (filtered out, beyond
  // `limit`, outside the dates shown); it is skipped (D-022).
  locate: (annotation: Annotation) => Span | null;
  // Which way the annotated axis runs: along the bottom, or down the side.
  axis: "x" | "y";
  inner: Inner;
};

const lineStyle = { stroke: "var(--chart-annotation-line)", strokeWidth: 1 };
const washStyle = { fill: "var(--chart-annotation)" };
const labelStyle = { fill: "var(--foreground)", fontWeight: 600 };

export function AnnotationLayer({ annotations, locate, axis, inner }: AnnotationLayerProps) {
  return (
    <g aria-hidden>
      {annotations.map((annotation, i) => {
        const span = locate(annotation);
        if (!span) return null;
        const point = annotation.kind === "point";
        const size = Math.max(1, span.end - span.start);
        if (axis === "x") {
          return (
            <g key={i}>
              {point ? (
                <line x1={span.start} x2={span.start} y1={0} y2={inner.height} style={lineStyle} />
              ) : (
                <rect x={span.start} width={size} y={0} height={inner.height} style={washStyle} />
              )}
              <text x={span.start + 4} y={12} style={labelStyle}>
                {annotation.label}
              </text>
            </g>
          );
        }
        return (
          <g key={i}>
            {point ? (
              <line x1={0} x2={inner.width} y1={span.start} y2={span.start} style={lineStyle} />
            ) : (
              <rect x={0} width={inner.width} y={span.start} height={size} style={washStyle} />
            )}
            <text x={inner.width - 4} y={span.start - 4} textAnchor="end" style={labelStyle}>
              {annotation.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
