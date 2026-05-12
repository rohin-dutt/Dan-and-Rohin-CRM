"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { todayInputValue } from "@/lib/date-utils";
import { supabase } from "@/lib/supabase";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import type { Person } from "@/types/index";

const INTERACTION_TYPES = [
  "Text",
  "Call",
  "Coffee",
  "Email",
  "LinkedIn",
  "In Person",
  "Other",
];

export default function NewInteractionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<Pick<Person, "id" | "name"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [dirty, setDirty] = useState(false);

  useUnsavedChanges(dirty && !saving);

  useEffect(() => {
    async function loadPerson() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        return;
      }

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data, error: personError } = await supabase
        .from("people")
        .select("id, name")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

      if (personError || !data) {
        setError("Person not found or you do not have access.");
        return;
      }

      setPerson(data);
    }

    loadPerson();
  }, [params.id, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const date = formData.get("date") as string;
    const type = formData.get("type") as string;
    const notes = ((formData.get("notes") as string | null) ?? "").trim() || null;
    const followUpDate = followUpNeeded
      ? (formData.get("follow_up_date") as string) || null
      : null;

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError.message);
      setSaving(false);
      return;
    }

    if (!user) {
      setError("You must be logged in.");
      setSaving(false);
      router.push("/auth/login");
      return;
    }

    const { data: accessiblePerson, error: personError } = await supabase
      .from("people")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (personError || !accessiblePerson) {
      setError("Person not found or you do not have access.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.rpc(
      "create_interaction_and_touch_person",
      {
        p_person_id: params.id,
        p_type: type,
        p_date: date,
        p_notes: notes,
        p_follow_up_needed: followUpNeeded,
        p_follow_up_date: followUpDate,
        p_follow_up_status: followUpNeeded ? "open" : "done",
      }
    );

    if (insertError) {
      setError(insertError.message ?? "Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    setDirty(false);
    router.push(`/people/${params.id}`);
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <Link
          href={`/people/${params.id}`}
          className="text-sm font-medium text-zinc-600"
        >
          Back to {person?.name ?? "person"}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Log Interaction{person ? ` with ${person.name}` : ""}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        onChange={() => setDirty(true)}
        className="max-w-2xl space-y-6"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-5 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <label htmlFor="type" className="mb-1 block text-sm font-medium text-zinc-700">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              name="type"
              required
              defaultValue=""
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              <option value="" disabled>
                Select type...
              </option>
              {INTERACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" className="mb-1 block text-sm font-medium text-zinc-700">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={todayInputValue()}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-zinc-700">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="What did you talk about?"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="follow_up_needed"
              name="follow_up_needed"
              type="checkbox"
              checked={followUpNeeded}
              onChange={(event) => {
                setFollowUpNeeded(event.target.checked);
                setDirty(true);
              }}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
            />
            <label htmlFor="follow_up_needed" className="text-sm font-medium text-zinc-700">
              Follow-up needed
            </label>
          </div>

          {followUpNeeded && (
            <div>
              <label htmlFor="follow_up_date" className="mb-1 block text-sm font-medium text-zinc-700">
                Follow-up date
              </label>
              <input
                id="follow_up_date"
                name="follow_up_date"
                type="date"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Log Interaction"}
          </button>
          <Link
            href={`/people/${params.id}`}
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </AppLayout>
  );
}
