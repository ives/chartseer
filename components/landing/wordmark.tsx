import Link from "next/link";

// The wordmark, linking home. The app's header draws the same mark (D-054).
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-baseline gap-[3px] font-serif font-semibold tracking-[-0.01em] text-foreground ${className}`}
    >
      Chartseer
      <span aria-hidden="true" className="inline-block size-[0.26em] bg-accent" />
    </Link>
  );
}
