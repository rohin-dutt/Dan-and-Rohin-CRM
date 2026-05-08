"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AppLayout from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import type { Person, Tag, PersonTag } from "@/types/index";

function isOverdue(person: Person): boolean {
  if (!person.last_contacted_at) return false;
  const due = new Date(person.last_contacted_at);
  due.setDate(due.getDate() + person.contact_frequency_days);
  return due < new Date();
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [personTags, setPersonTags] = useState<PersonTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [peopleRes, tagsRes] = await Promise.all([
        supabase.from("people").select("*").eq("user_id", user.id).order("name"),
        supabase.from("tags").select("*").eq("user_id", user.id).order("name"),
      ]);

      const fetchedPeople = peopleRes.data ?? [];
      setPeople(fetchedPeople);
      setTags(tagsRes.data ?? []);

      if (fetchedPeople.length > 0) {
        const ids = fetchedPeople.map((p) => p.id);
        const { data: ptData } = await supabase
          .from("person_tags")
          .select("*")
          .in("person_id", ids);
        setPersonTags(ptData ?? []);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  function getFiltered(): Person[] {
    let result = people;

    if (statusFilter === "overdue") result = result.filter(isOverdue);
    else if (statusFilter === "never_contacted")
      result = result.filter((p) => !p.last_contacted_at);

    if (tagFilter) {
      const taggedIds = new Set(
        personTags
          .filter((pt) => pt.tag_id === tagFilter)
          .map((pt) => pt.person_id)
      );
      result = result.filter((p) => taggedIds.has(p.id));
    }

    return result;
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "crm-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function statusBtnClass(key: string) {
    return `rounded-full px-3 py-1 text-sm font-medium transition ${
      statusFilter === key
        ? "bg-zinc-900 text-white"
        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
    }`;
  }

  const noFiltersActive = statusFilter === "all" && tagFilter === "";
  const displayed = getFiltered();

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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={statusBtnClass("all")}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter("overdue")}
          className={statusBtnClass("overdue")}
        >
          Overdue
        </button>
        <button
          onClick={() => setStatusFilter("never_contacted")}
          className={statusBtnClass("never_contacted")}
        >
          Never contacted
        </button>

        {tags.length > 0 && (
          <div className="relative">
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className={`appearance-none cursor-pointer rounded-full py-1 pl-3 pr-7 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
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
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <svg
                className={`h-3 w-3 ${tagFilter ? "text-white" : "text-zinc-500"}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : displayed.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-zinc-600">
            {noFiltersActive ? "No people yet." : "No people match this filter."}
          </p>
          {noFiltersActive && (
            <Link
              href="/people/new"
              className="mt-4 inline-block text-sm font-medium text-zinc-900 underline"
            >
              Add your first person
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayed.map((person) => (
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
