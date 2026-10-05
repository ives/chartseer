import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
