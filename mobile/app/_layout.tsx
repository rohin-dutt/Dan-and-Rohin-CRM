import { Slot, useRouter, useSegments } from "expo-router"
import { useFonts } from "expo-font"
import { useEffect, useState } from "react"
import { Linking } from "react-native"
import {
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond"
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter"
import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"
import { handlePasswordRecoveryUrl } from "@/lib/auth-links"
import { getOnboardingCompleted } from "@/lib/onboarding"
import "../global.css"

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  })
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return
      const result = await handlePasswordRecoveryUrl(url)
      if (result.handled) {
        router.replace("/(auth)/update-password")
      }
    }

    Linking.getInitialURL().then(handleUrl)
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url)
    })

    return () => subscription.remove()
  }, [router])

  useEffect(() => {
    let cancelled = false
    if (loading) return
    async function routeForSession() {
      const inAuthGroup = segments[0] === "(auth)"
      const inAppGroup = segments[0] === "(app)"
      const segmentPath = segments.join("/")
      const inOnboarding = inAppGroup && segmentPath === "(app)/onboarding"
      const inUpdatePassword = inAuthGroup && segmentPath === "(auth)/update-password"
      if (!session && !inAuthGroup) {
        router.replace("/(auth)/login")
        return
      }
      if (!session || inUpdatePassword) return
      const onboardingComplete = await getOnboardingCompleted(session.user.id)
      if (cancelled) return
      if (!onboardingComplete && !inOnboarding) {
        router.replace("/(app)/onboarding")
        return
      }
      if (onboardingComplete && (inAuthGroup || inOnboarding)) {
        router.replace("/(app)/(tabs)/dashboard")
      }
    }
    void routeForSession()
    return () => {
      cancelled = true
    }
  }, [session, loading, segments])

  if (loading || (!fontsLoaded && !fontError)) return null
  return <Slot />
}
