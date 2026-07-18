import { useCallback, useEffect, useRef, useState } from "react"
import { DeviceEventEmitter, Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Button } from "@/components/Button"
import { ErrorBanner } from "@/components/ErrorBanner"
import { Screen } from "@/components/Screen"
import { TextField } from "@/components/TextField"
import { LoadingState } from "@/components/LoadingState"
import { supabase } from "@/lib/supabase"
import {
  PASSWORD_RECOVERY_FAILED_EVENT,
  PASSWORD_RECOVERY_RESOLVED_EVENT,
  type PasswordRecoveryFailureReason,
} from "@/lib/auth-links"
import { withTimeout } from "@/lib/promise-timeout"

const SESSION_CHECK_TIMEOUT_MS = 10_000
const PASSWORD_UPDATE_TIMEOUT_MS = 20_000

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
  const passwordUpdatedRef = useRef(false)

  const returnToForgotPassword = useCallback(
    (reason: PasswordRecoveryFailureReason = "invalid_or_expired") => {
      DeviceEventEmitter.emit(PASSWORD_RECOVERY_FAILED_EVENT)
      router.replace({
        pathname: "/(auth)/forgot-password",
        params: { recoveryError: reason },
      })
    },
    [router],
  )

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), SESSION_CHECK_TIMEOUT_MS)
        if (cancelled) return

        if (!session) {
          returnToForgotPassword()
        }
      } catch {
        if (!cancelled) returnToForgotPassword("exchange_failed")
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    }

    void checkSession()

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

    if (!passwordUpdatedRef.current && password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    if (!passwordUpdatedRef.current && password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      if (!passwordUpdatedRef.current) {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), SESSION_CHECK_TIMEOUT_MS)

        if (!session) {
          returnToForgotPassword()
          return
        }

        const { error: updateError } = await withTimeout(
          supabase.auth.updateUser({ password }),
          PASSWORD_UPDATE_TIMEOUT_MS,
        )

        if (updateError) {
          let currentSession = null
          try {
            const response = await withTimeout(
              supabase.auth.getSession(),
              SESSION_CHECK_TIMEOUT_MS,
            )
            currentSession = response.data.session
          } catch {
            // Treat an unconfirmable session as expired below.
          }

          if (!currentSession || updateError.status === 401) {
            returnToForgotPassword()
            return
          }

          setError("We couldn't update your password. Please try again.")
          return
        }

        passwordUpdatedRef.current = true
      }

      intentionalSignOutRef.current = true
      const { error: signOutError } = await withTimeout(
        supabase.auth.signOut({ scope: "local" }),
        SESSION_CHECK_TIMEOUT_MS,
      )
      if (signOutError) {
        intentionalSignOutRef.current = false
        setError("Password updated, but we couldn't sign you out. Please try again.")
        return
      }

      setPassword("")
      setConfirmPassword("")
      DeviceEventEmitter.emit(PASSWORD_RECOVERY_RESOLVED_EVENT)
      router.replace({ pathname: "/(auth)/login", params: { passwordUpdated: "true" } })
    } catch {
      intentionalSignOutRef.current = false
      setError("We couldn't update your password. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
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
