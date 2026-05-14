"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import {
  DashboardSections,
  FirstRunEmptyState,
  type FollowUpInteraction,
} from "./_components/dashboard-sections";
import { supabase } from "@/lib/supabase";
import type { Person } from "@/types/index";

export default function DashboardPage() {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
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

      const { data: peopleData, error: peopleError } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", user.id);

      if (peopleError) {
        setError(peopleError.message);
        setLoading(false);
        return;
      }

      const fetchedPeople = peopleData ?? [];
      setPeople(fetchedPeople);

      if (fetchedPeople.length > 0) {
        const personIds = fetchedPeople.map((person) => person.id);
        const { data: followUpData, error: followUpError } = await supabase
          .from("interactions")
          .select("*")
          .in("person_id", personIds)
          .eq("follow_up_needed", true)
          .order("follow_up_date", { ascending: true });

        if (followUpError) {
          setError(followUpError.message);
          setLoading(false);
          return;
        }

        const namesById = new Map(
          fetchedPeople.map((person) => [person.id, person.name])
        );

        setFollowUps(
          (followUpData ?? []).map((interaction) => ({
            ...interaction,
            follow_up_status: interaction.follow_up_status ?? "open",
            follow_up_snoozed_until:
              interaction.follow_up_snoozed_until ?? null,
            person_name: namesById.get(interaction.person_id) ?? "Unknown",
          }))
        );
      }

      setLoading(false);
    }

    fetchDashboard();
  }, [router]);

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
          A practical snapshot of who needs attention, what follow-ups are open,
          and what is coming up next.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      ) : people.length === 0 ? (
        <FirstRunEmptyState />
      ) : (
        <DashboardSections people={people} followUps={followUps} />
      )}
    </AppLayout>
  );
}
