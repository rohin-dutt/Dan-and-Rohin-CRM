"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import AppLayout from "@/components/AppLayout";
import {
  CUSTOM_TAG_COLORS,
  PRESET_TAGS,
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

  function isPresetSelected(name: string): boolean {
    const tag = allTags.find((t) => t.name === name);
    return tag ? selectedTagIds.includes(tag.id) : false;
  }

  function toggleTagId(id: string) {
    setDirty(true);
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function handleTogglePreset(name: string, color: string) {
    const existing = allTags.find((t) => t.name === name);

    if (existing) {
      toggleTagId(existing.id);
      return;
    }

    const tagKey = name.toLowerCase();
    if (creatingTagNames.current.has(tagKey)) return;
    creatingTagNames.current.add(tagKey);

    // Tag doesn't exist yet — create it then select it
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

    // Reuse existing tag with same name if it exists
    const existing = allTags.find((t) => t.name === name);
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

    const form = e.currentTarget;
    const formData = new FormData(form);

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
    const name = getTrimmedFormValue(formData, "name");

    if (!name) {
      setError("Name is required.");
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
        relationship_type:
          getOptionalFormValue(formData, "relationship_type"),
        relationship_strength:
          getOptionalFormValue(formData, "relationship_strength"),
        preferred_contact_method:
          getOptionalFormValue(formData, "preferred_contact_method"),
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

  // Custom tags the user has added that aren't in the preset list
  const customTags = allTags.filter(
    (t) => !PRESET_TAGS.some((p) => p.name === t.name)
  );

  return (
    <AppLayout>
      <div className="mb-8">
        <Link href="/people" className="text-sm font-medium text-zinc-600">
          ← Back to people
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Add person
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

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold">Basic info</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label
                htmlFor="company"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Company
              </label>
              <input
                id="company"
                name="company"
                type="text"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label
                htmlFor="role"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Role
              </label>
              <input
                id="role"
                name="role"
                type="text"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label
                htmlFor="location"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label
                htmlFor="birthday"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Birthday
              </label>
              <input
                id="birthday"
                name="birthday"
                type="date"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold">Relationship</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="how_met"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                How you met
              </label>
              <input
                id="how_met"
                name="how_met"
                type="text"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label
                htmlFor="relationship_type"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Relationship type
              </label>
              <input
                id="relationship_type"
                name="relationship_type"
                type="text"
                placeholder="e.g. Friend, Mentor, Colleague"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label
                htmlFor="relationship_strength"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Relationship strength
              </label>
              <select
                id="relationship_strength"
                name="relationship_strength"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <option value="">Select...</option>
                <option value="New">New</option>
                <option value="Developing">Developing</option>
                <option value="Strong">Strong</option>
                <option value="Trusted">Trusted</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="preferred_contact_method"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Preferred contact method
              </label>
              <input
                id="preferred_contact_method"
                name="preferred_contact_method"
                type="text"
                placeholder="e.g. Email, Text, Coffee chat"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
            <div>
              <label
                htmlFor="contact_frequency_days"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Contact every (days)
              </label>
              <input
                id="contact_frequency_days"
                name="contact_frequency_days"
                type="number"
                min="1"
                defaultValue="30"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold">Tags</h2>

          {/* Preset tags */}
          <div className="mb-5 grid grid-cols-2 gap-2">
            {PRESET_TAGS.map(({ name, color }) => (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="checkbox"
                  checked={isPresetSelected(name)}
                  onChange={() => handleTogglePreset(name, color)}
                  className="rounded border-zinc-300"
                />
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{ backgroundColor: color }}
                >
                  {name}
                </span>
              </label>
            ))}
          </div>

          {/* Custom tags the user already created */}
          {customTags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {customTags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => toggleTagId(tag.id)}
                    className="rounded border-zinc-300"
                  />
                  <span
                    className="rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Add a custom tag */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomTag();
                }
              }}
              placeholder="Add custom tag..."
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <button
              type="button"
              onClick={handleAddCustomTag}
              disabled={addingTag || !newTagName.trim()}
              className="inline-flex h-9 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {addingTag ? "Adding..." : "Add"}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold">Notes</h2>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add person"}
          </button>
          <Link
            href="/people"
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </AppLayout>
  );
}
