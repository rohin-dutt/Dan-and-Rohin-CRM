import { Redirect } from "expo-router"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { hasCompletedOnboarding } from "@/lib/onboarding-status"
import { shouldShowOnboardingNotificationPrompt } from "@/lib/onboarding-notifications"

export default function Index() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasPeople, setHasPeople] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [notificationPromptEligible, setNotificationPromptEligible] = useState(false)

  useEffect(() => {
    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
      if (session) {
        const [{ count }, completed, promptEligible] = await Promise.all([
          supabase
            .from("people")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.user.id),
          hasCompletedOnboarding(session.user.id).catch(() => false),
          shouldShowOnboardingNotificationPrompt(session.user.id).catch(() => false),
        ])
        setHasPeople((count ?? 0) > 0)
        setOnboardingComplete(completed)
        setNotificationPromptEligible(promptEligible)
      }
      setLoading(false)
    }
    check()
  }, [])

  if (loading) return null
  if (!session) return <Redirect href="/(auth)/login" />
  if (!onboardingComplete && hasPeople && notificationPromptEligible) {
    return <Redirect href="/(app)/onboarding/celebrate" />
  }
  if (!hasPeople && !onboardingComplete) return <Redirect href="/(app)/onboarding" />
  return <Redirect href="/(app)/(tabs)/dashboard" />
}
