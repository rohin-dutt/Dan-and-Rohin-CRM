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
  findPasswordRecoveryUrl,
  handlePasswordRecoveryUrl,
  isPasswordRecoveryUrl,
  PASSWORD_RECOVERY_FAILED_EVENT,
  PASSWORD_RECOVERY_RESOLVED_EVENT,
} from "@/lib/auth-links"
import { withTimeout } from "@/lib/promise-timeout"
import {
  FIRST_DOWNLOAD_INTRO_COMPLETE_EVENT,
  hasCompletedFirstDownloadIntro,
} from "@/lib/first-download-intro"
import {
  hasCompletedOnboarding,
  ONBOARDING_COMPLETE_EVENT,
  PEOPLE_CHANGED_EVENT,
  userHasPeople,
} from "@/lib/onboarding-status"
import { clearCrmCache, readCrmSnapshot } from "@/lib/crm-cache"
import { installNotificationResponseHandler } from "@/lib/push-notifications"
import { installAppOpenTracker } from "@/lib/track-app-open"
import { shouldShowOnboardingNotificationPrompt } from "@/lib/onboarding-notifications"
import { colors } from "@/constants/theme"
import "../global.css"

const PASSWORD_RECOVERY_EXCHANGE_TIMEOUT_MS = 20_000
const APP_INITIALIZATION_TIMEOUT_MS = 10_000
const INITIAL_LINK_LOOKUP_TIMEOUT_MS = 5_000

type PasswordRecoveryStatus = "idle" | "exchanging" | "ready" | "failed"

