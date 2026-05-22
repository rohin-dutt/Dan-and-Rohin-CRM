"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import { PersonForm } from "../_components/person-form";
import {
  CUSTOM_TAG_COLORS,
  getOptionalFormValue,
  getTrimmedFormValue,
} from "@/lib/form-utils";
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

    setDirty(false);
    router.push(`/people/${data.id}`);
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
