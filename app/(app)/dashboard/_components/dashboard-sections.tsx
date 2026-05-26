"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  categorizePeople,
  getBirthdayReminders,
  getFollowUpQueue,
  getMostContacted,
  getNeedsAttention,
  getOnTimeRate,
  getTotalContacts,
  getTotalInteractions,
  pluralize,
} from "@/lib/crm-rules";
import { formatBirthdayDate, formatDate, todayInputValue } from "@/lib/date-utils";
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
    <div className="relative rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md">
      <Link
        href={`/people/${person.id}`}
        className="absolute inset-0 rounded-lg"
        aria-label={`View ${person.name}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{person.name}</p>
          {person.company && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
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
      {subtext && <p className="mt-2 text-xs text-muted-foreground">{subtext}</p>}
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
    <p className="mt-3 rounded-lg border border-border bg-card px-4 py-4 text-sm text-muted-foreground shadow-sm">
      {message}
    </p>
  );
}

function StatCard({
  label,
  count,
  style,
  href,
}: {
  label: string;
  count: number;
  style: string;
  href?: string;
}) {
  const inner = (
    <div className={cn("rounded-lg border p-4 transition", style, href && "hover:shadow-md hover:border-primary/30 cursor-pointer")}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{count}</p>
    </div>
  );
  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null

  const emoji = streak >= 100 ? "🏆"
    : streak >= 30 ? "⭐"
    : "🔥"

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1">
      <span className="text-sm">{emoji}</span>
      <span className="text-sm font-semibold text-orange-700">
        {streak} day streak
      </span>
    </div>
  )
}

function StreakLostBanner({ previousStreak }: { previousStreak: number }) {
  if (previousStreak === 0) return null
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-3 py-1 text-sm text-muted-foreground">
      <span>💔</span>
      <span>Your {previousStreak} day streak ended — start a new one today</span>
    </div>
  )
}

function MilestoneCelebration({ streak }: { streak: number }) {
  const milestones = [7, 30, 100]
  if (!milestones.includes(streak)) return null

  const key = `roots-milestone-shown-${streak}`
  if (typeof window !== "undefined" && sessionStorage.getItem(key)) return null
  if (typeof window !== "undefined") {
    sessionStorage.setItem(key, "true")
  }

  const messages: Record<number, string> = {
    7: "7 day streak! You're building a habit. 🔥",
    30: "30 days! Roots is working. ⭐",
    100: "100 days! You're remarkable. 🏆"
  }

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800 mb-4">
      {messages[streak]}
    </div>
  )
}

export function FirstRunEmptyState() {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-foreground">
        Add your first person to get started.
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Once you add someone, Roots will show you who to reach out to and when.
      </p>
      <Link
        href="/people/new"
        className={cn(buttonVariants({ size: "sm" }), "mt-5")}
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
  const today = todayInputValue();
  const todayDate = new Date(today + "T00:00:00");

  const splitDue = queue.due.map((item: FollowUpInteraction) => {
    const rawDate = item.follow_up_date;
    if (!rawDate) {
      return { ...item, state: "Due Soon", style: "bg-amber-100 text-amber-700" };
    }
    const dateStr =
      typeof rawDate === "string" && rawDate.includes("T") ? rawDate.slice(0, 10) : rawDate;
    const dueDate = new Date(dateStr + "T00:00:00");
    const days = Math.round((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 7) {
      return { ...item, state: "Coming Up", style: "bg-sky-100 text-sky-700" };
    }
    return { ...item, state: "Due Soon", style: "bg-amber-100 text-amber-700" };
  });

  const visible = [
    ...queue.overdue.map((item: FollowUpInteraction) => ({
      ...item,
      state: "Overdue",
      style: "bg-red-100 text-red-700",
    })),
    ...queue.due_today.map((item: FollowUpInteraction) => ({
      ...item,
      state: "Due today",
      style: "bg-red-100 text-red-700",
    })),
    ...splitDue,
    ...queue.snoozed.map((item: FollowUpInteraction) => ({
      ...item,
      state: "Snoozed",
      style: "bg-muted text-muted-foreground",
    })),
  ].slice(0, 6);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-foreground">
        Open follow-ups ({visible.length})
      </h2>
      {visible.length === 0 ? (
        <SectionEmptyState message="You're all caught up 🌱" />
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {visible.map((interaction) => (
            <Link
              key={interaction.id}
              href={`/people/${interaction.person_id}`}
              className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {interaction.person_name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
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
              <p className="mt-3 text-xs text-muted-foreground">
                Follow up: {formatDate(interaction.follow_up_date)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function MilestonesSection({
  people,
  interactions,
}: {
  people: Person[];
  interactions: Interaction[];
}) {
  const onTimeRate = getOnTimeRate(people);
  const mostContacted = getMostContacted(people, interactions) as Person | null;
  const needsAttention = getNeedsAttention(people) as Person | null;

  const stats = [
    { label: "Total contacts", value: String(getTotalContacts(people)) },
    {
      label: "Interactions logged",
      value: String(getTotalInteractions(interactions)),
    },
    {
      label: "On-time rate",
      value: onTimeRate === null ? "—" : `${onTimeRate}%`,
    },
    { label: "Most contacted", value: mostContacted?.name ?? "—" },
    { label: "Needs attention", value: needsAttention?.name ?? "—" },
  ];

  return (
    <section className="mb-8 mt-10">
      <h2 className="text-lg font-semibold text-emerald-700">Your Roots</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 truncate text-2xl font-semibold text-foreground">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardSections({
  people,
  followUps,
  streak,
  streakLost,
  previousStreak,
  onStreakUpdate,
}: {
  people: Person[];
  followUps: FollowUpInteraction[];
  streak: number;
  streakLost: boolean;
  previousStreak: number;
  onStreakUpdate: () => void;
}) {
  const { overdue, dueThisWeek, comingUp } = categorizePeople(people, new Date(), followUps);
  const birthdays = getBirthdayReminders(people);

  return (
    <>
      <MilestoneCelebration streak={streak} />
      {streakLost ? (
        <div className="mb-4">
          <StreakLostBanner previousStreak={previousStreak} />
        </div>
      ) : streak > 0 ? (
        <div className="mb-4">
          <StreakBadge streak={streak} />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <StatCard
          label="Overdue"
          count={overdue.length}
          style="border-red-200 bg-red-50 text-red-950 [&>p:first-child]:text-red-700"
          href="/people?status=overdue"
        />
        <StatCard
          label="Due This Week"
          count={dueThisWeek.length}
          style="border-amber-200 bg-amber-50 text-amber-950 [&>p:first-child]:text-amber-700"
          href="/people?status=due_this_week"
        />
        <StatCard
          label="Coming Up"
          count={comingUp.length}
          style="border-sky-200 bg-sky-50 text-sky-950 [&>p:first-child]:text-sky-700"
          href="/people?status=coming_up"
        />
      </div>

      <FollowUpQueue interactions={followUps} />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">
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
                  subtext={`Birthday: ${formatBirthdayDate(nextBirthday)}`}
                />
              )
            )}
          </div>
        )}
      </section>

      <MilestonesSection people={people} interactions={followUps} />
    </>
  );
}