export default function RootLayout() {
  // Expo Router uses this same synchronous iOS source. Prefer it during cold
  // start and use the asynchronous native source only as a recovery fallback.
  const linkingUrl = Linking.useLinkingURL()
  const startsInPasswordRecovery = Boolean(findPasswordRecoveryUrl(linkingUrl))
  const [session, setSession] = useState<Session | null>(null)
  const [introComplete, setIntroComplete] = useState<boolean | null>(null)
  const [hasPeople, setHasPeople] = useState<boolean | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)
  const [notificationPromptEligible, setNotificationPromptEligible] = useState<
    boolean | null
  >(null)
  const [peopleStatusVersion, setPeopleStatusVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [recoveryStatus, setRecoveryStatus] = useState<PasswordRecoveryStatus>(
    startsInPasswordRecovery ? "exchanging" : "idle",
  )
  const startsInPasswordRecoveryRef = useRef(startsInPasswordRecovery)
  const sessionUserIdRef = useRef<string | null>(null)
  const recoveryAttemptRef = useRef(0)
  const processedRecoveryFingerprintsRef = useRef(new Set<number>())

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
    let cancelled = false
    const initialSession = startsInPasswordRecoveryRef.current
      ? Promise.resolve<Session | null>(null)
      : supabase.auth.getSession().then(({ data }) => data.session)

    void withTimeout(
      Promise.all([initialSession, hasCompletedFirstDownloadIntro()]),
      APP_INITIALIZATION_TIMEOUT_MS,
    )
      .then(([nextSession, completedIntro]) => {
        if (cancelled) return

        // Recovery establishes its own session from the callback credentials.
        // Do not let ordinary startup compete with or overwrite that exchange.
        if (!startsInPasswordRecoveryRef.current) {
          sessionUserIdRef.current = nextSession?.user.id ?? null
          setSession(nextSession)
        }
        setIntroComplete(completedIntro)
      })
      .catch(() => {
        if (!cancelled) setIntroComplete(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
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
        setOnboardingComplete(null)
        setNotificationPromptEligible(null)
        if (previousUserId) void clearCrmCache()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
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
    const onboardingSub = DeviceEventEmitter.addListener(
      ONBOARDING_COMPLETE_EVENT,
      () => setOnboardingComplete(true),
    )
    const recoverySub = DeviceEventEmitter.addListener(
      PASSWORD_RECOVERY_RESOLVED_EVENT,
      () => setRecoveryStatus("idle"),
    )
    const recoveryFailureSub = DeviceEventEmitter.addListener(
      PASSWORD_RECOVERY_FAILED_EVENT,
      () => setRecoveryStatus("failed"),
    )

    return () => {
      introSub.remove()
      peopleSub.remove()
      onboardingSub.remove()
      recoverySub.remove()
      recoveryFailureSub.remove()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPeopleStatus() {
      if (!session) {
        setHasPeople(null)
        setOnboardingComplete(null)
        setNotificationPromptEligible(null)
        return
      }

      const [completedOnboarding, promptEligible] = await Promise.all([
        hasCompletedOnboarding(session.user.id).catch(() => false),
        shouldShowOnboardingNotificationPrompt(session.user.id).catch(() => false),
      ])
      if (cancelled) return
      setOnboardingComplete(completedOnboarding)
      setNotificationPromptEligible(promptEligible)

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

    async function handleUrl(url: string) {
      if (!isPasswordRecoveryUrl(url)) return

      startsInPasswordRecoveryRef.current = true
      const fingerprint = fingerprintUrl(url)
      if (processedRecoveryFingerprintsRef.current.has(fingerprint)) return

      processedRecoveryFingerprintsRef.current.add(fingerprint)
      const attempt = recoveryAttemptRef.current + 1
      recoveryAttemptRef.current = attempt
      setRecoveryStatus("exchanging")

      let timedOut = false
      const timeout = setTimeout(() => {
        if (attempt !== recoveryAttemptRef.current) return

        timedOut = true
        setRecoveryStatus("failed")
        router.replace({
          pathname: "/(auth)/forgot-password",
          params: { recoveryError: "exchange_failed" },
        })
      }, PASSWORD_RECOVERY_EXCHANGE_TIMEOUT_MS)

      try {
        const result = await handlePasswordRecoveryUrl(url)
        if (attempt !== recoveryAttemptRef.current) return

        // The auth call itself cannot be cancelled. If it succeeds after the
        // UI timeout, clear that abandoned recovery session while the failed
        // recovery state prevents normal authenticated routing.
        if (timedOut) {
          if (result.handled && result.ok) {
            await supabase.auth.signOut({ scope: "local" })
          }
          return
        }

        if (!result.handled) {
          setRecoveryStatus("idle")
          return
        }

        if (result.ok) {
          setSession(result.session)
          setRecoveryStatus("ready")
          router.replace("/(auth)/update-password")
        } else {
          setRecoveryStatus("failed")
          router.replace({
            pathname: "/(auth)/forgot-password",
            params: { recoveryError: result.reason },
          })
        }
      } catch {
        if (attempt === recoveryAttemptRef.current && !timedOut) {
          setRecoveryStatus("failed")
          router.replace({
            pathname: "/(auth)/forgot-password",
            params: { recoveryError: "exchange_failed" },
          })
        }
      } finally {
        clearTimeout(timeout)
      }
    }

    const observedRecoveryUrl = findPasswordRecoveryUrl(linkingUrl)
    if (observedRecoveryUrl) {
      void handleUrl(observedRecoveryUrl)
      return
    }

    let cancelled = false
    void withTimeout(Linking.getInitialURL(), INITIAL_LINK_LOOKUP_TIMEOUT_MS)
      .then((initialUrl) => {
        if (cancelled) return

        const initialRecoveryUrl = findPasswordRecoveryUrl(initialUrl)
        if (initialRecoveryUrl) void handleUrl(initialRecoveryUrl)
      })
      .catch(() => {
        // The normal app startup timeout below still guarantees a usable route.
      })

    return () => {
      cancelled = true
    }
  }, [linkingUrl, router])

  useEffect(() => {
    if (loading || !fontsLoaded) return
    return installNotificationResponseHandler(router)
  }, [router, loading, fontsLoaded])

  useEffect(() => {
    if (!session) return
    return installAppOpenTracker()
  }, [session])

  useEffect(() => {
    if (loading || introComplete == null) return

    const inAuthGroup = segments[0] === "(auth)"
    const inIntro = segments[0] === "intro"
    const inUpdatePassword = inAuthGroup && segments.join("/") === "(auth)/update-password"
    const inOnboarding = segments.join("/").startsWith("(app)/onboarding")

    // A successfully exchanged recovery link always wins, so a valid session
    // and existing people cannot bounce the user to the dashboard before the
    // password is changed. While exchanging, the bounded loader below remains
    // visible. A failed exchange quarantines any late session on an auth route.
    if (recoveryStatus === "exchanging") return

    if (recoveryStatus === "ready") {
      if (!inUpdatePassword) {
        router.replace("/(auth)/update-password")
      }
      return
    }

    if (recoveryStatus === "failed") {
      if (!inAuthGroup) {
        router.replace({
          pathname: "/(auth)/forgot-password",
          params: { recoveryError: "exchange_failed" },
        })
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
    if (
      hasPeople == null ||
      onboardingComplete == null ||
      notificationPromptEligible == null
    ) {
      return
    }

    const onboardingDone =
      onboardingComplete || (hasPeople && !notificationPromptEligible)

    if (!onboardingDone && !inOnboarding) {
      if (hasPeople && notificationPromptEligible) {
        router.replace("/(app)/onboarding/celebrate")
      } else {
        router.replace("/(app)/onboarding")
      }
    } else if (onboardingDone && (inAuthGroup || inIntro)) {
      router.replace("/(app)/(tabs)/dashboard")
    }
  }, [
    session,
    loading,
    introComplete,
    hasPeople,
    onboardingComplete,
    notificationPromptEligible,
    recoveryStatus,
    segments,
    router,
  ])

  if (
    (!fontsLoaded && !fontError) ||
    recoveryStatus === "exchanging" ||
    (recoveryStatus === "idle" && (
      loading ||
      introComplete == null ||
      (session && (
        hasPeople == null ||
        onboardingComplete == null ||
        notificationPromptEligible == null
      ))
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
