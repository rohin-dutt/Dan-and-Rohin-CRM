"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import type { Person } from "@/types/index";

function getDaysUntilDue(person: Person): number | null {
  if (!person.last_contacted_at) return null;
  const nextDue = new Date(person.last_contacted_at);
  nextDue.setDate(nextDue.getDate() + person.contact_frequency_days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDue.setHours(0, 0, 0, 0);
  return Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function dueLabel(days: number): string {
  if (days < 0) {
    const n = Math.abs(days);
    return n === 1 ? "1 day overdue" : `${n} days overdue`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `In ${days} days`;
}

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
            {[person.role, person.company].filter(Boolean).join(" at ")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
          {label}
        </span>
      </div>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-lg border border-zinc-100 bg-white px-4 py-5 text-sm text-zinc-400 shadow-sm">
      {message}
    </p>
  );
}

export default function DashboardPage() {
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
        .eq("user_id", user.id);

      if (data) setPeople(data);
      setLoading(false);
    }

    fetchPeople();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const overdue = people.filter((p) => {
    const days = getDaysUntilDue(p);
    return days !== null && days < 0;
  });

  const dueThisWeek = people.filter((p) => {
    const days = getDaysUntilDue(p);
    return days !== null && days >= 0 && days <= 7;
  });

  const recentlyContacted = people.filter((p) => {
    if (!p.last_contacted_at) return false;
    const lastContacted = new Date(p.last_contacted_at);
    lastContacted.setHours(0, 0, 0, 0);
    return lastContacted >= sevenDaysAgo;
  });

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

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">Overdue</p>
              <p className="mt-2 text-3xl font-semibold text-red-950">
                {overdue.length}
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-700">Due This Week</p>
              <p className="mt-2 text-3xl font-semibold text-amber-950">
                {dueThisWeek.length}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-700">
                Recently Contacted
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-950">
                {recentlyContacted.length}
              </p>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Overdue</h2>
            {overdue.length === 0 ? (
              <EmptyState message="No one overdue — nice work." />
            ) : (
              <div className="mt-4 grid gap-3">
                {overdue.map((person) => {
                  const days = getDaysUntilDue(person)!;
                  return (
                    <PersonRow
                      key={person.id}
                      person={person}
                      label={dueLabel(days)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Due This Week</h2>
            {dueThisWeek.length === 0 ? (
              <EmptyState message="No one due this week." />
            ) : (
              <div className="mt-4 grid gap-3">
                {dueThisWeek.map((person) => {
                  const days = getDaysUntilDue(person)!;
                  return (
                    <PersonRow
                      key={person.id}
                      person={person}
                      label={dueLabel(days)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Recently Contacted</h2>
            {recentlyContacted.length === 0 ? (
              <EmptyState message="No recent contacts in the last 7 days." />
            ) : (
              <div className="mt-4 grid gap-3">
                {recentlyContacted.map((person) => (
                  <PersonRow key={person.id} person={person} label="Recent" />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </AppLayout>
  );
}
