import Link from "next/link";
import { Icon } from "./icon";
import { sectionLinks } from "./links";
import { MenuButton } from "./menu-button";
import { Wordmark } from "./wordmark";

export function TopBar() {
  return (
    <header className="relative z-10 border-b border-border-faint bg-page/85">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 md:gap-6 md:px-6 md:py-[18px]"
      >
        <Wordmark className="text-[23px] md:text-[26px]" />
        <ul className="hidden items-center gap-8 text-[15px] md:flex">
          {sectionLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-secondary hover:text-foreground">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <Link
            href="/app"
            className="inline-flex min-h-10 items-center gap-2 rounded-[10px] bg-ink px-3.5 text-sm font-medium text-on-ink md:px-4"
          >
            <span className="md:hidden">Open app</span>
            <span className="hidden md:inline">Open the app</span>
            <Icon name="arrow-right" size={14} className="hidden md:block" />
          </Link>
          <div className="md:hidden">
            <MenuButton links={sectionLinks} />
          </div>
        </div>
      </nav>
    </header>
  );
}
