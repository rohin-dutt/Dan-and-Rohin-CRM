import { SiteNav } from "./_components/SiteNav";
import { SiteFooter } from "./_components/SiteFooter";
import { Hero } from "./_components/Hero";
import { FeatureGrid } from "./_components/FeatureGrid";
import { HowItWorks } from "./_components/HowItWorks";
import { AppStoreBadge } from "./_components/AppStoreBadge";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />

      <main className="flex flex-1 flex-col">
        <Hero />

        <section className="px-6 py-20 sm:py-24">
          <p className="mx-auto max-w-[640px] text-center font-heading text-[clamp(2rem,4vw,2.5rem)] font-medium leading-snug text-foreground">
            Relationships don&rsquo;t fade because people stop caring. They fade
            because there&rsquo;s no easy way to stay close.
          </p>
        </section>

        <FeatureGrid />

        <HowItWorks />

        <section className="border-y border-border bg-secondary px-6 py-16">
          <p className="mx-auto max-w-2xl text-center text-lg leading-8 text-foreground">
            Just launched on the App Store. Built by two people who wanted
            this to exist — not a company trying to sell your data.
          </p>
        </section>

        <section className="px-6 py-20 sm:py-28">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <h2 className="font-heading text-[clamp(2rem,4vw,2.75rem)] font-semibold leading-tight text-foreground">
              Stay close to the people
              <br className="hidden sm:block" /> who matter most.
            </h2>
            <AppStoreBadge className="mt-8" />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
