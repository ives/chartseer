import type { ReactNode } from "react";

// A section's eyebrow, heading and lead paragraph.
export function SectionIntro({
  id,
  eyebrow,
  title,
  children,
  className = "max-w-[680px]",
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-mono text-xs tracking-[0.08em] text-accent uppercase md:text-[13px]">{eyebrow}</p>
      <h2
        id={id}
        className="mt-3 text-[clamp(36px,4.4vw,56px)] leading-[1.05] font-semibold tracking-[-0.035em] md:mt-3.5"
      >
        {title}
      </h2>
      <p className="mt-3.5 text-[17px] leading-[1.55] text-secondary md:mt-[18px] md:text-[19px]">{children}</p>
    </div>
  );
}
