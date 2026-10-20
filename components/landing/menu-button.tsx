"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icon";

// Phones only: the section links behind a disclosure button. A simple panel
// under the top bar, not a modal, so there's no focus trap.
export function MenuButton({ links }: { links: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] text-foreground"
      >
        <Icon name={open ? "close" : "menu"} size={22} strokeWidth={1.8} />
        <span className="sr-only">Menu</span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-10 border-b border-border-faint bg-page px-4 pt-2 pb-4"
      >
        <ul className="flex flex-col">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center text-[17px] text-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
