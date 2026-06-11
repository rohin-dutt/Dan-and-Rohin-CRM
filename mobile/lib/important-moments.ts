import { supabase } from "@/lib/supabase"
import type { ImportantMoment } from "@/types"

type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function isMissingImportantMomentsError(error: SupabaseLikeError | null | undefined): boolean {
  if (!error) return false

  const text = [error.message, error.details, error.hint].filter(Boolean).join(" ").toLowerCase()
  const mentionsImportantMoments = text.includes("important_moments")
  const hasMissingTableCode = error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST204"
  const hasMissingTableText =
    text.includes("schema cache") ||
    text.includes("could not find the table") ||
    text.includes("does not exist") ||
    text.includes("relation")

  return mentionsImportantMoments && (hasMissingTableCode || hasMissingTableText)
}

export async function loadImportantMomentsForUser(userId: string): Promise<ImportantMoment[]> {
  const { data, error } = await supabase.from("important_moments").select("*").eq("user_id", userId)

  if (isMissingImportantMomentsError(error)) {
    return []
  }

  if (error) throw error
  return data ?? []
}

export async function loadImportantMomentsForPerson(personId: string): Promise<ImportantMoment[]> {
  const { data, error } = await supabase
    .from("important_moments")
    .select("*")
    .eq("person_id", personId)
    .order("date", { ascending: true })

  if (isMissingImportantMomentsError(error)) {
    return []
  }

  if (error) throw error
  return data ?? []
}
