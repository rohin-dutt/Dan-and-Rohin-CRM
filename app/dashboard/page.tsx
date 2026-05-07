import Link from "next/link";

import AppLayout from "@/components/AppLayout";
import { people, type Person } from "@/lib/fake-data";

function PersonRow({ person, label }: { person: Person; label: string }) {
  return (
    <Link
      href={`/people/${person.id}`}
      className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{person.name}</h3>
          <p className="mt-1 text-sm text-zinc-600">
            {person.role} at {person.company}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
          {label}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
        <p>Last contacted: {person.lastContacted}</p>
        <p>Every {person.contactFrequencyDays} days</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const overduePeople = people.filter((person) =>
    ["jordan-lee", "ethan-brooks"].includes(person.id)
  );
  const dueThisWeekPeople = people.filter((person) =>
    ["maya-patel", "owen-chen"].includes(person.id)
  );
  const recentlyContactedPeople = people.filter((person) =>
    ["sofia-martinez", "nina-williams"].includes(person.id)
  );

  return (
    <AppLayout>
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Relationship follow-ups
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          A practical snapshot of who needs attention, who is coming up soon,
          and who you have already contacted recently.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Overdue</p>
          <p className="mt-2 text-3xl font-semibold text-red-950">
            {overduePeople.length}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-700">Due This Week</p>
          <p className="mt-2 text-3xl font-semibold text-amber-950">
            {dueThisWeekPeople.length}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">
            Recently Contacted
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-950">
            {recentlyContactedPeople.length}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Overdue</h2>
        <div className="mt-4 grid gap-3">
          {overduePeople.map((person) => (
            <PersonRow key={person.id} person={person} label="Follow up now" />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Due This Week</h2>
        <div className="mt-4 grid gap-3">
          {dueThisWeekPeople.map((person) => (
            <PersonRow key={person.id} person={person} label="This week" />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Recently Contacted</h2>
        <div className="mt-4 grid gap-3">
          {recentlyContactedPeople.map((person) => (
            <PersonRow key={person.id} person={person} label="Recent" />
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
