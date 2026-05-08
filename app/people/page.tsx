"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import type { Person } from "@/types/index";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPeople() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (data) setPeople(data);
      setLoading(false);
    }

    fetchPeople();
  }, []);

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
        </div>
        <Link
          href="/people/new"
          className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700"
        >
          Add Person
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : people.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-zinc-600">No people yet.</p>
          <Link
            href="/people/new"
            className="mt-4 inline-block text-sm font-medium text-zinc-900 underline"
          >
            Add your first person
          </Link>
        </div>
      ) : (
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
                    {[person.role, person.company]
                      .filter(Boolean)
                      .join(" at ")}
                  </p>
                </div>
                {person.relationship_strength && (
                  <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                    {person.relationship_strength}
                  </span>
                )}
              </div>
              <div className="mt-4 text-sm text-zinc-600">
                {person.last_contacted_at ? (
                  <p>Last contacted: {person.last_contacted_at}</p>
                ) : (
                  <p className="text-zinc-400">Never contacted</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
