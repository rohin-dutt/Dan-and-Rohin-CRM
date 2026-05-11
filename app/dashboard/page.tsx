"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { buttonVariants } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Person } from "@/types/index";

// --- Helpers ---

function getNextDueDays(person: Person): number | null {
  if (!person.last_contacted_at) return null;
  const nextDue = new Date(person.last_contacted_at);
  nextDue.setDate(nextDue.getDate() + person.contact_frequency_days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDue.setHours(0, 0, 0, 0);
  return Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// --- Section categorization ---

type Sections = {
  overdue: Person[];
  dueThisWeek: Person[];
  recentlyContacted: Person[];
  neglected: Person[];
};

function categorizePeople(people: Person[]): Sections {
  const overdue: Person[] = [];
  const dueThisWeek: Person[] = [];
  const recentlyContacted: Person[] = [];
  const neglected: Person[] = [];

  for (const person of people) {
    const days = getNextDueDays(person);
    const daysSince = getDaysSince(person.last_contacted_at);

    // Priority 1: Overdue — next due date is in the past
    if (days !== null && days < 0) {
      overdue.push(person);
      continue;
    }

    // Priority 2: Due this week — next due date is within 7 days
    if (days !== null && days >= 0 && days <= 7) {
      dueThisWeek.push(person);
      continue;
    }

    // Priority 3: Recently contacted — last contact within 7 days
    if (daysSince !== null && daysSince <= 7) {
      recentlyContacted.push(person);
      continue;
    }

    // Priority 4: Neglected — never contacted or last contact > 90 days ago
    if (person.last_contacted_at === null || (daysSince !== null && daysSince > 90)) {
      neglected.push(person);
    }
  }

  // Most overdue first (smallest / most negative days value)
  overdue.sort((a, b) => getNextDueDays(a)! - getNextDueDays(b)!);

  // Soonest due first
  dueThisWeek.sort((a, b) => getNextDueDays(a)! - getNextDueDays(b)!);

  // Most recently contacted first (smallest daysSince)
  recentlyContacted.sort(
    (a, b) => getDaysSince(a.last_contacted_at)! - getDaysSince(b.last_contacted_at)!,
  );

  // Longest neglected first — null (never contacted) before dated entries
  neglected.sort((a, b) => {
    if (!a.last_contacted_at && !b.last_contacted_at) return 0;
    if (!a.last_contacted_at) return -1;
    if (!b.last_contacted_at) return 1;
    return new Date(a.last_contacted_at).getTime() - new Date(b.last_contacted_at).getTime();
  });

  return { overdue, dueThisWeek, recentlyContacted, neglected };
}

// --- Components ---

function PersonCard({
  person,
  badge,
  badgeStyle,
  subtext,
  showQuickLog = false,
}: {
  person: Person;
  badge: string;
  badgeStyle: string;
  subtext?: string;
  showQuickLog?: boolean;
}) {
  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* Stretched link covering the whole card */}
      <Link
        href={`/people/${person.id}`}
        className="absolute inset-0 rounded-lg"
        aria-label={`View ${person.name}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900">{person.name}</p>
          {person.company && (
            <p className="mt-0.5 truncate text-sm text-zinc-500">{person.company}</p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            badgeStyle,
          )}
        >
          {badge}
        </span>
      </div>

      {subtext && <p className="mt-2 text-xs text-zinc-400">{subtext}</p>}

      {showQuickLog && (
        <div className="mt-3">
          <Link
            href={`/people/${person.id}/interactions/new`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "relative z-10",
            )}
          >
            Quick Log
          </Link>
        </div>
      )}
    </div>
  );
}

function SectionEmptyState({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-lg border border-zinc-100 bg-white px-4 py-4 text-sm text-zinc-400 shadow-sm">
      {message}
    </p>
  );
}

function StatCard({
  label,
  count,
  style,
}: {
  label: string;
  count: number;
  style: string;
}) {
  return (
    <div className={cn("rounded-lg border p-4", style)}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{count}</p>
    </div>
  );
}

function FirstRunEmptyState() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">
        Add your first contact to get started.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-600">
        Once you add someone, this dashboard will show who is overdue, who is
        coming up soon, and who you contacted recently.
      </p>
      <Link
        href="/people/new"
        className={cn(
          buttonVariants({ size: "sm" }),
          "mt-5 bg-zinc-900 text-white hover:bg-zinc-700",
        )}
      >
        Add contact
      </Link>
    </div>
  );
}

// --- Page ---

export default function DashboardPage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPeople() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        router.push("/auth/login");
        return;
      }

      const { data } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", user.id);

      if (data) setPeople(data);
      setLoading(false);
    }

    fetchPeople();
  }, [router]);

  const { overdue, dueThisWeek, recentlyContacted, neglected } = categorizePeople(people);

  return (
    <AppLayout>
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Relationship follow-ups</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          A practical snapshot of who needs attention, who is coming up soon, and who you have
          already contacted recently.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : people.length === 0 ? (
        <FirstRunEmptyState />
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <StatCard
              label="Overdue"
              count={overdue.length}
              style="border-red-200 bg-red-50 text-red-950 [&>p:first-child]:text-red-700"
            />
            <StatCard
              label="Due This Week"
              count={dueThisWeek.length}
              style="border-amber-200 bg-amber-50 text-amber-950 [&>p:first-child]:text-amber-700"
            />
            <StatCard
              label="Recently Contacted"
              count={recentlyContacted.length}
              style="border-emerald-200 bg-emerald-50 text-emerald-950 [&>p:first-child]:text-emerald-700"
            />
            <StatCard
              label="Neglected"
              count={neglected.length}
              style="border-zinc-200 bg-zinc-50 text-zinc-900 [&>p:first-child]:text-zinc-600"
            />
          </div>

          {/* Overdue */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-zinc-900">Overdue ({overdue.length})</h2>
            {overdue.length === 0 ? (
              <SectionEmptyState message="No one overdue — nice work." />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {overdue.map((person) => {
                  const days = Math.abs(getNextDueDays(person)!);
                  return (
                    <PersonCard
                      key={person.id}
                      person={person}
                      badge={`Overdue by ${plural(days, "day")}`}
                      badgeStyle="bg-red-100 text-red-700"
                      subtext={`Last contacted: ${formatDate(person.last_contacted_at)}`}
                      showQuickLog
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Due This Week */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-zinc-900">
              Due This Week ({dueThisWeek.length})
            </h2>
            {dueThisWeek.length === 0 ? (
              <SectionEmptyState message="No one due this week." />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dueThisWeek.map((person) => {
                  const days = getNextDueDays(person)!;
                  const badge = days === 0 ? "Due today" : `Due in ${plural(days, "day")}`;
                  return (
                    <PersonCard
                      key={person.id}
                      person={person}
                      badge={badge}
                      badgeStyle="bg-amber-100 text-amber-700"
                      subtext={`Last contacted: ${formatDate(person.last_contacted_at)}`}
                      showQuickLog
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Recently Contacted */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-zinc-900">
              Recently Contacted ({recentlyContacted.length})
            </h2>
            {recentlyContacted.length === 0 ? (
              <SectionEmptyState message="No recent contacts in the last 7 days." />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {recentlyContacted.map((person) => {
                  const daysSince = getDaysSince(person.last_contacted_at)!;
                  const badge =
                    daysSince === 0 ? "Contacted today" : `Contacted ${plural(daysSince, "day")} ago`;
                  const nextDays = getNextDueDays(person);
                  const nextDueText =
                    nextDays === null
                      ? undefined
                      : nextDays < 0
                        ? `Next due: ${plural(Math.abs(nextDays), "day")} ago`
                        : nextDays === 0
                          ? "Next due: today"
                          : `Next due: in ${plural(nextDays, "day")}`;
                  return (
                    <PersonCard
                      key={person.id}
                      person={person}
                      badge={badge}
                      badgeStyle="bg-emerald-100 text-emerald-700"
                      subtext={nextDueText}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Neglected */}
          <section className="mb-8 mt-10">
            <h2 className="text-lg font-semibold text-zinc-900">
              Neglected ({neglected.length})
            </h2>
            {neglected.length === 0 ? (
              <SectionEmptyState message="No one neglected — great job staying in touch." />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {neglected.map((person) => {
                  const daysSince = getDaysSince(person.last_contacted_at);
                  const badge =
                    daysSince === null
                      ? "Never contacted"
                      : `${plural(daysSince, "day")} since contact`;
                  return (
                    <PersonCard
                      key={person.id}
                      person={person}
                      badge={badge}
                      badgeStyle="bg-zinc-100 text-zinc-600"
                      showQuickLog
                    />
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </AppLayout>
  );
}
