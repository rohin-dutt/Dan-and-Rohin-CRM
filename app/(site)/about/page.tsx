import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = { title: "About — Roots" };

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-[720px] flex-1 px-6 py-16 sm:py-20">
        <h1 className="text-center font-heading text-4xl font-semibold text-foreground sm:text-5xl">
          About Roots
        </h1>
        <div className="mx-auto mt-10 max-w-prose space-y-6 leading-7 text-muted-foreground">
          <p>
            We all have people in our lives who matter more than we show.
          </p>
          <p>
            The friend you could talk to for hours. The colleague who always had your back. The professor who changed how you think about problems.
          </p>
          <p>
            And then life got busy, and somehow months turned into years. Roots started from a simple observation: the intention to reach out is almost never the problem. We mean to call. We think about people. We just forget. And by the time we remember, it feels like too much time has passed.
          </p>
          <p>
            We built Roots because we were tired of losing touch with people we actually care about — the ones who shaped who we are.
          </p>
          <p>
            Roots is simple. Add the people who matter to you. Note when you connect. Let Roots remind you when it's been too long. That's it.
          </p>
          <p>
            No networking. No pipeline. No productivity system. Just a quiet nudge to reach out to the people you already know you should.
          </p>
          <p>
            Stay close to the people that matter.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
