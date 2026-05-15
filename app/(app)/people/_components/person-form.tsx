"use client";

import Link from "next/link";

import { PRESET_TAGS } from "@/lib/form-utils";
import type { Person, Tag } from "@/types/index";

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
  const customTags = allTags.filter(
    (tag) => !PRESET_TAGS.some((preset) => preset.name === tag.name)
  );

  function isPresetSelected(name: string): boolean {
    const tag = allTags.find((item) => item.name === name);
    return tag ? selectedTagIds.includes(tag.id) : false;
  }

  return (
    <form onSubmit={onSubmit} onChange={onDirty} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-5 text-base font-semibold">Basic info</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={person?.name ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={person?.email ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={person?.phone ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="company"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Company
            </label>
            <input
              id="company"
              name="company"
              type="text"
              defaultValue={person?.company ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="role"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Role
            </label>
            <input
              id="role"
              name="role"
              type="text"
              defaultValue={person?.role ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="location"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              defaultValue={person?.location ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="birthday"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Birthday
            </label>
            <input
              id="birthday"
              name="birthday"
              type="date"
              defaultValue={person?.birthday ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-5 text-base font-semibold">Relationship</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="how_met"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              How you met
            </label>
            <input
              id="how_met"
              name="how_met"
              type="text"
              defaultValue={person?.how_met ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="relationship_type"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Relationship type
            </label>
            <input
              id="relationship_type"
              name="relationship_type"
              type="text"
              placeholder="e.g. Friend, Mentor, Colleague"
              defaultValue={person?.relationship_type ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="relationship_strength"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Relationship strength
            </label>
            <select
              id="relationship_strength"
              name="relationship_strength"
              defaultValue={person?.relationship_strength ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Preferred contact method
            </label>
            <input
              id="preferred_contact_method"
              name="preferred_contact_method"
              type="text"
              placeholder="e.g. Email, Text, Coffee chat"
              defaultValue={person?.preferred_contact_method ?? ""}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="contact_frequency_days"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Contact every (days)
            </label>
            <input
              id="contact_frequency_days"
              name="contact_frequency_days"
              type="number"
              min="1"
              defaultValue={person?.contact_frequency_days ?? 30}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

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

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-5 text-base font-semibold">Notes</h2>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={person?.notes ?? ""}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
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
