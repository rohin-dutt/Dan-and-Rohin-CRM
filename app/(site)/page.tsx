import Link from "next/link";
import { SiteNav } from "./_components/SiteNav";
import { SiteFooter } from "./_components/SiteFooter";

const features = [
  {
    title: "Remember",
    body: "Keep notes, birthdays, tags, and interaction history so you always have context before reaching out.",
  },
  {
    title: "Follow through",
    body: "Set follow-ups and see what's overdue so nothing slips — every commitment, surfaced on time.",
  },
  {
    title: "Stay close",
    body: "See which relationships have gone quiet and reach out before the silence becomes permanent.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />

      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-16 text-center">
          <h1 className="font-heading text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
            Stay close to the people<br className="hidden sm:block" /> who matter most.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Life gets busy. Roots makes sure the people who matter don't slip away.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="#"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80"
            >
              Download on the App Store
            </Link>
          </div>
        </section>

        <section className="border-t border-border bg-muted px-6 py-16">
          <div className="mx-auto grid w-full max-w-6xl gap-6 md:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.title}
                className="rounded-lg border border-border bg-card p-7 shadow-sm"
              >
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  {f.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
