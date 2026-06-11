import { supabase } from "@/lib/supabase"

// Finds the user's tag by name (case-insensitive) or creates it.
// Throws on database errors so callers can surface the failure instead of
// silently skipping tag assignment.
export async function getOrCreateTag(
  userId: string,
  name: string,
  color: string,
): Promise<string> {
  const { data: existing, error: lookupError } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", name)
    .maybeSingle()

  if (lookupError) throw lookupError
  if (existing) return existing.id

  const { data: created, error: insertError } = await supabase
    .from("tags")
    .insert({ user_id: userId, name, color })
    .select("id")
    .single()

  if (insertError) throw insertError
  return created.id
}
