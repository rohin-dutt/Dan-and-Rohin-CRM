import { useCallback, useEffect, useRef, useState } from "react"
import { Text, TextInput, View } from "react-native"
import { useRouter } from "expo-router"
import { Button } from "@/components/Button"
import { ErrorBanner } from "@/components/ErrorBanner"
import { Screen } from "@/components/Screen"
import { TextField } from "@/components/TextField"
import { LoadingState } from "@/components/LoadingState"
import { supabase } from "@/lib/supabase"

export default function UpdatePasswordScreen() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const confirmPasswordInputRef = useRef<TextInput>(null)

  const returnToForgotPassword = useCallback(() => {
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
      if (!cancelled && !session) {
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
    setSaved(false)

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

    setLoading(false)
    setPassword("")
    setConfirmPassword("")
    setSaved(true)
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

        {saved ? (
          <>
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <Text className="text-green-700 text-sm font-medium">
                Password updated successfully.
              </Text>
            </View>
            <Button
              title="Continue to Roots"
              onPress={() => router.replace("/(app)/(tabs)/dashboard")}
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </View>
    </Screen>
  )
}
