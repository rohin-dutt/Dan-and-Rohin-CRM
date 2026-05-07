import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Login placeholder
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight">
            Personal CRM
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
            A simple place to remember who matters, when you last connected,
            and what to follow up on next.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700"
            >
              Preview Dashboard
            </Link>
            <Link
              href="/people"
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-100"
            >
              Browse People
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Authentication starts in a later phase. Use the preview links to
            explore the Phase 1 shell with fake data.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                disabled
                className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Not wired up yet"
                disabled
                className="w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
              />
            </div>
            <button
              type="button"
              disabled
              className="h-11 w-full rounded-md bg-zinc-300 px-4 text-sm font-medium text-zinc-600"
            >
              Sign in disabled for Phase 1
            </button>
            <p className="text-xs leading-5 text-zinc-500">
              No auth, database, API routes, or data mutations are implemented
              yet.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
