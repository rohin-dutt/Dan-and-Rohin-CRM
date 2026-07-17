import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { loadImportantMomentsForUser } from "@/lib/important-moments"
import { loadPersonNotesForPeople } from "@/lib/person-notes"
import { displayNameFromMetadata, firstNameFromMetadata } from "@/lib/user-metadata"
import { CRM_CACHE_SCHEMA_VERSION, type CrmSnapshot } from "@/lib/crm-cache"
import type { Interaction, Person, PersonNote, PersonTag, Settings, Tag } from "@/types"

async function loadSettings(userId: string): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (data) return data

  const { data: created, error: createError } = await supabase
    .from("settings")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single()
  if (createError) throw createError
  return created
}

export async function fetchCrmSnapshot(session: Session): Promise<CrmSnapshot> {
  const userId = session.user.id
  const [peopleResult, tagsResult, personTagsResult, importantMoments, settings] =
    await Promise.all([
      supabase.from("people").select("*").eq("user_id", userId),
      supabase.from("tags").select("*").eq("user_id", userId).order("name"),
      supabase.from("person_tags").select("person_id, tag_id"),
      loadImportantMomentsForUser(userId),
      loadSettings(userId),
    ])

  if (peopleResult.error) throw peopleResult.error
  if (tagsResult.error) throw tagsResult.error
  if (personTagsResult.error) throw personTagsResult.error

  const people = (peopleResult.data ?? []) as Person[]
  const personIds = people.map((person) => person.id)
  let interactions: Interaction[] = []
  let personNotes: PersonNote[] = []

  if (personIds.length > 0) {
    const [interactionsResult, loadedNotes] = await Promise.all([
      supabase
        .from("interactions")
        .select("*")
        .in("person_id", personIds)
        .eq("is_touch_point", true),
      loadPersonNotesForPeople(personIds),
    ])
    if (interactionsResult.error) throw interactionsResult.error
    interactions = (interactionsResult.data ?? []) as Interaction[]
    personNotes = loadedNotes
  }

  return {
    schemaVersion: CRM_CACHE_SCHEMA_VERSION,
    userId,
    updatedAt: new Date().toISOString(),
    profile: {
      email: session.user.email ?? "",
      displayName: displayNameFromMetadata(session.user.user_metadata),
      firstName: firstNameFromMetadata(session.user.user_metadata),
    },
    people,
    tags: (tagsResult.data ?? []) as Tag[],
    personTags: (personTagsResult.data ?? []) as PersonTag[],
    interactions,
    personNotes,
    importantMoments,
    settings,
  }
}
