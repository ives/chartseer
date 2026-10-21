import type { ReactNode } from "react";

// Simple 2 px line icons, drawn inline (docs/design/README.md). All decorative.
const paths = {
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  "arrow-up": (
    <>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  check: <path d="M5 12l5 5L20 7" />,
  shield: (
    <>
      <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M5 8h14" />
      <path d="M12 8v6" />
      <path d="M8.5 21l3.5-7 3.5 7" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  menu: (
    <>
      <path d="M4 8h16" />
      <path d="M4 16h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  redo: (
    <>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </>
  ),
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  // Chart types, for the workspace's chart chips.
  "chart-line": <path d="M3 17l6-6 4 4 8-8" />,
  "chart-area": (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M3 21h18" />
    </>
  ),
  "chart-bar": (
    <>
      <path d="M6 20V10" />
      <path d="M12 20V4" />
      <path d="M18 20v-7" />
    </>
  ),
  "chart-scatter": (
    <>
      <circle cx="6" cy="17" r="1.5" />
      <circle cx="11" cy="11" r="1.5" />
      <circle cx="17" cy="14" r="1.5" />
      <circle cx="18" cy="6" r="1.5" />
    </>
  ),
  // Dataset tiles in the workspace's switcher.
  bike: (
    <>
      <circle cx="5.5" cy="16.5" r="3.5" />
      <circle cx="18.5" cy="16.5" r="3.5" />
      <path d="M5.5 16.5l4-8h6l3 8" />
      <path d="M9.5 8.5L12 16.5h-1" />
      <path d="M14 5.5h2.5" />
    </>
  ),
  scoop: (
    <>
      <path d="M7 11a5 5 0 0 1 10 0" />
      <path d="M6 11h12l-6 10z" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
