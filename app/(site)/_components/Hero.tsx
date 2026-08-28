import { AppStoreBadge } from "./AppStoreBadge";
import { PhoneCarousel } from "./PhoneCarousel";
import { Reveal } from "./Reveal";

type Screen = { src: string; alt: string };

export function Hero({ screens }: { screens: Screen[] }) {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 translate-x-1/4 rounded-full bg-ring/25 opacity-60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-1/3 top-1/3 h-72 w-72 rounded-full bg-secondary opacity-70 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-2 md:gap-10">
        <div className="text-center md:text-left">
          <Reveal className="flex justify-center md:justify-start">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Now on the App Store
            </span>
          </Reveal>

          <Reveal delayMs={80}>
            <h1 className="mt-6 font-heading text-[clamp(2.5rem,5vw,3.5rem)] font-semibold leading-[1.05] text-foreground">
              Stay close to the people
              <br className="hidden sm:block" /> who matter most.
            </h1>
          </Reveal>

          <Reveal delayMs={160}>
            <p className="mx-auto mt-6 max-w-md text-lg leading-8 text-muted-foreground md:mx-0">
              Life gets busy. Roots makes sure the people who matter don&rsquo;t slip away.
            </p>
          </Reveal>

          <Reveal delayMs={240} className="flex justify-center md:justify-start">
            <AppStoreBadge className="mt-8" />
          </Reveal>
        </div>

        <div className="relative mx-auto w-full max-w-[320px] md:max-w-none">
          <PhoneCarousel screens={screens} />
        </div>
      </div>
    </section>
  );
}
