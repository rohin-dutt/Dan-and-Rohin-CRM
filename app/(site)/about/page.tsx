import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = { title: "About — Roots" };

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          About Roots
        </h1>
        <p className="mt-5 max-w-prose leading-7 text-muted-foreground">
          We all have people in our lives who matter more than we show.
        </p>
        <p className="mt-4 max-w-prose leading-7 text-muted-foreground">
          The professor who changed how you think about problems. The friend you could talk to for hours. The colleague who always had your back. People you genuinely enjoyed being around — and then life got busy, and somehow months turned into years.
        </p>
        <p className="mt-4 max-w-prose leading-7 text-muted-foreground">
          Roots started from a simple observation: the intention to reach out is almost never the problem. We mean to call. We think about people. We just forget. And by the time we remember, it feels like too much time has passed.
        </p>
        <p className="mt-4 max-w-prose leading-7 text-muted-foreground">
          We built Roots because we were tired of losing touch with people we actually care about. Not acquaintances — the real ones. The people who shaped who you are, who you'd drop everything for if they called.
        </p>
        <p className="mt-4 max-w-prose leading-7 text-muted-foreground">
          Roots is simple. Add the people who matter to you. Log when you connect. Let Roots remind you when it's been too long. That's it.
        </p>
        <p className="mt-4 max-w-prose leading-7 text-muted-foreground">
          No networking. No pipeline. No productivity system. Just a quiet nudge to reach out to the people you already know you should.
        </p>
        <p className="mt-4 max-w-prose leading-7 text-muted-foreground">
          Stay close to the people that matter most.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
