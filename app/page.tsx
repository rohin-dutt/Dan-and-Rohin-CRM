import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="w-full max-w-4xl">
        <div className="mb-10">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Phase 1 app shell
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight">
            Personal CRM
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
            A simple place to remember who matters, when you last connected,
            and what to follow up on next.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
          >
            <h2 className="text-xl font-semibold">Open Dashboard</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Review overdue relationships, upcoming follow-ups, and recent
              activity.
            </p>
          </Link>

          <Link
            href="/people"
            className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
          >
            <h2 className="text-xl font-semibold">View People</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Browse fake contacts and open a profile with relationship notes
              and interactions.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
