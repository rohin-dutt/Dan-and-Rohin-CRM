"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import {
  PeopleEmptyState,
  PeopleFilters,
  PeopleGrid,
  PeopleHeader,
} from "./_components/people-list-sections";
import {
  findDuplicateContacts,
  getRelationshipStatus,
  normalizeContactText,
} from "@/lib/crm-rules";
import { supabase } from "@/lib/supabase";
import type { Interaction, Person, PersonTag, Tag } from "@/types/index";

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

  const noFiltersActive = statusFilter === "all" && tagFilter === "" && !query.trim();

  return (
    <AppLayout>
      <PeopleHeader exporting={exporting} onExport={handleExport} />

      {exportError && (
        <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {exportError}
        </div>
      )}

      <PeopleFilters
        query={query}
        statusFilter={statusFilter}
        tagFilter={tagFilter}
        tags={tags}
        onQueryChange={setQuery}
        onStatusFilterChange={setStatusFilter}
        onTagFilterChange={setTagFilter}
      />

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : displayed.length === 0 ? (
        <PeopleEmptyState
          noFiltersActive={noFiltersActive}
          onClearFilters={clearFilters}
        />
      ) : (
        <PeopleGrid
          people={displayed}
          followUps={followUps}
          duplicateWarnings={duplicateWarnings}
        />
      )}
    </AppLayout>
  );
}
