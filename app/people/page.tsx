import Link from "next/link";

import { people } from "@/lib/fake-data";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <Link href="/" className="text-lg font-semibold">
            Personal CRM
          </Link>
          <nav className="mt-8 space-y-2 text-sm">
            <Link
              href="/dashboard"
              className="block rounded-md px-3 py-2 text-zinc-600 hover:bg-white hover:text-zinc-950"
            >
              Dashboard
            </Link>
            <Link
              href="/people"
              className="block rounded-md bg-zinc-900 px-3 py-2 font-medium text-white"
            >
              People
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export default function PeoplePage() {
  return (
    <AppLayout>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            People
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Relationship list
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
            Browse the fake contacts powering the Phase 1 app shell.
          </p>
        </div>
        <button
          type="button"
          className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700"
        >
          Add Person
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {people.map((person) => (
          <Link
            key={person.id}
            href={`/people/${person.id}`}
            className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{person.name}</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {person.role} at {person.company}
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                {person.relationshipStrength}
              </span>
            </div>

            <div className="mt-5 grid gap-3 text-sm text-zinc-600">
              <p>{person.relationshipType}</p>
              <p>{person.location}</p>
              <p>Last contacted: {person.lastContacted}</p>
            </div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
