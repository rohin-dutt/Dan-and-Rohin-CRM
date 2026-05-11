import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Personal CRM
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight">
            Stay intentional with the relationships that matter.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
            Personal CRM helps you track contacts, last contact dates,
            interaction notes, and follow-ups so important relationships do not
            drift out of view.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700"
            >
              Sign up
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-100"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">What you can track</h2>
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Relationship history
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Keep a private record of who someone is, how you know them, and
                the context that matters before your next conversation.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Last contact dates
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                See when you last reached out and which relationships are due
                for attention.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Follow-up reminders
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Log interactions and capture next steps so follow-ups are easy
                to find when you need them.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
