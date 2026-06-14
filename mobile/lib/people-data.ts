import { DeviceEventEmitter } from "react-native"
import { supabase } from "@/lib/supabase"
import { buildMomentInsertRows, type ImportantMomentDraft } from "@roots/shared"
import { findRelationshipCategory } from "@/constants/categories"
import { getOrCreateTag } from "@/lib/tags"
import { PEOPLE_CHANGED_EVENT } from "@/lib/onboarding-status"
import type { Person } from "@/types"

// Column values written to the `people` table by add/edit/onboarding flows.
export type PersonWriteValues = Partial<
  Omit<Person, "id" | "user_id" | "created_at" | "last_contacted_at">
>

// Thrown when a person row was written but a follow-up step (tags or
// important moments) failed. Callers can use `personId` to avoid duplicate
// person rows on retry and decide whether the failure should block the flow.
export class PersonRelationsError extends Error {
  personId: string
  step: "relationship_tag" | "person_tags" | "important_moments"

  constructor(
    personId: string,
    step: PersonRelationsError["step"],
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : `Failed to save ${step.replace("_", " ")}`)
    this.name = "PersonRelationsError"
    this.personId = personId
    this.step = step
  }
}

async function assignRelationshipTag(
  userId: string,
  personId: string,
  categoryLabel: string | null | undefined,
  existingTagIds?: string[],
): Promise<string | null> {
  const category = findRelationshipCategory(categoryLabel)
  if (!category) return null

  const tagId = await getOrCreateTag(userId, category.tagName, category.tagColor)
  if (existingTagIds?.includes(tagId)) return null
  return tagId
}

async function replaceImportantMoments(
  userId: string,
  personId: string,
  moments: ImportantMomentDraft[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("important_moments")
    .delete()
    .eq("person_id", personId)
  if (deleteError) throw deleteError

  if (moments.length > 0) {
    const { error: insertError } = await supabase
      .from("important_moments")
      .insert(buildMomentInsertRows(userId, personId, moments))
    if (insertError) throw insertError
  }
}

// Creates a person plus relationship tag and important moments.
// Every step checks its error. The steps are still separate Supabase writes,
// so a failure after the person insert leaves the person without tags or
// moments; that partial state is surfaced through PersonRelationsError.
// TODO: move this multi-step write into an RPC/trusted route when true
// transactionality is needed (tracked in docs/MOBILE_TODO.md).
export async function createPersonWithRelations(input: {
  userId: string
  person: PersonWriteValues
  categoryLabel?: string | null
  moments?: ImportantMomentDraft[]
}): Promise<string> {
  const { userId, person, categoryLabel, moments = [] } = input

  const { data: created, error: insertError } = await supabase
    .from("people")
    .insert({ user_id: userId, ...person })
    .select("id")
    .single()
  if (insertError) throw insertError

  const personId = created.id as string
  DeviceEventEmitter.emit(PEOPLE_CHANGED_EVENT)

  try {
    const tagId = await assignRelationshipTag(userId, personId, categoryLabel)
    if (tagId) {
      const { error: linkError } = await supabase
        .from("person_tags")
        .insert({ person_id: personId, tag_id: tagId })
      if (linkError) throw linkError
    }
  } catch (cause) {
    throw new PersonRelationsError(personId, "relationship_tag", cause)
  }

  if (moments.length > 0) {
    try {
      const { error: momentsError } = await supabase
        .from("important_moments")
        .insert(buildMomentInsertRows(userId, personId, moments))
      if (momentsError) throw momentsError
    } catch (cause) {
      throw new PersonRelationsError(personId, "important_moments", cause)
    }
  }

  return personId
}

// Updates a person and replaces their tags and important moments.
// Same caveat as createPersonWithRelations: steps are error-checked but not
// atomic until an RPC/trusted route exists.
export async function updatePersonWithRelations(input: {
  userId: string
  personId: string
  person: PersonWriteValues
  categoryLabel?: string | null
  tagIds?: string[]
  moments?: ImportantMomentDraft[]
}): Promise<void> {
  const { userId, personId, person, categoryLabel, tagIds = [], moments = [] } = input

  const { error: updateError } = await supabase
    .from("people")
    .update(person)
    .eq("id", personId)
  if (updateError) throw updateError

  let finalTagIds = [...tagIds]
  try {
    const tagId = await assignRelationshipTag(userId, personId, categoryLabel, finalTagIds)
    if (tagId) finalTagIds = [...finalTagIds, tagId]

    const { error: clearError } = await supabase
      .from("person_tags")
      .delete()
      .eq("person_id", personId)
    if (clearError) throw clearError

    if (finalTagIds.length > 0) {
      const { error: linkError } = await supabase
        .from("person_tags")
        .insert(finalTagIds.map((id) => ({ person_id: personId, tag_id: id })))
      if (linkError) throw linkError
    }
  } catch (cause) {
    throw new PersonRelationsError(personId, "person_tags", cause)
  }

  try {
    await replaceImportantMoments(userId, personId, moments)
  } catch (cause) {
    throw new PersonRelationsError(personId, "important_moments", cause)
  }
}
