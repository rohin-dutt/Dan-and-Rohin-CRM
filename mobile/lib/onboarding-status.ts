import { supabase } from "@/lib/supabase"

export const PEOPLE_CHANGED_EVENT = "peopleChanged"

export async function userHasPeople(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("people")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) throw error
  return (count ?? 0) > 0
}
