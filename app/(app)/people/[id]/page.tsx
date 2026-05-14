"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import {
  DeletePersonConfirmation,
  InteractionTimeline,
  PersonNotFound,
  PersonSummary,
} from "./_components/person-detail-sections";
import { supabase } from "@/lib/supabase";
import type { Interaction, Person, Tag } from "@/types/index";

function normalizeInteraction(interaction: Interaction): Interaction {
  return {
    ...interaction,
    follow_up_status: interaction.follow_up_status ?? "open",
    follow_up_snoozed_until: interaction.follow_up_snoozed_until ?? null,
  };
}

export default function PersonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeletePerson, setConfirmDeletePerson] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [interactionsLoading, setInteractionsLoading] = useState(true);
  const [personTags, setPersonTags] = useState<Tag[]>([]);
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [deletingInteractionId, setDeletingInteractionId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setPageError(userError.message);
        setLoading(false);
        setInteractionsLoading(false);
        return;
      }

      if (!user) {
        setLoading(false);
        setInteractionsLoading(false);
        router.push("/auth/login");
        return;
      }

      const { data: personData, error: personError } = await supabase
        .from("people")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

      if (personError || !personData) {
        setNotFound(true);
        setLoading(false);
        setInteractionsLoading(false);
        return;
      }

      setPerson(personData);
      setLoading(false);

      const [interactionsRes, tagsRes] = await Promise.all([
        supabase
          .from("interactions")
          .select("*")
          .eq("person_id", params.id)
          .order("date", { ascending: false }),
        supabase
          .from("person_tags")
          .select("tags(id, name, color)")
          .eq("person_id", params.id),
      ]);

      if (interactionsRes.error || tagsRes.error) {
        setPageError(
          interactionsRes.error?.message ??
            tagsRes.error?.message ??
            "Failed to load person details."
        );
        setInteractionsLoading(false);
        return;
      }

      setInteractions((interactionsRes.data ?? []).map(normalizeInteraction));
      setInteractionsLoading(false);

      const rows = (tagsRes.data ?? []) as unknown as { tags: Tag[] | Tag }[];
      setPersonTags(
        rows.flatMap((row) => (Array.isArray(row.tags) ? row.tags : [row.tags]))
      );
    }

    fetchData();
  }, [params.id, router]);

  async function handleDeletePerson() {
    setDeleting(true);
    setDeleteError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setDeleteError("You must be logged in.");
      setDeleting(false);
      router.push("/auth/login");
      return;
    }

    const { error } = await supabase
      .from("people")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error) {
      setDeleteError(error.message ?? "Failed to delete person.");
      setDeleting(false);
      return;
    }

    router.push("/people");
  }

  async function recalculateLastContacted() {
    const { error } = await supabase.rpc("recalculate_person_last_contacted", {
      p_person_id: params.id,
    });
    if (error) throw new Error(error.message);
  }

  async function handleUpdateInteraction(
    interaction: Interaction,
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setInteractionError(null);
    const formData = new FormData(event.currentTarget);
    const followUpNeeded = formData.get("follow_up_needed") === "on";

    const { error } = await supabase
      .from("interactions")
      .update({
        type: formData.get("type") as string,
        date: formData.get("date") as string,
        notes: ((formData.get("notes") as string | null) ?? "").trim() || null,
        follow_up_needed: followUpNeeded,
        follow_up_date: followUpNeeded
          ? ((formData.get("follow_up_date") as string | null) ?? "") || null
          : null,
        follow_up_status: followUpNeeded
          ? (formData.get("follow_up_status") as string)
          : "done",
        follow_up_snoozed_until:
          ((formData.get("follow_up_snoozed_until") as string | null) ?? "") ||
          null,
      })
      .eq("id", interaction.id)
      .eq("person_id", params.id)
      .select("*")
      .single();

    if (error) {
      setInteractionError(error.message);
      return;
    }

    try {
      await recalculateLastContacted();
    } catch (err) {
      setInteractionError(
        err instanceof Error ? err.message : "Interaction saved, but last-contacted refresh failed."
      );
      return;
    }

    const { data: refreshedPerson } = await supabase
      .from("people")
      .select("*")
      .eq("id", params.id)
      .single();
    if (refreshedPerson) setPerson(refreshedPerson);

    const updated = normalizeInteraction({
      ...interaction,
      type: formData.get("type") as string,
      date: formData.get("date") as string,
      notes: ((formData.get("notes") as string | null) ?? "").trim() || null,
      follow_up_needed: followUpNeeded,
      follow_up_date: followUpNeeded
        ? ((formData.get("follow_up_date") as string | null) ?? "") || null
        : null,
      follow_up_status: followUpNeeded
        ? ((formData.get("follow_up_status") as Interaction["follow_up_status"]) ?? "open")
        : "done",
      follow_up_snoozed_until:
        ((formData.get("follow_up_snoozed_until") as string | null) ?? "") || null,
    });
    setInteractions((prev) =>
      prev.map((item) => (item.id === interaction.id ? updated : item))
    );
    setEditingInteractionId(null);
  }

  async function handleDeleteInteraction(interactionId: string) {
    setInteractionError(null);
    setDeletingInteractionId(interactionId);

    const { error } = await supabase
      .from("interactions")
      .delete()
      .eq("id", interactionId)
      .eq("person_id", params.id);

    if (error) {
      setInteractionError(error.message);
      setDeletingInteractionId(null);
      return;
    }

    try {
      await recalculateLastContacted();
    } catch (err) {
      setInteractionError(
        err instanceof Error ? err.message : "Interaction deleted, but last-contacted refresh failed."
      );
    }

    setInteractions((prev) => prev.filter((item) => item.id !== interactionId));
    setDeletingInteractionId(null);
  }

  async function handleFollowUpStatus(
    interaction: Interaction,
    status: Interaction["follow_up_status"]
  ) {
    setInteractionError(null);
    const patch =
      status === "snoozed"
        ? {
            follow_up_status: status,
            follow_up_snoozed_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10),
          }
        : { follow_up_status: status, follow_up_snoozed_until: null };

    const { error } = await supabase
      .from("interactions")
      .update(patch)
      .eq("id", interaction.id)
      .eq("person_id", params.id);

    if (error) {
      setInteractionError(error.message);
      return;
    }

    setInteractions((prev) =>
      prev.map((item) =>
        item.id === interaction.id ? normalizeInteraction({ ...item, ...patch }) : item
      )
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-sm text-zinc-500">Loading...</p>
      </AppLayout>
    );
  }

  if (notFound || !person) {
    return (
      <AppLayout>
        <PersonNotFound />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between">
        <Link href="/people" className="text-sm font-medium text-zinc-600">
          Back to people
        </Link>
        <div className="flex gap-3">
          <Link
            href={`/people/${person.id}/edit`}
            className="inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Edit
          </Link>
          <button
            onClick={() => setConfirmDeletePerson(true)}
            disabled={deleting}
            className="inline-flex h-9 items-center rounded-md bg-red-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>

      {(deleteError || pageError) && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {deleteError ?? pageError}
        </div>
      )}

      {confirmDeletePerson && (
        <DeletePersonConfirmation
          personName={person.name}
          deleting={deleting}
          onDelete={handleDeletePerson}
          onCancel={() => setConfirmDeletePerson(false)}
        />
      )}

      <PersonSummary
        person={person}
        personTags={personTags}
        interactions={interactions}
      />

      <InteractionTimeline
        personId={person.id}
        interactions={interactions}
        interactionsLoading={interactionsLoading}
        interactionError={interactionError}
        editingInteractionId={editingInteractionId}
        deletingInteractionId={deletingInteractionId}
        onEditInteraction={setEditingInteractionId}
        onCancelEditInteraction={() => setEditingInteractionId(null)}
        onUpdateInteraction={handleUpdateInteraction}
        onStartDeleteInteraction={setDeletingInteractionId}
        onCancelDeleteInteraction={() => setDeletingInteractionId(null)}
        onDeleteInteraction={handleDeleteInteraction}
        onFollowUpStatus={handleFollowUpStatus}
      />
    </AppLayout>
  );
}
