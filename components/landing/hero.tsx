import { Icon } from "./icon";
import { ProductShot } from "./product-shot";
import { UploadCsvButton } from "./upload-csv-button";

export function Hero() {
  return (
    <section className="relative px-4 pt-14 md:px-6 md:pt-[104px]">
      <div aria-hidden="true" className="hero-dots pointer-events-none absolute inset-x-0 top-0 h-[620px] md:h-[760px]" />
      <div className="relative mx-auto flex max-w-[1200px] flex-col items-center text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-[5px] pr-3 pl-1.5 text-xs text-secondary md:gap-2.5 md:py-1.5 md:pr-3.5 md:pl-2 md:text-[13px]">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">Open source</span>
          <span className="md:hidden">Powered by Claude</span>
          <span className="hidden md:inline">Powered by Claude · Your data never leaves the browser</span>
        </p>
        <h1 className="mt-6 max-w-[900px] text-[50px] leading-none font-semibold tracking-[-0.045em] md:mt-7 md:text-[clamp(48px,7.4vw,92px)]">
          Charts, in{" "}
          <span className="font-serif-italic font-medium tracking-[-0.02em] italic text-accent">plain English.</span>
        </h1>
        <p className="mt-5 max-w-[620px] text-[17px] leading-[1.55] text-secondary md:mt-7 md:text-[clamp(18px,1.6vw,21px)]">
          Drop in a CSV and describe the chart you want. Chartseer draws it in seconds, then refines it as you talk. No
          formulas, no menus, no code.
        </p>
        <div className="mt-8 flex w-full flex-col gap-2.5 md:mt-10 md:w-auto md:flex-row md:flex-wrap md:justify-center md:gap-3">
          <UploadCsvButton icon className="min-h-[52px] rounded-xl px-6 text-base shadow-accent" />
          <a
            href="#demos"
            className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-6 text-base font-medium text-foreground"
          >
            Try a demo
            <Icon name="arrow-right" />
          </a>
        </div>
        <p className="mt-3.5 inline-flex items-center gap-[7px] text-[13px] text-muted md:mt-[18px] md:gap-2 md:text-sm">
          <Icon name="lock" size={14} />
          <span className="md:hidden">Your file stays in your browser. No sign-up.</span>
          <span className="hidden md:inline">No sign-up. Files up to 5 MB.</span>
        </p>
        <ProductShot />
      </div>
    </section>
  );
}
