import { supabase } from "@/lib/supabase"

export async function getOnboardingCompleted(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("settings")
    .select("onboarding_completed")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return data?.onboarding_completed === true
}

export async function markOnboardingCompleted(userId: string): Promise<void> {
  const completedAt = new Date().toISOString()
  const { error } = await supabase
    .from("settings")
    .upsert(
      {
        user_id: userId,
        onboarding_completed: true,
        onboarding_completed_at: completedAt,
      },
      { onConflict: "user_id" },
    )

  if (error) throw error
}
