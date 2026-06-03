import { Slot, useRouter, useSegments } from "expo-router"
import { useEffect, useState } from "react"
import { Linking } from "react-native"
import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"
import { handlePasswordRecoveryUrl } from "@/lib/auth-links"
import "../global.css"

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
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
    if (loading) return
    const inAuthGroup = segments[0] === "(auth)"
    const inUpdatePassword = inAuthGroup && segments.join("/") === "(auth)/update-password"
    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login")
    } else if (session && inAuthGroup && !inUpdatePassword) {
      router.replace("/(app)/(tabs)/dashboard")
    }
  }, [session, loading, segments])

  if (loading) return null
  return <Slot />
}
