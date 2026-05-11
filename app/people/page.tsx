"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import {
  findDuplicateContacts,
  getNextDueDays,
  getRelationshipStatus,
  normalizeContactText,
  pluralize,
} from "@/lib/crm-rules";
import { formatDate } from "@/lib/date-utils";
import { supabase } from "@/lib/supabase";
import type { Interaction, Person, PersonTag, Tag } from "@/types/index";

function statusBadge(person: Person) {
  const status = getRelationshipStatus(person);
  const nextDueDays = getNextDueDays(person);

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
    return { label: "Needs first log", className: "bg-zinc-100 text-zinc-600" };
  }
  return {
    label:
      nextDueDays === null ? "Not scheduled" : `Due in ${pluralize(nextDueDays, "day")}`,
    className: "bg-sky-100 text-sky-700",
  };
}

export default function PeoplePage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [personTags, setPersonTags] = useState<PersonTag[]>([]);
  const [followUps, setFollowUps] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        router.push("/auth/login");
        return;
      }

      const [peopleRes, tagsRes] = await Promise.all([
        supabase.from("people").select("*").eq("user_id", user.id).order("name"),
        supabase.from("tags").select("*").eq("user_id", user.id).order("name"),
      ]);

      if (peopleRes.error || tagsRes.error) {
        setError(peopleRes.error?.message ?? tagsRes.error?.message ?? "Failed to load people.");
        setLoading(false);
        return;
      }

      const fetchedPeople = peopleRes.data ?? [];
      setPeople(fetchedPeople);
      setTags(tagsRes.data ?? []);

      if (fetchedPeople.length > 0) {
        const ids = fetchedPeople.map((person) => person.id);
        const [personTagsRes, followUpsRes] = await Promise.all([
          supabase.from("person_tags").select("*").in("person_id", ids),
          supabase
            .from("interactions")
            .select("*")
            .in("person_id", ids)
            .eq("follow_up_needed", true)
            .neq("follow_up_status", "done"),
        ]);

        if (personTagsRes.error || followUpsRes.error) {
          setError(
            personTagsRes.error?.message ??
              followUpsRes.error?.message ??
              "Failed to load relationship metadata."
          );
          setLoading(false);
          return;
        }

        setPersonTags(personTagsRes.data ?? []);
        setFollowUps(followUpsRes.data ?? []);
      }

      setLoading(false);
    }

    fetchData();
  }, [router]);

  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags]
  );
  const duplicateWarnings = useMemo(() => findDuplicateContacts(people), [people]);

  const displayed = useMemo(() => {
    const normalizedQuery = normalizeContactText(query);
    let result = people;

    if (statusFilter !== "all") {
      result = result.filter((person) => getRelationshipStatus(person) === statusFilter);
    }

    if (tagFilter) {
      const taggedIds = new Set(
        personTags
          .filter((personTag) => personTag.tag_id === tagFilter)
          .map((personTag) => personTag.person_id)
      );
      result = result.filter((person) => taggedIds.has(person.id));
    }

    if (normalizedQuery) {
      result = result.filter((person) => {
        const tagText = personTags
          .filter((personTag) => personTag.person_id === person.id)
          .map((personTag) => tagsById.get(personTag.tag_id)?.name ?? "")
          .join(" ");
        const haystack = normalizeContactText(
          [
            person.name,
            person.company,
            person.role,
            person.email,
            person.notes,
            tagText,
          ].join(" ")
        );
        return haystack.includes(normalizedQuery);
      });
    }

    return result;
  }, [people, personTags, query, statusFilter, tagFilter, tagsById]);

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/export");
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "Export failed.");
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "crm-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  function clearFilters() {
    setStatusFilter("all");
    setTagFilter("");
    setQuery("");
  }

  function statusBtnClass(key: string) {
    return `rounded-full px-3 py-1 text-sm font-medium transition ${
      statusFilter === key
        ? "bg-zinc-900 text-white"
        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
    }`;
  }

  const noFiltersActive = statusFilter === "all" && tagFilter === "" && !query.trim();

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
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export Data"}
          </button>
          <Link
            href="/people/new"
            className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700"
          >
            Add Person
          </Link>
        </div>
      </div>

      {exportError && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {exportError}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="people-search" className="sr-only">
          Search people
        </label>
        <input
          id="people-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, company, role, email, notes, or tags..."
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button onClick={() => setStatusFilter("all")} className={statusBtnClass("all")}>
          All
        </button>
        <button
          onClick={() => setStatusFilter("overdue")}
          className={statusBtnClass("overdue")}
        >
          Overdue
        </button>
        <button
          onClick={() => setStatusFilter("due_this_week")}
          className={statusBtnClass("due_this_week")}
        >
          Due soon
        </button>
        <button
          onClick={() => setStatusFilter("coming_up")}
          className={statusBtnClass("coming_up")}
        >
          Coming up
        </button>
        <button
          onClick={() => setStatusFilter("neglected")}
          className={statusBtnClass("neglected")}
        >
          Needs first log
        </button>

        {tags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className={`cursor-pointer rounded-full py-1 pl-3 pr-7 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
              tagFilter
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
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
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            {noFiltersActive ? "No people yet." : "No people match your filters."}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            {noFiltersActive
              ? "Add someone you want to keep in touch with, then log your first interaction."
              : "Try a broader search or clear the active filters."}
          </p>
          {noFiltersActive ? (
            <Link
              href="/people/new"
              className="mt-4 inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
            >
              Add your first person
            </Link>
          ) : (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayed.map((person) => {
            const badge = statusBadge(person);
            const activeFollowUps = followUps.filter(
              (followUp) => followUp.person_id === person.id
            ).length;

            return (
              <div
                key={person.id}
                className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/people/${person.id}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {person.name}
                    </Link>
                    <p className="mt-1 text-sm text-zinc-600">
                      {[person.role, person.company].filter(Boolean).join(" at ") ||
                        "No role or company yet"}
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
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
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

                <p className="mt-4 text-sm text-zinc-600">
                  Last contacted: {formatDate(person.last_contacted_at)}
                </p>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/people/${person.id}`}
                    className="inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700"
                  >
                    Details
                  </Link>
                  <Link
                    href={`/people/${person.id}/interactions/new`}
                    className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white"
                  >
                    Quick Log
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
