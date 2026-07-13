import { Slot, useRouter, useSegments } from "expo-router"
import { useFonts } from "expo-font"
import { useEffect, useState } from "react"
import { ActivityIndicator, DeviceEventEmitter, Linking, View } from "react-native"
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
import {
  FIRST_DOWNLOAD_INTRO_COMPLETE_EVENT,
  hasCompletedFirstDownloadIntro,
} from "@/lib/first-download-intro"
import { PEOPLE_CHANGED_EVENT, userHasPeople } from "@/lib/onboarding-status"
import { installNotificationResponseHandler } from "@/lib/push-notifications"
import { colors } from "@/constants/theme"
import "../global.css"

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [introComplete, setIntroComplete] = useState<boolean | null>(null)
  const [hasPeople, setHasPeople] = useState<boolean | null>(null)
  const [peopleStatusVersion, setPeopleStatusVersion] = useState(0)
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
    Promise.all([
      supabase.auth.getSession(),
      hasCompletedFirstDownloadIntro(),
    ]).then(([{ data: { session } }, completedIntro]) => {
      setSession(session)
      setIntroComplete(completedIntro)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setHasPeople(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const introSub = DeviceEventEmitter.addListener(
      FIRST_DOWNLOAD_INTRO_COMPLETE_EVENT,
      () => setIntroComplete(true),
    )
    const peopleSub = DeviceEventEmitter.addListener(
      PEOPLE_CHANGED_EVENT,
      () => setPeopleStatusVersion((version) => version + 1),
    )

    return () => {
      introSub.remove()
      peopleSub.remove()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPeopleStatus() {
      if (!session) {
        setHasPeople(null)
        return
      }

      // Keep the previous value while refetching (PEOPLE_CHANGED_EVENT fires
      // mid-onboarding); resetting to null here would unmount the onboarding
      // screens during categorize saves. Session changes reset it via
      // onAuthStateChange instead.
      try {
        const nextHasPeople = await userHasPeople(session.user.id)
        if (!cancelled) setHasPeople(nextHasPeople)
      } catch {
        if (!cancelled) setHasPeople(false)
      }
    }

    loadPeopleStatus()
    return () => {
      cancelled = true
    }
  }, [session, peopleStatusVersion])

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
    if (loading || !fontsLoaded) return
    return installNotificationResponseHandler(router)
  }, [router, loading, fontsLoaded])

  useEffect(() => {
    if (loading || introComplete == null) return

    const inAuthGroup = segments[0] === "(auth)"
    const inIntro = segments[0] === "intro"
    const inUpdatePassword = inAuthGroup && segments.join("/") === "(auth)/update-password"
    const inOnboarding = segments.join("/").startsWith("(app)/onboarding")

    if (!session) {
      if (!introComplete && !inIntro) {
        router.replace("/intro")
      } else if (introComplete && !inAuthGroup && !inIntro) {
        router.replace("/(auth)/login")
      }
      return
    }

    if (inUpdatePassword) return
    if (hasPeople == null) return

    if (!hasPeople && !inOnboarding) {
      router.replace("/(app)/onboarding")
    } else if (hasPeople && (inAuthGroup || inIntro)) {
      router.replace("/(app)/(tabs)/dashboard")
    }
  }, [session, loading, introComplete, hasPeople, segments])

  if (
    loading ||
    (!fontsLoaded && !fontError) ||
    introComplete == null ||
    (session && hasPeople == null)
  ) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.cream,
        }}
      >
        <ActivityIndicator color={colors.forest} />
      </View>
    )
  }
  return <Slot />
}
