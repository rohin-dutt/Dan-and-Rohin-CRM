"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

import { getBirthdayParts } from "@roots/shared";
import type { Person, Tag } from "@/types/index";

const CATEGORY_PILLS = [
  {
    label: "Friend",
    tagName: "Friend",
    tagColor: "#16A34A",
    selectedClass: "bg-green-600 text-white border-green-600",
  },
  {
    label: "Family",
    tagName: "Family",
    tagColor: "#2563EB",
    selectedClass: "bg-amber-500 text-white border-amber-500",
  },
  {
    label: "Professional",
    tagName: "Colleague",
    tagColor: "#D97706",
    selectedClass: "bg-sky-500 text-white border-sky-500",
  },
] as const;

const FREQ_OPTIONS = [
  { label: "Every week", value: 7 },
  { label: "Every 2 weeks", value: 14 },
  { label: "Every month", value: 30 },
  { label: "Every 3 months", value: 90 },
  { label: "Every 6 months", value: 180 },
  { label: "Once a year", value: 365 },
] as const;

function getClosestFreq(days: number): number {
  return FREQ_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr.value - days) < Math.abs(prev.value - days) ? curr : prev
  ).value;
}

type PersonFormProps = {
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
};

export function PersonForm(props: PersonFormProps) {
  const {
    person,
    error,
    saving,
    allTags,
    selectedTagIds,
    submitLabel,
    savingLabel,
    cancelHref,
    onSubmit,
    onDirty,
    onTogglePreset,
  } = props;
  // Tag props (newTagName, addingTag, onToggleTagId, onNewTagNameChange,
  // onAddCustomTag) are kept in PersonFormProps for parent pages; not used
  // in the render since the Tags section was removed (FIX 4).

  const hasMoreDetails =
    person != null &&
    [
      person.email,
      person.phone,
      person.location,
      person.relationship_strength,
      person.preferred_contact_method,
    ].some((v) => v != null && v !== "");

  const [showMore, setShowMore] = useState(hasMoreDetails);

  // Split name on first space for edit mode
  const firstName = person?.name ? person.name.split(" ")[0] : "";
  const lastName = person?.name
    ? person.name.split(" ").slice(1).join(" ")
    : "";

  // Track active category pills locally for immediate contextual field display
  const [activePillLabels, setActivePillLabels] = useState<string[]>(() =>
    CATEGORY_PILLS.filter(({ tagName }) => {
      const tag = allTags.find((t) => t.name === tagName);
      return tag ? selectedTagIds.includes(tag.id) : false;
    }).map(({ label }) => label)
  );

  const [selectedFreq, setSelectedFreq] = useState(() =>
    getClosestFreq(person?.contact_frequency_days ?? 30)
  );
  const birthday = getBirthdayParts(person ?? {});

  const [locationName, setLocationName] = useState(person?.location ?? "");
  const [latitude, setLatitude] = useState<number | null>(person?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(person?.longitude ?? null);
  const [locationQuery, setLocationQuery] = useState(person?.location ?? "");
  const [locationResults, setLocationResults] = useState<
    Array<{ place_name: string; center: [number, number] }>
  >([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function handleLocationQueryChange(value: string) {
    setLocationQuery(value);
    if (!value) {
      setLocationName("");
      setLatitude(null);
      setLongitude(null);
      setLocationResults([]);
      setShowLocationDropdown(false);
      return;
    }
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    locationDebounceRef.current = setTimeout(async () => {
      setLocationLoading(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?types=place,region,country&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=5`
        );
        if (!res.ok) throw new Error("Geocoding request failed");
        const json = await res.json();
        setLocationResults(json.features ?? []);
        setShowLocationDropdown(true);
      } catch {
        setLocationResults([]);
        setShowLocationDropdown(false);
      } finally {
        setLocationLoading(false);
      }
    }, 300);
  }

  function handleLocationSelect(result: { place_name: string; center: [number, number] }) {
    setLocationName(result.place_name);
    setLatitude(result.center[1]);
    setLongitude(result.center[0]);
    setLocationQuery(result.place_name);
    setLocationResults([]);
    setShowLocationDropdown(false);
  }

  function handlePillClick(
    label: string,
    tagName: string,
    tagColor: string
  ) {
    setActivePillLabels((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
    onTogglePreset(tagName, tagColor);
    onDirty();
  }

  const showProfessionalFields = activePillLabels.includes("Professional");
  const showFamilyFields = activePillLabels.includes("Family");
  const showBirthday =
    activePillLabels.includes("Friend") || showFamilyFields;

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

        {/* FIX 1: First + Last name side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className={labelClass}>
              First name <span className="text-red-500">*</span>
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              required
              defaultValue={firstName}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="last_name" className={labelClass}>
              Last name
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              defaultValue={lastName}
              className={inputClass}
            />
          </div>
        </div>

        {/* FIX 2: Pills label → "Relationship type" */}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Relationship type
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_PILLS.map(({ label, tagName, tagColor, selectedClass }) => {
              const selected = activePillLabels.includes(label);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handlePillClick(label, tagName, tagColor)}
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

        {/* FIX 3: Professional — Company + Role (hidden when not selected) */}
        <div className={showProfessionalFields ? "grid grid-cols-2 gap-4" : "hidden"}>
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
        </div>

        {/* FIX 3: Friend or Family — Birthday (hidden when neither selected) */}
        <div className={showBirthday ? "" : "hidden"}>
          <label htmlFor="birthday_month" className={labelClass}>
            Birthday
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              id="birthday_month"
              name="birthday_month"
              type="number"
              min="1"
              max="12"
              placeholder="MM"
              defaultValue={birthday.month ?? ""}
              className={inputClass}
            />
            <input
              id="birthday_day"
              name="birthday_day"
              type="number"
              min="1"
              max="31"
              placeholder="DD"
              defaultValue={birthday.day ?? ""}
              className={inputClass}
            />
            <input
              id="birthday_year"
              name="birthday_year"
              type="number"
              min="1"
              placeholder="YYYY optional"
              defaultValue={birthday.year ?? ""}
              className={inputClass}
            />
          </div>
        </div>

        {/* FIX 3: Family — Relationship label (hidden when not selected) */}
        <div className={showFamilyFields ? "" : "hidden"}>
          <label htmlFor="relationship_type" className={labelClass}>
            Relationship e.g. parent, sibling
          </label>
          <input
            id="relationship_type"
            name="relationship_type"
            type="text"
            defaultValue={person?.relationship_type ?? ""}
            className={inputClass}
          />
        </div>

        {/* FIX 2: how_met label → "How did you meet?" */}
        <div>
          <label htmlFor="how_met" className={labelClass}>
            How did you meet?
          </label>
          <input
            id="how_met"
            name="how_met"
            type="text"
            defaultValue={person?.how_met ?? ""}
            className={inputClass}
          />
        </div>

        {/* Location search with Mapbox geocoding */}
        <div ref={locationRef} className="relative">
          <label htmlFor="location_search" className={labelClass}>
            Location
          </label>
          <div className="relative">
            <input
              id="location_search"
              type="text"
              value={locationQuery}
              onChange={(e) => {
                handleLocationQueryChange(e.target.value);
                onDirty();
              }}
              placeholder="Search for a city..."
              autoComplete="off"
              className={inputClass}
            />
            {locationLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                …
              </span>
            )}
          </div>
          {showLocationDropdown && locationResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-sm">
              {locationResults.map((result) => (
                <button
                  key={result.place_name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleLocationSelect(result);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {result.place_name}
                </button>
              ))}
            </div>
          )}
          {showLocationDropdown && !locationLoading && locationQuery && locationResults.length === 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card px-3 py-2 shadow-sm">
              <p className="text-sm text-muted-foreground">No results found</p>
            </div>
          )}
          <input type="hidden" name="location" value={locationName} />
          <input type="hidden" name="latitude" value={latitude ?? ""} />
          <input type="hidden" name="longitude" value={longitude ?? ""} />
        </div>

        {/* FIX 5: Contact frequency as human pills */}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Stay in touch
          </p>
          <div className="flex flex-wrap gap-2">
            {FREQ_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSelectedFreq(value);
                  onDirty();
                }}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  selectedFreq === value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="hidden"
            name="contact_frequency_days"
            value={selectedFreq}
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

      {/* More details — collapsible. Hidden fields always in DOM for FormData. */}
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
            <div>
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

      {/* FIX 4: Tags section removed */}

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
