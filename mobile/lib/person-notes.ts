import { supabase } from "@/lib/supabase"
import type { PersonNote } from "@/types"

type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function isMissingPersonNotesError(error: SupabaseLikeError | null | undefined): boolean {
  if (!error) return false

  const text = [error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase()
  const mentionsPersonNotes = text.includes("person_notes")
  const hasMissingTableCode = error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST204"
  const hasMissingTableText =
    text.includes("schema cache") ||
    text.includes("could not find the table") ||
    text.includes("does not exist") ||
    text.includes("relation")

  return mentionsPersonNotes && (hasMissingTableCode || hasMissingTableText)
}

export async function loadPersonNotesForPerson(personId: string): Promise<PersonNote[]> {
  const { data, error } = await supabase
    .from("person_notes")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false })

  if (isMissingPersonNotesError(error)) return []
  if (error) throw error
  return data ?? []
}

export async function countPersonNotesForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("person_notes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  if (isMissingPersonNotesError(error)) return 0
  if (error) throw error
  return count ?? 0
}

export async function loadPersonNotesForPeople(personIds: string[]): Promise<PersonNote[]> {
  if (personIds.length === 0) return []

  const { data, error } = await supabase
    .from("person_notes")
    .select("*")
    .in("person_id", personIds)
    .order("created_at", { ascending: false })

  if (isMissingPersonNotesError(error)) return []
  if (error) throw error
  return data ?? []
}
