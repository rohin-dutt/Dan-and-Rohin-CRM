import type { Interaction, Person, PersonNote, PersonTag, Tag } from "@/types/index";

export type ExportPayload = {
  people: Person[];
  interactions: Interaction[];
  person_notes: PersonNote[];
  tags: Tag[];
  person_tags: PersonTag[];
};

export function parsePersonalCrmExport(text: string): ExportPayload {
  const parsed = JSON.parse(text) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("This file does not look like a Personal CRM export.");
  }

  const peopleInput = requireArray(parsed, "people");
  const tagsInput = requireArray(parsed, "tags");
  const interactionsInput = requireArray(parsed, "interactions");
  const personNotesInput = optionalArray(parsed, "person_notes");
  const personTagsInput = requireArray(parsed, "person_tags");

  peopleInput.forEach(validatePerson);
  tagsInput.forEach(validateTag);
  interactionsInput.forEach(validateInteraction);
  personNotesInput.forEach(validatePersonNote);
  personTagsInput.forEach(validatePersonTag);

  const people = peopleInput as Person[];
  const tags = tagsInput as Tag[];
  const interactions = interactionsInput as Interaction[];
  const personNotes = personNotesInput as PersonNote[];
  const personTags = personTagsInput as PersonTag[];

  const personIds = new Set(people.map((person) => person.id));
  const tagIds = new Set(tags.map((tag) => tag.id));

  for (const interaction of interactions) {
    if (!personIds.has(interaction.person_id)) {
      throw new Error("Import contains an interaction for an unknown person.");
    }
  }

  for (const note of personNotes) {
    if (!personIds.has(note.person_id)) {
      throw new Error("Import contains a note for an unknown person.");
    }
  }

  for (const personTag of personTags) {
    if (!personIds.has(personTag.person_id) || !tagIds.has(personTag.tag_id)) {
      throw new Error("Import contains a tag assignment for unknown records.");
    }
  }

  return {
    people,
    tags,
    interactions,
    person_notes: personNotes,
    person_tags: personTags,
  };
}

function requireArray(
  payload: Record<string, unknown>,
  key: keyof ExportPayload
): unknown[] {
  const value = payload[key];
  if (!Array.isArray(value)) {
    throw new Error("This file does not look like a Personal CRM export.");
  }
  return value;
}

function optionalArray(
  payload: Record<string, unknown>,
  key: keyof ExportPayload
): unknown[] {
  const value = payload[key];
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array.`);
  }
  return value;
}

function validatePerson(value: unknown, index: number): asserts value is Person {
  const label = `people[${index}]`;
  assertRecord(value, label);
  requireString(value, "id", label);
  requireString(value, "user_id", label);
  requireNonEmptyString(value, "name", label);
  requirePositiveNumber(value, "contact_frequency_days", label);
  requireString(value, "created_at", label);
  optionalString(value, "email", label);
  optionalString(value, "phone", label);
  optionalString(value, "company", label);
  optionalString(value, "role", label);
  optionalString(value, "location", label);
  optionalString(value, "birthday", label);
  optionalString(value, "how_met", label);
  optionalString(value, "relationship_type", label);
  optionalString(value, "relationship_strength", label);
  optionalString(value, "preferred_contact_method", label);
  optionalString(value, "last_contacted_at", label);
  optionalString(value, "notes", label);
}

function validateTag(value: unknown, index: number): asserts value is Tag {
  const label = `tags[${index}]`;
  assertRecord(value, label);
  requireString(value, "id", label);
  requireString(value, "user_id", label);
  requireNonEmptyString(value, "name", label);
  requireString(value, "color", label);
  requireString(value, "created_at", label);
}

function validateInteraction(
  value: unknown,
  index: number
): asserts value is Interaction {
  const label = `interactions[${index}]`;
  assertRecord(value, label);
  requireString(value, "id", label);
  requireString(value, "person_id", label);
  requireNonEmptyString(value, "type", label);
  requireString(value, "date", label);
  requireBoolean(value, "follow_up_needed", label);
  requireString(value, "created_at", label);
  optionalString(value, "notes", label);
  optionalString(value, "follow_up_date", label);
  optionalString(value, "follow_up_snoozed_until", label);
  optionalBoolean(value, "is_touch_point", label);

  if (
    value.follow_up_status !== "open" &&
    value.follow_up_status !== "done" &&
    value.follow_up_status !== "snoozed"
  ) {
    throw new Error(`${label}.follow_up_status is invalid.`);
  }
}

function validatePersonNote(
  value: unknown,
  index: number
): asserts value is PersonNote {
  const label = `person_notes[${index}]`;
  assertRecord(value, label);
  requireString(value, "id", label);
  requireString(value, "user_id", label);
  requireString(value, "person_id", label);
  requireNonEmptyString(value, "body", label);
  requireString(value, "created_at", label);
  requireString(value, "updated_at", label);
  optionalString(value, "note_date", label);
}

function validatePersonTag(
  value: unknown,
  index: number
): asserts value is PersonTag {
  const label = `person_tags[${index}]`;
  assertRecord(value, label);
  requireString(value, "person_id", label);
  requireString(value, "tag_id", label);
}

function assertRecord(
  value: unknown,
  label: string
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  label: string
) {
  if (typeof record[key] !== "string") {
    throw new Error(`${label}.${key} must be a string.`);
  }
}

function requireNonEmptyString(
  record: Record<string, unknown>,
  key: string,
  label: string
) {
  requireString(record, key, label);
  if ((record[key] as string).trim() === "") {
    throw new Error(`${label}.${key} cannot be empty.`);
  }
}

function requireBoolean(
  record: Record<string, unknown>,
  key: string,
  label: string
) {
  if (typeof record[key] !== "boolean") {
    throw new Error(`${label}.${key} must be a boolean.`);
  }
}

function optionalBoolean(
  record: Record<string, unknown>,
  key: string,
  label: string
) {
  if (
    record[key] !== undefined &&
    record[key] !== null &&
    typeof record[key] !== "boolean"
  ) {
    throw new Error(`${label}.${key} must be a boolean or null.`);
  }
}

function requirePositiveNumber(
  record: Record<string, unknown>,
  key: string,
  label: string
) {
  if (
    typeof record[key] !== "number" ||
    !Number.isFinite(record[key]) ||
    record[key] <= 0
  ) {
    throw new Error(`${label}.${key} must be a positive number.`);
  }
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  label: string
) {
  if (
    record[key] !== undefined &&
    record[key] !== null &&
    typeof record[key] !== "string"
  ) {
    throw new Error(`${label}.${key} must be a string or null.`);
  }
}
