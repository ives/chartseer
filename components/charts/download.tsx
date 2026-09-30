import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { ChartExportContext, EXPORT_SIZE } from "./chart-export";
import { type ChartProps, ChartView } from "./chart-view";

export type DownloadFormat = "svg" | "png";

// Presentation properties resolved from CSS and written onto each element,
// so the file needs no stylesheet, class or CSS variable (D-059).
const INLINED = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "letter-spacing",
  "font-variant-numeric",
] as const;

// The chart as a light-themed 1200×675 SVG or PNG file. Browser only.
export async function chartBlob(props: ChartProps, format: DownloadFormat): Promise<Blob> {
  await document.fonts.ready;
  const svg = await renderSvg(props);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  return format === "svg" ? blob : toPng(blob);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Revoked on the next task, once the download has started.
  setTimeout(() => URL.revokeObjectURL(url));
}

// "Monthly revenue by shop, 2024–2025" → "monthly-revenue-by-shop-2024-2025.png".
export function downloadName(title: string, format: DownloadFormat): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/, "");
  return `${slug || "chart"}.${format}`;
}

// Draws the chart off screen in the light theme, then copies its SVG with
// every style resolved and the fonts it uses embedded.
async function renderSvg(props: ChartProps): Promise<string> {
  const container = document.createElement("div");
  container.setAttribute("data-chart-export", "");
  container.setAttribute("aria-hidden", "true");
  container.inert = true;
  container.style.cssText = `position:fixed;left:-${EXPORT_SIZE.width * 2}px;top:0;width:${EXPORT_SIZE.width}px;pointer-events:none`;
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    flushSync(() =>
      root.render(
        <ChartExportContext value={EXPORT_SIZE}>
          <ChartView {...props} />
        </ChartExportContext>,
      ),
    );
    const source = container.querySelector("svg");
    if (!source) throw new Error("The chart drew no SVG");
    const copy = source.cloneNode(true) as SVGSVGElement;
    const families = inlineStyles(source, copy);
    const fonts = await embeddedFonts(families, copy.textContent ?? "");
    if (fonts) {
      const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
      style.textContent = fonts;
      copy.insertBefore(style, copy.firstChild);
    }
    return new XMLSerializer().serializeToString(copy);
  } finally {
    root.unmount();
    container.remove();
  }
}

// Copies each element's computed presentation onto its clone, and returns the
// font families the text uses.
function inlineStyles(source: SVGSVGElement, copy: SVGSVGElement): Set<string> {
  const families = new Set<string>();
  const originals = [source, ...source.querySelectorAll("*")];
  const clones = [copy, ...copy.querySelectorAll("*")];
  originals.forEach((original, i) => {
    const clone = clones[i];
    if (!clone) return;
    const computed = getComputedStyle(original);
    clone.setAttribute("style", INLINED.map((name) => `${name}:${computed.getPropertyValue(name)}`).join(";"));
    clone.removeAttribute("class");
    for (const attribute of [...clone.attributes]) {
      if (attribute.name.startsWith("data-")) clone.removeAttribute(attribute.name);
    }
    if (original.tagName === "text") {
      for (const family of computed.fontFamily.split(",")) families.add(unquote(family));
    }
  });
  return families;
}

// @font-face rules for the given families, with each font file inlined as a
// data URL: an SVG drawn as an image can't load anything else. Only the
// subsets the text needs are kept, usually just Latin.
async function embeddedFonts(families: Set<string>, text: string): Promise<string> {
  const used = [...new Set(text)].map((c) => c.codePointAt(0) ?? 0);
  const rules: CSSFontFaceRule[] = [];
  for (const sheet of document.styleSheets) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue; // A cross-origin sheet; next/font's are same-origin.
    }
    for (const rule of list) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      if (!families.has(unquote(rule.style.getPropertyValue("font-family")))) continue;
      const ranges = unicodeRanges(rule.style.getPropertyValue("unicode-range"));
      if (!ranges || used.some((c) => ranges.some(([from, to]) => c >= from && c <= to))) rules.push(rule);
    }
  }
  const inlined = await Promise.all(
    rules.map(async (rule) => {
      let css = rule.cssText;
      for (const [whole, url] of css.matchAll(/url\("?([^")]+)"?\)/g)) {
        if (url) css = css.replace(whole, `url("${await dataUrl(new URL(url, rule.parentStyleSheet?.href ?? location.href).href)}")`);
      }
      return css;
    }),
  );
  return inlined.join("\n");
}

async function dataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error(`Couldn't read ${url}`));
    reader.readAsDataURL(blob);
  });
}

async function toPng(svg: Blob): Promise<Blob> {
  const url = URL.createObjectURL(svg);
  try {
    const image = new Image(EXPORT_SIZE.width, EXPORT_SIZE.height);
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_SIZE.width;
    canvas.height = EXPORT_SIZE.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas");
    context.drawImage(image, 0, 0, EXPORT_SIZE.width, EXPORT_SIZE.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The PNG came out empty"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

// "U+0-FF, U+131, U+2000-206F" → [[0, 255], [305, 305], [8192, 8303]]; null
// when there is no range, which means every character.
export function unicodeRanges(value: string): [number, number][] | null {
  if (!value.trim()) return null;
  return value.split(",").flatMap((part) => {
    const match = /U\+([0-9A-F?]+)(?:-([0-9A-F]+))?/i.exec(part.trim());
    if (!match?.[1]) return [];
    const [from, to] = match[2] ? [match[1], match[2]] : [match[1].replace(/\?/g, "0"), match[1].replace(/\?/g, "F")];
    return [[parseInt(from, 16), parseInt(to, 16)] as [number, number]];
  });
}

function unquote(family: string): string {
  return family.trim().replace(/^["']|["']$/g, "");
}
