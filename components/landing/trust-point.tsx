import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

// One of the four "Under the hood" points: icon beside the text on phones, above it on wider screens.
export function TrustPoint({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <li className="flex min-w-0 grow gap-4 md:block md:basis-[220px]">
      <span className="inline-flex size-10 flex-none items-center justify-center rounded-[11px] bg-accent-soft text-accent">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <h3 className="text-[17px] font-semibold tracking-[-0.015em] md:mt-4 md:text-lg">{title}</h3>
        <p className="mt-1 text-[15px] leading-[1.55] text-secondary md:mt-1.5">{children}</p>
      </div>
    </li>
  );
}
