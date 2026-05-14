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
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-base font-semibold text-zinc-950">
          Personal CRM
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/auth/login"
            className="rounded-md px-3 py-2 font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md bg-zinc-950 px-3 py-2 font-medium text-white transition hover:bg-zinc-700"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-12 pt-8 md:pb-16 md:pt-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-emerald-700">
            Private relationship tracker
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.05] text-zinc-950 sm:text-5xl lg:text-6xl">
            Personal CRM
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
            Stay intentional with friends, mentors, collaborators, and clients
            by keeping contact context, interaction history, and follow-ups in
            one focused workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700"
            >
              Create your CRM
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-100"
            >
              Sign in
            </Link>
          </div>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
            <div className="border-l-2 border-emerald-500 pl-3">
              <p className="font-semibold text-zinc-950">Notes</p>
              <p className="mt-1 text-zinc-500">History and context</p>
            </div>
            <div className="border-l-2 border-amber-500 pl-3">
              <p className="font-semibold text-zinc-950">Follow-ups</p>
              <p className="mt-1 text-zinc-500">Due, done, snoozed</p>
            </div>
            <div className="border-l-2 border-sky-500 pl-3">
              <p className="font-semibold text-zinc-950">Portability</p>
              <p className="mt-1 text-zinc-500">JSON import and export</p>
            </div>
          </div>
        </div>

        <div
          aria-label="Product preview"
          className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950 shadow-xl"
        >
          <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-zinc-900 px-4">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs font-medium text-zinc-400">
              Dashboard
            </span>
          </div>
          <div className="grid gap-5 bg-zinc-50 p-4 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-md border border-zinc-200 bg-white p-4">
                <p className="text-xs font-medium text-zinc-500">Due now</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">4</p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-4">
                <p className="text-xs font-medium text-zinc-500">Recent</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">12</p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-white p-4">
                <p className="text-xs font-medium text-zinc-500">Birthdays</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-950">3</p>
              </div>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-950">
                  Relationships needing attention
                </p>
              </div>
              <div className="divide-y divide-zinc-100">
                {previewRows.map((row) => (
                  <div
                    key={row.name}
                    className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-950">
                        {row.name}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
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

      <section className="border-t border-zinc-200 bg-zinc-50 px-6 py-12">
        <div className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-3">
          {focusAreas.map((area) => (
            <article
              key={area.title}
              className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-zinc-950">
                {area.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {area.body}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
