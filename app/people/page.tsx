import Link from "next/link";

import AppLayout from "@/components/AppLayout";
import { people } from "@/lib/fake-data";

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
