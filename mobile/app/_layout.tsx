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
import { installNotificationResponseHandler } from "@/lib/push-notifications"
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

  useEffect(() => installNotificationResponseHandler(router), [router])

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === "(auth)"
    const inUpdatePassword = inAuthGroup && segments.join("/") === "(auth)/update-password"
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login")
    } else if (session && inAuthGroup && !inUpdatePassword) {
      router.replace("/(app)/(tabs)/dashboard")
    }
  }, [session, loading, segments])

  if (loading || (!fontsLoaded && !fontError)) return null
  return <Slot />
}
