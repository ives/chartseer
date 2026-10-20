import { sectionLinks } from "./links";
import { Wordmark } from "./wordmark";

export function Footer() {
  return (
    <footer className="px-4 pt-[72px] pb-12 md:px-6 md:pt-24 md:pb-14">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col gap-6 border-border-card md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-8 md:border-b md:pb-8">
          <div>
            <Wordmark className="text-[22px] md:text-2xl" />
            <p className="mt-1.5 text-[15px] text-muted md:mt-2">Charts, in plain English.</p>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[15px] md:flex md:flex-wrap md:gap-7">
            {sectionLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="flex min-h-11 items-center text-secondary hover:text-foreground md:min-h-0">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-border-card pt-5 text-[13px] leading-normal text-muted md:mt-0 md:flex-row md:flex-wrap md:justify-between md:gap-3 md:border-t-0 md:pt-6">
          <p>© 2026 Ives · MIT licence · Built with Claude</p>
          <p>Santander Cycles data powered by TfL Open Data. Chartseer is not an official TfL product.</p>
        </div>
      </div>
    </footer>
  );
}
