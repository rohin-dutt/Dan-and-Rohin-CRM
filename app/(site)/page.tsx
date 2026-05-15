import Link from "next/link";

const focusAreas = [
  {
    title: "Remember the context",
    body: "Keep notes, relationship strength, birthdays, tags, and history together before the next conversation.",
  },
  {
    title: "See what needs attention",
    body: "Dashboard categories surface overdue follow-ups, quiet relationships, upcoming birthdays, and recent activity.",
  },
  {
    title: "Keep your data portable",
    body: "Export, import, and restore JSON so the CRM stays private, inspectable, and easy to move.",
  },
];

const previewRows = [
  {
    name: "Maya Chen",
    detail: "Follow up about the grant intro",
    state: "Due today",
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    name: "Jordan Patel",
    detail: "Last coffee catch-up was 5 weeks ago",
    state: "Reconnect",
    tone: "bg-amber-50 text-amber-700",
  },
  {
    name: "Sam Rivera",
    detail: "Birthday in 9 days",
    state: "Upcoming",
    tone: "bg-sky-50 text-sky-700",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <img src="/logo.svg" alt="" aria-hidden="true" width="28" height="28" />
          Roots
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/auth/login"
            className="rounded-md px-3 py-2 font-medium text-foreground transition hover:bg-muted"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground transition hover:bg-primary/80"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-12 pt-8 md:pb-16 md:pt-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-primary">
            Private relationship tracker
          </p>
          <div className="mt-4 flex items-center gap-4">
            <img src="/logo.svg" alt="" aria-hidden="true" width="48" height="48" />
            <h1 className="text-4xl font-semibold leading-[1.05] text-primary sm:text-5xl lg:text-6xl">
              Roots
            </h1>
          </div>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
            Stay intentional with friends, mentors, collaborators, and clients
            by keeping contact context, interaction history, and follow-ups in
            one focused workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80"
            >
              Create your CRM
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-primary bg-card px-5 text-sm font-medium text-foreground shadow-sm transition hover:bg-primary/10"
            >
              Sign in
            </Link>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
            <div className="border-l-2 border-primary pl-3">
              <p className="font-semibold text-foreground">Notes</p>
              <p className="mt-1 text-muted-foreground">History and context</p>
            </div>
            <div className="border-l-2 border-accent pl-3">
              <p className="font-semibold text-foreground">Follow-ups</p>
              <p className="mt-1 text-muted-foreground">Due, done, snoozed</p>
            </div>
            <div className="border-l-2 border-sky-500 pl-3">
              <p className="font-semibold text-foreground">Portability</p>
              <p className="mt-1 text-muted-foreground">JSON import and export</p>
            </div>
          </div>
        </div>

        <div
          aria-label="Product preview"
          className="overflow-hidden rounded-lg border border-border bg-primary shadow-xl"
        >
          <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-primary/80 px-4">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-200/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/80" />
            <span className="ml-3 text-xs font-medium text-primary-foreground/70">
              Dashboard
            </span>
          </div>
          <div className="grid gap-5 bg-background p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">Due now</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">4</p>
              </div>
              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">Recent</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">12</p>
              </div>
              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">Birthdays</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">3</p>
              </div>
            </div>

            <div className="rounded-md border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">
                  Relationships needing attention
                </p>
              </div>
              <div className="divide-y divide-border">
                {previewRows.map((row) => (
                  <div
                    key={row.name}
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {row.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {row.detail}
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-medium ${row.tone}`}
                    >
                      {row.state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted px-6 py-12">
        <div className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-3">
          {focusAreas.map((area) => (
            <article
              key={area.title}
              className="rounded-lg border border-border bg-card p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-foreground">
                {area.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {area.body}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
