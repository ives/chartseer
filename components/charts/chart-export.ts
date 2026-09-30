import { createContext } from "react";

// Downloads are drawn at one fixed size, always in the light theme (D-059).
export type ExportSize = { width: number; height: number };
export const EXPORT_SIZE: ExportSize = { width: 1200, height: 675 };

// Set only while a chart is being drawn for a download. ChartFrame then draws
// one self-contained SVG of this size instead of the interactive figure.
export const ChartExportContext = createContext<ExportSize | null>(null);

// The width of a string in pixels, in a given CSS font.
export type Measure = (text: string, font: string) => number;

// Splits text into lines no wider than maxWidth, breaking between words. A
// word wider than the line gets a line of its own rather than being cut.
export function wrapLines(text: string, maxWidth: number, measure: (text: string) => number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(candidate) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Measures with a canvas once the fonts have loaded; where there is no canvas
// (tests), estimates from the font size instead.
export function canvasMeasure(): Measure {
  const context = typeof document === "undefined" ? null : safeContext();
  return (text, font) => {
    if (context) {
      context.font = font;
      return context.measureText(text).width;
    }
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 12);
    return text.length * size * 0.58;
  };
}

function safeContext(): CanvasRenderingContext2D | null {
  try {
    return document.createElement("canvas").getContext("2d");
  } catch {
    return null;
  }
}

// The font family behind a next/font CSS variable, e.g. "'Fraunces', 'Fraunces Fallback'".
export function fontFamily(variable: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}
