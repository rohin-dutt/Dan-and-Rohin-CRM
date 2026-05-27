"use client";

import Link from "next/link";

import {
  getNextDueDays,
  getRelationshipStatus,
  pluralize,
} from "@/lib/crm-rules";
import { formatDate } from "@/lib/date-utils";
import type { Interaction, Person, Tag } from "@/types/index";

function statusBadge(person: Person, activeFollowUpDate: string | null = null) {
  const status = getRelationshipStatus(person);
  const nextDueDays = getNextDueDays(person);

  if (activeFollowUpDate) {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const [fuYear, fuMonth, fuDay] = activeFollowUpDate.split("-").map(Number);
    const followUpDateObj = new Date(fuYear, fuMonth - 1, fuDay);
    const followUpDays = Math.round(
      (followUpDateObj.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isSoonerThanCadence = nextDueDays === null || followUpDays < nextDueDays;
    if (isSoonerThanCadence) {
      if (followUpDays < 0) {
        return { label: "Follow-up overdue", className: "bg-red-100 text-red-700" };
      }
      if (followUpDays <= 7) {
        return { label: "Due This Week", className: "bg-amber-100 text-amber-700" };
      }
      return {
        label: `Follow up: ${formatDate(activeFollowUpDate)}`,
        className: "bg-sky-100 text-sky-700",
      };
    }
  }

  if (status === "overdue") {
    return {
      label: `Overdue by ${pluralize(Math.abs(nextDueDays ?? 0), "day")}`,
      className: "bg-red-100 text-red-700",
    };
  }
  if (status === "due_this_week") {
    return {
      label: nextDueDays === 0 ? "Due today" : `Due in ${pluralize(nextDueDays, "day")}`,
      className: "bg-amber-100 text-amber-700",
    };
  }
  if (status === "recent") {
    return { label: "Recent", className: "bg-emerald-100 text-emerald-700" };
  }
  if (status === "neglected") {
    return { label: "Not yet contacted", className: "bg-muted text-muted-foreground" };
  }
  return {
    label:
      nextDueDays === null ? "Not scheduled" : `Due in ${pluralize(nextDueDays, "day")}`,
    className: "bg-sky-100 text-sky-700",
  };
}

export function PeopleHeader({
  exporting,
  onExport,
}: {
  exporting: boolean;
  onExport: () => void;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          People
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Your people
        </h1>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onExport}
          disabled={exporting}
          className="inline-flex h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export Data"}
        </button>
        <Link
          href="/people/new"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80"
        >
          Add someone
        </Link>
      </div>
    </div>
  );
}

export function PeopleFilters({
  query,
  statusFilter,
  tagFilter,
  sortFilter,
  tags,
  onQueryChange,
  onStatusFilterChange,
  onTagFilterChange,
  onSortFilterChange,
}: {
  query: string;
  statusFilter: string;
  tagFilter: string;
  sortFilter: string;
  tags: Tag[];
  onQueryChange: (query: string) => void;
  onStatusFilterChange: (status: string) => void;
  onTagFilterChange: (tagId: string) => void;
  onSortFilterChange: (sort: string) => void;
}) {
  function statusBtnClass(key: string) {
    return `rounded-full px-3 py-1 text-sm font-medium transition ${
      statusFilter === key
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    }`;
  }

  return (
    <>
      <div className="mb-4">
        <label htmlFor="people-search" className="sr-only">
          Search people
        </label>
        <input
          id="people-search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search name, company, role, email, notes, or tags..."
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button onClick={() => onStatusFilterChange("all")} className={statusBtnClass("all")}>
          All
        </button>
        <button
          onClick={() => onStatusFilterChange("overdue")}
          className={statusBtnClass("overdue")}
        >
          Overdue
        </button>
        <button
          onClick={() => onStatusFilterChange("due_this_week")}
          className={statusBtnClass("due_this_week")}
        >
          Due This Week
        </button>
        <button
          onClick={() => onStatusFilterChange("coming_up")}
          className={statusBtnClass("coming_up")}
        >
          Coming Up
        </button>
        <button
          onClick={() => onStatusFilterChange("neglected")}
          className={statusBtnClass("neglected")}
        >
          Not yet contacted
        </button>

        {tags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(event) => onTagFilterChange(event.target.value)}
            className={`cursor-pointer rounded-full py-1 pl-3 pr-7 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary ${
              tagFilter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <option value="">All Tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={sortFilter}
          onChange={(event) => onSortFilterChange(event.target.value)}
          className="cursor-pointer rounded-full bg-muted py-1 pl-3 pr-7 text-sm font-medium text-muted-foreground transition hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="last_contacted">Last contacted</option>
          <option value="most_contacted">Most contacted</option>
          <option value="date_added">Date added</option>
          <option value="name">A–Z</option>
        </select>
      </div>
    </>
  );
}

export function PeopleEmptyState({
  noFiltersActive,
  onClearFilters,
}: {
  noFiltersActive: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">
        {noFiltersActive ? "No one here yet." : "No people match your filters."}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {noFiltersActive
          ? "Add someone you want to stay close to."
          : "Try a broader search or clear the active filters."}
      </p>
      {noFiltersActive ? (
        <Link
          href="/people/new"
          className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Add your first person
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export function PeopleGrid({
  people,
  followUps,
  followUpsByPersonId,
  duplicateWarnings,
}: {
  people: Person[];
  followUps: Interaction[];
  followUpsByPersonId: Map<string, string>;
  duplicateWarnings: Map<string, string>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {people.map((person) => {
        const badge = statusBadge(person, followUpsByPersonId.get(person.id) ?? null);
        const activeFollowUps = followUps.filter(
          (followUp) => followUp.person_id === person.id
        ).length;

        return (
          <div
            key={person.id}
            className="rounded-lg border border-border bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/people/${person.id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {person.name}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {[person.role, person.company].filter(Boolean).join(" at ") ||
                    "No details yet"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {person.relationship_strength && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {person.relationship_strength}
                </span>
              )}
              {activeFollowUps > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  {activeFollowUps} active follow-up{activeFollowUps === 1 ? "" : "s"}
                </span>
              )}
              {duplicateWarnings.has(person.id) && (
                <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-medium text-fuchsia-700">
                  {duplicateWarnings.get(person.id)}
                </span>
              )}
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Last talked: {formatDate(person.last_contacted_at)}
            </p>

            <div className="mt-4 flex gap-2">
              <Link
                href={`/people/${person.id}`}
                className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground"
              >
                Details
              </Link>
              <Link
                href={`/people/${person.id}/interactions/new`}
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                Log chat
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
