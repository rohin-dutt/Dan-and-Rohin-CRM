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

  const returnToForgotPassword = useCallback(() => {
    DeviceEventEmitter.emit(PASSWORD_RECOVERY_RESOLVED_EVENT)
    router.replace({
      pathname: "/(auth)/forgot-password",
      params: { recoveryError: "invalid_or_expired" },
    })
  }, [router])

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
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

  if (checkingSession) {
    return <LoadingState />
  }

  return (
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
  )
}
