import { useCallback, useEffect, useRef, useState } from "react"
import { DeviceEventEmitter, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Button } from "@/components/Button"
import { ErrorBanner } from "@/components/ErrorBanner"
import { Screen } from "@/components/Screen"
import { TextField } from "@/components/TextField"
import { LoadingState } from "@/components/LoadingState"
import { supabase } from "@/lib/supabase"
import { PASSWORD_RECOVERY_RESOLVED_EVENT } from "@/lib/auth-links"

export default function UpdatePasswordScreen() {
  console.log("[UPDATE-PASSWORD] component rendered")
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const confirmPasswordInputRef = useRef<TextInput>(null)
  // Signing out after a successful update also drops the session, which
  // would otherwise trip the "session lost" listener below and bounce to
  // forgot-password right as we're navigating to login.
  const intentionalSignOutRef = useRef(false)

  // TEMPORARY: on-screen debug overlay for diagnosing the password recovery
  // stuck loading screen without Xcode. Remove after diagnosis.
  const [debugLog, setDebugLog] = useState<string[]>([])
  function addDebugLog(msg: string) {
    setDebugLog((prev) => [...prev.slice(-9), msg])
  }

  // Render-time console.log fires every render; the on-screen log only
  // needs the mount event, so it's recorded once via effect to avoid
  // triggering a state-update-during-render loop.
  useEffect(() => {
    addDebugLog("component rendered")
  }, [])

  const returnToForgotPassword = useCallback(() => {
    console.log("[UPDATE-PASSWORD] returning to forgot-password")
    addDebugLog("returning to forgot-password")
    DeviceEventEmitter.emit(PASSWORD_RECOVERY_RESOLVED_EVENT)
    router.replace({
      pathname: "/(auth)/forgot-password",
      params: { recoveryError: "invalid_or_expired" },
    })
  }, [router])

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[UPDATE-PASSWORD] getSession resolved, session exists:", Boolean(session))
      addDebugLog(`getSession resolved, session exists: ${Boolean(session)}`)
      if (cancelled) return

      if (!session) {
        returnToForgotPassword()
        return
      }

      setCheckingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[UPDATE-PASSWORD] onAuthStateChange fired, session exists:", Boolean(session), "intentionalSignOut:", intentionalSignOutRef.current)
      addDebugLog(
        `onAuthStateChange fired, session exists: ${Boolean(session)}, intentionalSignOut: ${intentionalSignOutRef.current}`,
      )
      if (!cancelled && !session && !intentionalSignOutRef.current) {
        returnToForgotPassword()
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [returnToForgotPassword])

  async function handleUpdate() {
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setLoading(false)
      returnToForgotPassword()
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession()
      setLoading(false)

      if (!currentSession || updateError.status === 401) {
        returnToForgotPassword()
        return
      }

      setError("We couldn't update your password. Please try again.")
      return
    }

    setPassword("")
    setConfirmPassword("")
    intentionalSignOutRef.current = true
    await supabase.auth.signOut({ scope: "local" })
    DeviceEventEmitter.emit(PASSWORD_RECOVERY_RESOLVED_EVENT)
    router.replace({ pathname: "/(auth)/login", params: { passwordUpdated: "true" } })
  }

  // TEMPORARY: on-screen debug overlay for diagnosing the password recovery
  // stuck loading screen without Xcode. Remove after diagnosis.
  const debugOverlay = debugLog.length > 0 ? (
    <View
      style={{
        position: "absolute",
        bottom: 40,
        left: 16,
        right: 16,
        backgroundColor: "rgba(0,0,0,0.85)",
        borderRadius: 8,
        padding: 12,
        maxHeight: 300,
      }}
    >
      {debugLog.map((log, i) => (
        <Text key={i} style={{ color: "#0f0", fontSize: 10, fontFamily: "monospace" }}>
          {log}
        </Text>
      ))}
    </View>
  ) : null

  if (checkingSession) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingState />
        {debugOverlay}
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View className="flex-1 justify-center px-6 py-12">
          <Text className="text-3xl font-bold text-warm-black mb-2">Update password</Text>
          <Text className="text-base text-gray-500 mb-8">
            Choose a new password for your Roots account.
          </Text>

          {error && <ErrorBanner message={error} />}

          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
          />
          <TextField
            ref={confirmPasswordInputRef}
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
          />

          <Button title="Update password" onPress={handleUpdate} loading={loading} />
        </View>
      </Screen>
      {debugOverlay}
    </View>
  )
}
