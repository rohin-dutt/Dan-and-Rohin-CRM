"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import type { Person, Interaction, Tag } from "@/types/index";

export default function PersonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [interactionsLoading, setInteractionsLoading] = useState(true);
  const [personTags, setPersonTags] = useState<Tag[]>([]);

  useEffect(() => {
    async function fetchPerson() {
      const { data } = await supabase
        .from("people")
        .select("*")
        .eq("id", params.id)
        .single();

      if (!data) {
        setNotFound(true);
      } else {
        setPerson(data);
      }
      setLoading(false);
    }

    async function fetchInteractions() {
      const { data } = await supabase
        .from("interactions")
        .select("*")
        .eq("person_id", params.id)
        .order("date", { ascending: false });

      setInteractions(data ?? []);
      setInteractionsLoading(false);
    }

    async function fetchTags() {
      const { data } = await supabase
        .from("person_tags")
        .select("tags(id, name, color)")
        .eq("person_id", params.id);

      if (data) {
        const rows = data as unknown as { tags: Tag[] }[];
        setPersonTags(rows.flatMap((row) => row.tags));
      }
    }

    fetchPerson();
    fetchInteractions();
    fetchTags();
  }, [params.id]);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this person?")) return;
    setDeleting(true);
    await supabase.from("people").delete().eq("id", params.id);
    router.push("/people");
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-sm text-zinc-500">Loading...</p>
      </AppLayout>
    );
  }

  if (notFound || !person) {
    return (
      <AppLayout>
        <Link href="/people" className="text-sm font-medium text-zinc-600">
          ← Back to people
        </Link>
        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-zinc-600">Person not found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <Link href="/people" className="text-sm font-medium text-zinc-600">
          ← Back to people
        </Link>
        <div className="flex gap-3">
          <Link
            href={`/people/${person.id}/edit`}
            className="inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex h-9 items-center rounded-md bg-red-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        {person.relationship_type && (
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            {person.relationship_type}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {person.name}
        </h1>
        {(person.role || person.company) && (
          <p className="mt-2 text-lg text-zinc-600">
            {[person.role, person.company].filter(Boolean).join(" at ")}
          </p>
        )}

        {personTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {personTags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {person.email && (
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Email
              </p>
              <p className="mt-2 font-semibold">{person.email}</p>
            </div>
          )}
          {person.phone && (
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Phone
              </p>
              <p className="mt-2 font-semibold">{person.phone}</p>
            </div>
          )}
          {person.location && (
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Location
              </p>
              <p className="mt-2 font-semibold">{person.location}</p>
            </div>
          )}
          {person.birthday && (
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Birthday
              </p>
              <p className="mt-2 font-semibold">{person.birthday}</p>
            </div>
          )}
          {person.relationship_strength && (
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Relationship Strength
              </p>
              <p className="mt-2 font-semibold">{person.relationship_strength}</p>
            </div>
          )}
          {person.preferred_contact_method && (
            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Preferred Contact
              </p>
              <p className="mt-2 font-semibold">{person.preferred_contact_method}</p>
            </div>
          )}
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Contact Rhythm
            </p>
            <p className="mt-2 font-semibold">
              Every {person.contact_frequency_days} days
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Last Contacted
            </p>
            <p className="mt-2 font-semibold">
              {person.last_contacted_at ?? "Never"}
            </p>
          </div>
          {person.how_met && (
            <div className="rounded-lg bg-zinc-50 p-4 md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                How Met
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                {person.how_met}
              </p>
            </div>
          )}
        </div>

        {person.notes && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Notes</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">
              {person.notes}
            </p>
          </section>
        )}
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Interaction Timeline</h2>
          <Link
            href={`/people/${person.id}/interactions/new`}
            className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700"
          >
            Log Interaction
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {interactionsLoading ? (
            <p className="text-sm text-zinc-500">Loading interactions...</p>
          ) : interactions.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-zinc-500">No interactions logged yet.</p>
              <Link
                href={`/people/${person.id}/interactions/new`}
                className="mt-3 inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700"
              >
                Log your first interaction
              </Link>
            </div>
          ) : (
            interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                    {interaction.type}
                  </span>
                  <span className="text-sm text-zinc-500">{interaction.date}</span>
                </div>
                {interaction.notes && (
                  <p className="mt-3 text-sm leading-6 text-zinc-700">
                    {interaction.notes}
                  </p>
                )}
                {interaction.follow_up_needed && (
                  <p className="mt-3 text-sm font-medium text-amber-600">
                    Follow-up needed
                    {interaction.follow_up_date
                      ? ` by ${interaction.follow_up_date}`
                      : ""}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </AppLayout>
  );
}
