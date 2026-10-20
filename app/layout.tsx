import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Only the spec view uses it, after a dataset is picked, so the first screen
// doesn't wait for it (D-066).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

// The serif, for the wordmark and chart titles only (D-054).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

// Fraunces italic 500, for the landing page's two accent words (D-068): a 6 KB
// subset holding only their glyphs, with the optical-size axis. The full italic
// is 82 KB and cost the landing page its Lighthouse score. Declared here so its
// @font-face rides in the shared stylesheet rather than a second, render-blocking
// one; not preloaded, so other pages never fetch it. To regenerate, download the
// woff2 that https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,500&text=plainEnglish.Justask
// names (ask with a current browser's User-Agent). Licence: fonts/fraunces-OFL.txt.
const frauncesItalic = localFont({
  src: "./fonts/fraunces-italic-accent.woff2",
  variable: "--font-fraunces-italic",
  style: "italic",
  weight: "500",
  preload: false,
});

const TITLE = "Chartseer — charts from plain English";
const DESCRIPTION =
  "Load a CSV, describe the chart you want, and Chartseer draws it. The AI writes a validated chart spec, never code.";

// What a shared link shows (D-065). The card itself is app/opengraph-image.tsx;
// metadataBase makes its URL absolute, which LinkedIn needs.
export const metadata: Metadata = {
  metadataBase: new URL("https://chartseer.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Chartseer",
    locale: "en_GB",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// The on-screen keyboard shrinks the layout rather than covering the chat
// input (D-055).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${frauncesItalic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
