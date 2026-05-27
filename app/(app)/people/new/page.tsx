"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { PersonForm } from "../_components/person-form";
import {
  CUSTOM_TAG_COLORS,
  INTERACTION_TYPES,
  getOptionalFormValue,
  getTrimmedFormValue,
} from "@/lib/form-utils";
import { updateStreakAfterAction } from "@/lib/crm-rules";
import { todayInputValue } from "@/lib/date-utils";
import { supabase } from "@/lib/supabase";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import type { Tag } from "@/types/index";

export default function NewPersonPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [dirty, setDirty] = useState(false);
  const creatingTagNames = useRef(new Set<string>());

  const [savedPersonId, setSavedPersonId] = useState<string | null>(null);
  const [savedPersonName, setSavedPersonName] = useState("");
  const [showInteractionPrompt, setShowInteractionPrompt] = useState(false);
  const [interactionType, setInteractionType] = useState("Text");
  const [interactionDate, setInteractionDate] = useState(() => todayInputValue());
  const [interactionNotes, setInteractionNotes] = useState("");
  const [loggingInteraction, setLoggingInteraction] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);

  useUnsavedChanges(dirty && !saving);

  useEffect(() => {
    async function fetchTags() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data, error: tagsError } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (tagsError) {
        setError(tagsError.message);
        return;
      }
      if (data) setAllTags(data);
    }

    fetchTags();
  }, [router]);

  function toggleTagId(id: string) {
    setDirty(true);
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((tagId) => tagId !== id) : [...prev, id]
    );
  }

  async function handleTogglePreset(name: string, color: string) {
    const existing = allTags.find((tag) => tag.name === name);

    if (existing) {
      toggleTagId(existing.id);
      return;
    }

    const tagKey = name.toLowerCase();
    if (creatingTagNames.current.has(tagKey)) return;
    creatingTagNames.current.add(tagKey);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      creatingTagNames.current.delete(tagKey);
      router.push("/auth/login");
      return;
    }

    const { data, error: tagError } = await supabase
      .from("tags")
      .insert({ user_id: user.id, name, color })
      .select()
      .single();

    creatingTagNames.current.delete(tagKey);

    if (tagError) {
      setError(tagError.message);
      return;
    }

    if (data) {
      setAllTags((prev) => [...prev, data]);
      setSelectedTagIds((prev) => [...prev, data.id]);
      setDirty(true);
    }
  }

  async function handleAddCustomTag() {
    const name = newTagName.trim();
    if (!name || addingTag) return;
    setAddingTag(true);
    const tagKey = name.toLowerCase();
    if (creatingTagNames.current.has(tagKey)) {
      setAddingTag(false);
      return;
    }
    creatingTagNames.current.add(tagKey);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAddingTag(false);
      creatingTagNames.current.delete(tagKey);
      router.push("/auth/login");
      return;
    }

    const existing = allTags.find((tag) => tag.name === name);
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) {
        setSelectedTagIds((prev) => [...prev, existing.id]);
      }
      setNewTagName("");
      setAddingTag(false);
      creatingTagNames.current.delete(tagKey);
      setDirty(true);
      return;
    }

    const color = CUSTOM_TAG_COLORS[allTags.length % CUSTOM_TAG_COLORS.length];
    const { data, error: tagError } = await supabase
      .from("tags")
      .insert({ user_id: user.id, name, color })
      .select()
      .single();

    if (tagError) {
      setError(tagError.message);
    } else if (data) {
      setAllTags((prev) => [...prev, data]);
      setSelectedTagIds((prev) => [...prev, data.id]);
      setNewTagName("");
      setDirty(true);
    }

    creatingTagNames.current.delete(tagKey);
    setAddingTag(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setSaving(false);
      router.push("/auth/login");
      return;
    }

    const contactFrequency =
      Number(formData.get("contact_frequency_days")) || 30;
    const firstName = getTrimmedFormValue(formData, "first_name");
    const lastName = getTrimmedFormValue(formData, "last_name");
    const name = [firstName, lastName].filter(Boolean).join(" ");

    if (!firstName) {
      setError("First name is required.");
      setSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("people")
      .insert({
        user_id: user.id,
        name,
        email: getOptionalFormValue(formData, "email"),
        phone: getOptionalFormValue(formData, "phone"),
        company: getOptionalFormValue(formData, "company"),
        role: getOptionalFormValue(formData, "role"),
        location: getOptionalFormValue(formData, "location"),
        latitude: (() => { const v = formData.get("latitude"); return v ? Number(v) : null; })(),
        longitude: (() => { const v = formData.get("longitude"); return v ? Number(v) : null; })(),
        birthday: getOptionalFormValue(formData, "birthday"),
        how_met: getOptionalFormValue(formData, "how_met"),
        relationship_type: getOptionalFormValue(formData, "relationship_type"),
        relationship_strength: getOptionalFormValue(
          formData,
          "relationship_strength"
        ),
        preferred_contact_method: getOptionalFormValue(
          formData,
          "preferred_contact_method"
        ),
        contact_frequency_days: contactFrequency,
        notes: getOptionalFormValue(formData, "notes"),
      })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    if (selectedTagIds.length > 0) {
      const { error: personTagsError } = await supabase.from("person_tags").insert(
        selectedTagIds.map((tag_id) => ({ person_id: data.id, tag_id }))
      );

      if (personTagsError) {
        await supabase.from("people").delete().eq("id", data.id).eq("user_id", user.id);
        setError(
          `Contact was not saved because tags could not be attached: ${personTagsError.message}`
        );
        setSaving(false);
        return;
      }
    }

    await updateStreakAfterAction(supabase);
    setSavedPersonId(data.id);
    setSavedPersonName(name.split(" ")[0]);
    setShowInteractionPrompt(true);
    setDirty(false);
  }

  async function handleLogInteraction() {
    if (!savedPersonId) return;
    setLoggingInteraction(true);
    setInteractionError(null);

    const { error } = await supabase.rpc(
      "create_interaction_and_touch_person",
      {
        p_person_id: savedPersonId,
        p_type: interactionType,
        p_date: interactionDate,
        p_notes: interactionNotes.trim() || null,
        p_follow_up_needed: false,
        p_follow_up_date: null,
        p_follow_up_status: "done",
      }
    );

    if (error) {
      setInteractionError(error.message);
      setLoggingInteraction(false);
      return;
    }

    await updateStreakAfterAction(supabase);
    router.push(`/people/${savedPersonId}`);
  }

  function handleSkipInteraction() {
    router.push(`/people/${savedPersonId}`);
  }

  if (showInteractionPrompt) {
    return (
      <AppLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">One more thing</h1>
        </div>
        <div className="max-w-2xl">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">
              When did you last talk to {savedPersonName}?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Adding your last interaction helps Roots remind you at the right time.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  How did you connect?
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTERACTION_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInteractionType(type)}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                        interactionType === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  When?
                </label>
                <input
                  type="date"
                  value={interactionDate}
                  onChange={(e) => setInteractionDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Notes <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={interactionNotes}
                  onChange={(e) => setInteractionNotes(e.target.value)}
                  placeholder="What did you talk about?"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {interactionError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {interactionError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleLogInteraction}
                  disabled={loggingInteraction}
                  className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80 disabled:opacity-50"
                >
                  {loggingInteraction ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleSkipInteraction}
                  className="inline-flex h-10 items-center rounded-md border border-border bg-card px-5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <Link href="/people" className="text-sm font-medium text-muted-foreground">
          ← Back to people
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Add someone new
        </h1>
      </div>

      <PersonForm
        error={error}
        saving={saving}
        allTags={allTags}
        selectedTagIds={selectedTagIds}
        newTagName={newTagName}
        addingTag={addingTag}
        submitLabel="Add person"
        savingLabel="Saving..."
        cancelHref="/people"
        onSubmit={handleSubmit}
        onDirty={() => setDirty(true)}
        onTogglePreset={handleTogglePreset}
        onToggleTagId={toggleTagId}
        onNewTagNameChange={setNewTagName}
        onAddCustomTag={handleAddCustomTag}
      />
    </AppLayout>
  );
}
