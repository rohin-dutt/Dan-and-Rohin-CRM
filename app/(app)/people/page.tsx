"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

function PeoplePageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const statusFilter = searchParams.get("status") ?? "all";
  const tagFilter = searchParams.get("tag") ?? "";
  const query = searchParams.get("q") ?? "";
  const sortFilter = searchParams.get("sort") ?? "last_contacted";

  const [people, setPeople] = useState<Person[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [personTags, setPersonTags] = useState<PersonTag[]>([]);
  const [followUps, setFollowUps] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const setParam = useCallback(
    (key: string, value: string, defaultValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [searchParams, pathname, router]
  );

  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags]
  );
  const duplicateWarnings = useMemo(() => findDuplicateContacts(people), [people]);
  const followUpsByPersonId = useMemo(() => {
    const map = new Map<string, string>();
    for (const fu of followUps) {
      if (
        fu.follow_up_date &&
        (fu.follow_up_status === "open" || !fu.follow_up_status)
      ) {
        const existing = map.get(fu.person_id);
        if (!existing || fu.follow_up_date < existing) {
          map.set(fu.person_id, fu.follow_up_date);
        }
      }
    }
    return map;
  }, [followUps]);

  const followUpDateByPersonId = useMemo(() => {
    const map = new Map<string, string>();
    for (const fu of followUps) {
      if (!fu.follow_up_needed || !fu.follow_up_date) continue;
      const status = fu.follow_up_status ?? "open";
      if (status === "done" || status === "snoozed") continue;
      const existing = map.get(fu.person_id);
      if (!existing || fu.follow_up_date < existing) {
        map.set(fu.person_id, fu.follow_up_date);
      }
    }
    return map;
  }, [followUps]);

  const displayed = useMemo(() => {
    const normalizedQuery = normalizeContactText(query);
    let result = people;

    if (statusFilter !== "all") {
      result = result.filter((person) => {
        const followUpDate = followUpDateByPersonId.get(person.id) ?? null;
        return (getRelationshipStatus as (p: Person, d: Date, f: string | null) => string)(
          person,
          new Date(),
          followUpDate
        ) === statusFilter;
      });
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

    const sorted = [...result];
    if (sortFilter === "last_contacted") {
      sorted.sort((a, b) => {
        if (!a.last_contacted_at && !b.last_contacted_at) return 0;
        if (!a.last_contacted_at) return -1;
        if (!b.last_contacted_at) return 1;
        return (
          new Date(a.last_contacted_at).getTime() -
          new Date(b.last_contacted_at).getTime()
        );
      });
    } else if (sortFilter === "most_contacted") {
      const followUpCount = new Map<string, number>();
      followUps.forEach((f) => {
        followUpCount.set(f.person_id, (followUpCount.get(f.person_id) ?? 0) + 1);
      });
      sorted.sort(
        (a, b) => (followUpCount.get(b.id) ?? 0) - (followUpCount.get(a.id) ?? 0)
      );
    } else if (sortFilter === "date_added") {
      sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortFilter === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [people, personTags, query, statusFilter, tagFilter, tagsById, sortFilter, followUps, followUpDateByPersonId]);

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
    router.replace(pathname);
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
        sortFilter={sortFilter}
        tags={tags}
        onQueryChange={(v) => setParam("q", v, "")}
        onStatusFilterChange={(v) => setParam("status", v, "all")}
        onTagFilterChange={(v) => setParam("tag", v, "")}
        onSortFilterChange={(v) => setParam("sort", v, "last_contacted")}
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
          followUpsByPersonId={followUpsByPersonId}
          duplicateWarnings={duplicateWarnings}
        />
      )}
    </AppLayout>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-zinc-500">Loading...</p>}>
      <PeoplePageInner />
    </Suspense>
  );
}
