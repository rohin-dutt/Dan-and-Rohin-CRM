import { Slot, useRouter, useSegments } from "expo-router"
import { useFonts } from "expo-font"
import * as Linking from "expo-linking"
import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, DeviceEventEmitter, View } from "react-native"

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
import {
  handlePasswordRecoveryUrl,
  isPasswordRecoveryUrl,
  PASSWORD_RECOVERY_RESOLVED_EVENT,
} from "@/lib/auth-links"
import {
  FIRST_DOWNLOAD_INTRO_COMPLETE_EVENT,
  hasCompletedFirstDownloadIntro,
} from "@/lib/first-download-intro"
import { PEOPLE_CHANGED_EVENT, userHasPeople } from "@/lib/onboarding-status"
import { clearCrmCache, readCrmSnapshot } from "@/lib/crm-cache"
import { installNotificationResponseHandler } from "@/lib/push-notifications"
import { colors } from "@/constants/theme"
import "../global.css"

export default function RootLayout() {
  const initialUrl = Linking.getLinkingURL()
  const [session, setSession] = useState<Session | null>(null)
  const [introComplete, setIntroComplete] = useState<boolean | null>(null)
  const [hasPeople, setHasPeople] = useState<boolean | null>(null)
  const [peopleStatusVersion, setPeopleStatusVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  // Stays true for the whole recovery flow (deep link -> update-password
  // screen), so routing keeps forcing update-password even once a session
  // exists. Cleared only on a successful password update or a bounce back to
  // forgot-password on an invalid/expired link.
  const [recoveryLinkPending, setRecoveryLinkPending] = useState(
    Boolean(initialUrl && isPasswordRecoveryUrl(initialUrl)),
  )
  // True only while the deep link is actively being exchanged for a session;
  // gates the loading spinner so it doesn't block the update-password screen
  // for the rest of the recovery flow.
  const [recoveryExchangeInProgress, setRecoveryExchangeInProgress] = useState(
    Boolean(initialUrl && isPasswordRecoveryUrl(initialUrl)),
  )
  const sessionUserIdRef = useRef<string | null>(null)
  const recoveryInFlightRef = useRef(false)
  const processedRecoveryFingerprintRef = useRef<number | null>(null)

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
      sessionUserIdRef.current = session?.user.id ?? null
      setSession(session)
      setIntroComplete(completedIntro)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null
      const previousUserId = sessionUserIdRef.current
      const userChanged = previousUserId !== nextUserId

      sessionUserIdRef.current = nextUserId
      setSession(nextSession)
      if (userChanged) {
        setHasPeople(null)
        if (previousUserId) void clearCrmCache()
      }
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
    const recoverySub = DeviceEventEmitter.addListener(
      PASSWORD_RECOVERY_RESOLVED_EVENT,
      () => setRecoveryLinkPending(false),
    )

    return () => {
      introSub.remove()
      peopleSub.remove()
      recoverySub.remove()
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
      let restoredFromCache = false
      try {
        const cached = await readCrmSnapshot(session.user.id).catch(() => null)
        if (cancelled) return
        if (cached) {
          restoredFromCache = true
          setHasPeople(cached.people.length > 0)
        }

        // A cached answer unblocks routing immediately. This request then
        // verifies it silently and keeps onboarding/account changes correct.
        const nextHasPeople = await userHasPeople(session.user.id)
        if (!cancelled) setHasPeople(nextHasPeople)
      } catch {
        if (!cancelled && !restoredFromCache) setHasPeople(false)
      }
    }

    loadPeopleStatus()
    return () => {
      cancelled = true
    }
  }, [session, peopleStatusVersion])

  useEffect(() => {
    function fingerprintUrl(url: string) {
      let hash = 2166136261
      for (let index = 0; index < url.length; index += 1) {
        hash ^= url.charCodeAt(index)
        hash = Math.imul(hash, 16777619)
      }
      return hash >>> 0
    }

    async function handleUrl(url: string | null) {
      if (!url || !isPasswordRecoveryUrl(url)) return

      const fingerprint = fingerprintUrl(url)
      if (
        recoveryInFlightRef.current ||
        processedRecoveryFingerprintRef.current === fingerprint
      ) {
        return
      }

      recoveryInFlightRef.current = true
      processedRecoveryFingerprintRef.current = fingerprint
      setRecoveryLinkPending(true)
      setRecoveryExchangeInProgress(true)

      try {
        const result = await handlePasswordRecoveryUrl(url)
        if (!result.handled) {
          setRecoveryLinkPending(false)
          return
        }

        if (result.ok) {
          const {
            data: { session: recoverySession },
          } = await supabase.auth.getSession()

          if (!recoverySession) {
            setRecoveryLinkPending(false)
            router.replace({
              pathname: "/(auth)/forgot-password",
              params: { recoveryError: "exchange_failed" },
            })
            return
          }

          setSession(recoverySession)
          router.replace("/(auth)/update-password")
          // recoveryLinkPending stays true: the update-password screen clears
          // it via PASSWORD_RECOVERY_RESOLVED_EVENT after a successful
          // password update, or after bouncing back to forgot-password.
        } else {
          setRecoveryLinkPending(false)
          router.replace({
            pathname: "/(auth)/forgot-password",
            params: { recoveryError: result.reason },
          })
        }
      } finally {
        recoveryInFlightRef.current = false
        setRecoveryExchangeInProgress(false)
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

    // A pending recovery link always wins: stay on (or navigate to)
    // update-password regardless of session/hasPeople state, so a valid
    // session and existing people don't bounce the user to the dashboard.
    if (recoveryLinkPending) {
      if (!inUpdatePassword) {
        router.replace("/(auth)/update-password")
      }
      return
    }

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
  }, [session, loading, introComplete, hasPeople, recoveryLinkPending, segments])

  if (
    (!fontsLoaded && !fontError) ||
    recoveryExchangeInProgress ||
    (!recoveryLinkPending && (
      loading ||
      introComplete == null ||
      (session && hasPeople == null)
    ))
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
