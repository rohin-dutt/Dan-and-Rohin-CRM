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
  const [streak, setStreak] = useState(0);
  const [streakLost, setStreakLost] = useState(false);
  const [previousStreak, setPreviousStreak] = useState(0);

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

      const { data: settingsData } = await supabase
        .from("settings")
        .select("current_streak, last_streak_date")
        .eq("user_id", user.id)
        .maybeSingle();

      const rawStreak = settingsData?.current_streak ?? 0;
      const lastStreakDate = settingsData?.last_streak_date;

      function isStreakActive(lastDate: string | null | undefined): boolean {
        if (!lastDate) return false;
        const today = new Date();
        const todayStr = [
          today.getFullYear(),
          String(today.getMonth() + 1).padStart(2, "0"),
          String(today.getDate()).padStart(2, "0"),
        ].join("-");
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = [
          yesterday.getFullYear(),
          String(yesterday.getMonth() + 1).padStart(2, "0"),
          String(yesterday.getDate()).padStart(2, "0"),
        ].join("-");
        return lastDate === todayStr || lastDate === yesterdayStr;
      }

      const activeStreak = isStreakActive(lastStreakDate) ? rawStreak : 0;
      setStreak(activeStreak);
      if (rawStreak > 0 && !isStreakActive(lastStreakDate)) {
        setStreakLost(true);
        setPreviousStreak(rawStreak);
      }

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
          Who needs your attention
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
          The people worth reaching out to this week.
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
        <DashboardSections
          people={people}
          followUps={followUps}
          streak={streak}
          streakLost={streakLost}
          previousStreak={previousStreak}
          onStreakUpdate={() => setStreak((s) => s + 1)}
        />
      )}
    </AppLayout>
  );
}
