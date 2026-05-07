import Link from "next/link";
import { notFound } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import {
  getInteractionsForPerson,
  getPersonById,
  people,
} from "@/lib/fake-data";

export async function generateStaticParams() {
  return people.map((person) => ({
    id: person.id,
  }));
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = getPersonById(id);

  if (!person) {
    notFound();
  }

  const personInteractions = getInteractionsForPerson(person.id);

  return (
    <AppLayout>
      <Link href="/people" className="text-sm font-medium text-zinc-600">
        Back to people
      </Link>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {person.relationshipType}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {person.name}
        </h1>
        <p className="mt-2 text-lg text-zinc-600">
          {person.role} at {person.company}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Relationship Strength
            </p>
            <p className="mt-2 font-semibold">{person.relationshipStrength}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Preferred Contact
            </p>
            <p className="mt-2 font-semibold">
              {person.preferredContactMethod}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Location
            </p>
            <p className="mt-2 font-semibold">{person.location}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Contact Rhythm
            </p>
            <p className="mt-2 font-semibold">
              Every {person.contactFrequencyDays} days
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Last Contacted
            </p>
            <p className="mt-2 font-semibold">{person.lastContacted}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              How Met
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              {person.howMet}
            </p>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Notes</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
            {person.notes}
          </p>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Interaction Timeline</h2>
        <div className="mt-4 space-y-3">
          {personInteractions.map((interaction) => (
            <article
              key={interaction.id}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-semibold">{interaction.type}</h3>
                <p className="text-sm text-zinc-500">{interaction.date}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-700">
                {interaction.notes}
              </p>
            </article>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
