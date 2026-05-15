"use client";

import { useState } from "react";
import Link from "next/link";

import { PRESET_TAGS } from "@/lib/form-utils";
import type { Person, Tag } from "@/types/index";

const CATEGORY_PILLS = [
  {
    label: "Friend",
    tagName: "Friend",
    tagColor: "#16A34A",
    selectedClass:
      "bg-green-600 text-white border-green-600",
  },
  {
    label: "Family",
    tagName: "Family",
    tagColor: "#2563EB",
    selectedClass:
      "bg-amber-500 text-white border-amber-500",
  },
  {
    label: "Professional",
    tagName: "Colleague",
    tagColor: "#D97706",
    selectedClass:
      "bg-sky-500 text-white border-sky-500",
  },
] as const;

export function PersonForm({
  person,
  error,
  saving,
  allTags,
  selectedTagIds,
  newTagName,
  addingTag,
  submitLabel,
  savingLabel,
  cancelHref,
  onSubmit,
  onDirty,
  onTogglePreset,
  onToggleTagId,
  onNewTagNameChange,
  onAddCustomTag,
}: {
  person?: Person;
  error: string | null;
  saving: boolean;
  allTags: Tag[];
  selectedTagIds: string[];
  newTagName: string;
  addingTag: boolean;
  submitLabel: string;
  savingLabel: string;
  cancelHref: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDirty: () => void;
  onTogglePreset: (name: string, color: string) => void;
  onToggleTagId: (id: string) => void;
  onNewTagNameChange: (name: string) => void;
  onAddCustomTag: () => void;
}) {
  const hasMoreDetails =
    person != null &&
    [
      person.email,
      person.phone,
      person.company,
      person.role,
      person.location,
      person.birthday,
      person.relationship_type,
      person.relationship_strength,
      person.preferred_contact_method,
    ].some((v) => v != null && v !== "");

  const [showMore, setShowMore] = useState(hasMoreDetails);

  const customTags = allTags.filter(
    (tag) => !PRESET_TAGS.some((preset) => preset.name === tag.name)
  );

  function isPresetSelected(name: string): boolean {
    const tag = allTags.find((item) => item.name === name);
    return tag ? selectedTagIds.includes(tag.id) : false;
  }

  const inputClass =
    "w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const labelClass = "mb-1 block text-sm font-medium text-foreground";

  return (
    <form onSubmit={onSubmit} onChange={onDirty} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Section 1 — always visible */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={person?.name ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            How do you know them?
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_PILLS.map(({ label, tagName, tagColor, selectedClass }) => {
              const selected = isPresetSelected(tagName);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => onTogglePreset(tagName, tagColor)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    selected
                      ? selectedClass
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="how_met" className={labelClass}>
            How do you know them?
          </label>
          <input
            id="how_met"
            name="how_met"
            type="text"
            defaultValue={person?.how_met ?? ""}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="contact_frequency_days" className={labelClass}>
            Stay in touch every _ days
          </label>
          <input
            id="contact_frequency_days"
            name="contact_frequency_days"
            type="number"
            min="1"
            defaultValue={person?.contact_frequency_days ?? 30}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={person?.notes ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {/* More details — collapsible. Fields are ALWAYS in the DOM (hidden via CSS)
          so FormData always contains their values on submit. */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setShowMore((prev) => !prev)}
          className="flex w-full items-center justify-between px-6 py-4 text-base font-semibold"
        >
          More details
          <span className="text-lg">{showMore ? "▾" : "▸"}</span>
        </button>

        <div className={showMore ? "px-6 pb-6" : "hidden"}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={person?.email ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={person?.phone ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="company" className={labelClass}>
                Company
              </label>
              <input
                id="company"
                name="company"
                type="text"
                defaultValue={person?.company ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="role" className={labelClass}>
                Role
              </label>
              <input
                id="role"
                name="role"
                type="text"
                defaultValue={person?.role ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="location" className={labelClass}>
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                defaultValue={person?.location ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="birthday" className={labelClass}>
                Birthday
              </label>
              <input
                id="birthday"
                name="birthday"
                type="date"
                defaultValue={person?.birthday ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="relationship_type" className={labelClass}>
                Relationship type (e.g. roommate, manager)
              </label>
              <input
                id="relationship_type"
                name="relationship_type"
                type="text"
                placeholder="e.g. Friend, Mentor, Colleague"
                defaultValue={person?.relationship_type ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="relationship_strength" className={labelClass}>
                Relationship strength
              </label>
              <select
                id="relationship_strength"
                name="relationship_strength"
                defaultValue={person?.relationship_strength ?? ""}
                className={inputClass}
              >
                <option value="">Select...</option>
                <option value="New">New</option>
                <option value="Developing">Developing</option>
                <option value="Strong">Strong</option>
                <option value="Trusted">Trusted</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="preferred_contact_method" className={labelClass}>
                Best way to reach them
              </label>
              <input
                id="preferred_contact_method"
                name="preferred_contact_method"
                type="text"
                placeholder="e.g. Email, Text, Coffee chat"
                defaultValue={person?.preferred_contact_method ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tags — unchanged */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-5 text-base font-semibold">Tags</h2>

        <div className="mb-5 grid grid-cols-2 gap-2">
          {PRESET_TAGS.map(({ name, color }) => (
            <label key={name} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isPresetSelected(name)}
                onChange={() => onTogglePreset(name, color)}
                className="rounded border-border"
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
                  onChange={() => onToggleTagId(tag.id)}
                  className="rounded border-border"
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

        <div className="flex gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(event) => onNewTagNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAddCustomTag();
              }
            }}
            placeholder="Add custom tag..."
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={onAddCustomTag}
            disabled={addingTag || !newTagName.trim()}
            className="inline-flex h-9 items-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
          >
            {addingTag ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/80 disabled:opacity-50"
        >
          {saving ? savingLabel : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex h-10 items-center rounded-md border border-border bg-card px-5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
