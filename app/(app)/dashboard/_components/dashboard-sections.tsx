"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  categorizePeople,
  getBirthdayReminders,
  getDaysSince,
  getFollowUpQueue,
  getNextDueDays,
  pluralize,
} from "@/lib/crm-rules";
import { formatDate, formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { Interaction, Person } from "@/types/index";

export type FollowUpInteraction = Interaction & {
  person_name: string;
};

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
      <Link
        href={`/people/${person.id}`}
        className="absolute inset-0 rounded-lg"
        aria-label={`View ${person.name}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900">{person.name}</p>
          {person.company && (
            <p className="mt-0.5 truncate text-sm text-zinc-500">
              {person.company}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            badgeStyle
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
              "relative z-10"
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

export function FirstRunEmptyState() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">
        Add your first contact to get started.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-600">
        Once you add someone, this dashboard will show follow-ups, birthdays,
        and relationship cadence.
      </p>
      <Link
        href="/people/new"
        className={cn(
          buttonVariants({ size: "sm" }),
          "mt-5 bg-zinc-900 text-white hover:bg-zinc-700"
        )}
      >
        Add contact
      </Link>
    </div>
  );
}

function FollowUpQueue({
  interactions,
}: {
  interactions: FollowUpInteraction[];
}) {
  const queue = getFollowUpQueue(interactions);
  const visible = [
    ...queue.overdue.map((item: FollowUpInteraction) => ({
      ...item,
      state: "Overdue",
      style: "bg-red-100 text-red-700",
    })),
    ...queue.due.map((item: FollowUpInteraction) => ({
      ...item,
      state: "Due",
      style: "bg-amber-100 text-amber-700",
    })),
    ...queue.snoozed.map((item: FollowUpInteraction) => ({
      ...item,
      state: "Snoozed",
      style: "bg-zinc-100 text-zinc-600",
    })),
  ].slice(0, 6);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-zinc-900">
        Follow-up Queue ({visible.length})
      </h2>
      {visible.length === 0 ? (
        <SectionEmptyState message="No active follow-ups." />
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {visible.map((interaction) => (
            <Link
              key={interaction.id}
              href={`/people/${interaction.person_id}`}
              className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">
                    {interaction.person_name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {interaction.type} on {formatDate(interaction.date)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    interaction.style
                  )}
                >
                  {interaction.state}
                </span>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Follow up: {formatDate(interaction.follow_up_date)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function DashboardSections({
  people,
  followUps,
}: {
  people: Person[];
  followUps: FollowUpInteraction[];
}) {
  const { overdue, dueThisWeek, comingUp, recentlyContacted, neglected } =
    categorizePeople(people);
  const birthdays = getBirthdayReminders(people);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
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
          label="Coming Up"
          count={comingUp.length}
          style="border-sky-200 bg-sky-50 text-sky-950 [&>p:first-child]:text-sky-700"
        />
        <StatCard
          label="Recent"
          count={recentlyContacted.length}
          style="border-emerald-200 bg-emerald-50 text-emerald-950 [&>p:first-child]:text-emerald-700"
        />
        <StatCard
          label="Neglected"
          count={neglected.length}
          style="border-zinc-200 bg-zinc-50 text-zinc-900 [&>p:first-child]:text-zinc-600"
        />
      </div>

      <FollowUpQueue interactions={followUps} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Overdue ({overdue.length})
        </h2>
        {overdue.length === 0 ? (
          <SectionEmptyState message="No one overdue." />
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overdue.map((person: Person) => {
              const days = Math.abs(getNextDueDays(person) ?? 0);
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  badge={`Overdue by ${pluralize(days, "day")}`}
                  badgeStyle="bg-red-100 text-red-700"
                  subtext={`Last contacted: ${formatDate(person.last_contacted_at)}`}
                  showQuickLog
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Due This Week ({dueThisWeek.length})
        </h2>
        {dueThisWeek.length === 0 ? (
          <SectionEmptyState message="No one due this week." />
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dueThisWeek.map((person: Person) => {
              const days = getNextDueDays(person);
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  badge={
                    days === 0
                      ? "Due today"
                      : `Due in ${pluralize(days, "day")}`
                  }
                  badgeStyle="bg-amber-100 text-amber-700"
                  subtext={`Last contacted: ${formatDate(person.last_contacted_at)}`}
                  showQuickLog
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Coming Up ({comingUp.length})
        </h2>
        {comingUp.length === 0 ? (
          <SectionEmptyState message="No steady-state contacts waiting in the queue." />
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comingUp.map((person: Person) => {
              const days = getNextDueDays(person);
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  badge={
                    days === null
                      ? "Not scheduled"
                      : `Due in ${pluralize(days, "day")}`
                  }
                  badgeStyle="bg-sky-100 text-sky-700"
                  subtext={`Last contacted: ${formatDate(person.last_contacted_at)}`}
                  showQuickLog
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Birthdays ({birthdays.length})
        </h2>
        {birthdays.length === 0 ? (
          <SectionEmptyState message="No birthdays in the next 30 days." />
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {birthdays.map(
              ({
                person,
                nextBirthday,
                daysUntil,
              }: {
                person: Person;
                nextBirthday: Date;
                daysUntil: number;
              }) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  badge={
                    daysUntil === 0
                      ? "Today"
                      : `In ${pluralize(daysUntil, "day")}`
                  }
                  badgeStyle="bg-fuchsia-100 text-fuchsia-700"
                  subtext={`Birthday: ${formatShortDate(nextBirthday)}`}
                />
              )
            )}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Recently Contacted ({recentlyContacted.length})
        </h2>
        {recentlyContacted.length === 0 ? (
          <SectionEmptyState message="No recent contacts in the last 7 days." />
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyContacted.map((person: Person) => {
              const daysSince = getDaysSince(person.last_contacted_at);
              const nextDays = getNextDueDays(person);
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  badge={
                    daysSince === 0
                      ? "Contacted today"
                      : `Contacted ${pluralize(daysSince, "day")} ago`
                  }
                  badgeStyle="bg-emerald-100 text-emerald-700"
                  subtext={
                    nextDays === null
                      ? undefined
                      : nextDays === 0
                        ? "Next due: today"
                        : `Next due: in ${pluralize(nextDays, "day")}`
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8 mt-10">
        <h2 className="text-lg font-semibold text-zinc-900">
          Neglected ({neglected.length})
        </h2>
        {neglected.length === 0 ? (
          <SectionEmptyState message="No one neglected." />
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {neglected.map((person: Person) => {
              const daysSince = getDaysSince(person.last_contacted_at);
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  badge={
                    daysSince === null
                      ? "Never contacted"
                      : `${pluralize(daysSince, "day")} since contact`
                  }
                  badgeStyle="bg-zinc-100 text-zinc-600"
                  showQuickLog
                />
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
