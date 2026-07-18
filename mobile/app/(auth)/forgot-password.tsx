import { useState } from "react"
import * as Linking from "expo-linking"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Text, TouchableOpacity, View } from "react-native"
import { supabase } from "@/lib/supabase"
import {
  PASSWORD_RECOVERY_ERROR_MESSAGES,
  type PasswordRecoveryFailureReason,
} from "@/lib/auth-links"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { ErrorBanner } from "@/components/ErrorBanner"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const { recoveryError } = useLocalSearchParams<{
    recoveryError?: PasswordRecoveryFailureReason
  }>()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [dismissedLinkError, setDismissedLinkError] = useState(false)

  const linkError = recoveryError && !dismissedLinkError
    ? PASSWORD_RECOVERY_ERROR_MESSAGES[recoveryError]
    : null

  function handleBack() {
    router.replace("/(auth)/login")
  }

  async function handleReset() {
    setError(null)
    setDismissedLinkError(true)
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError("Email is required")
      return
    }

    setEmail(normalizedEmail)
    setLoading(true)

    try {
      const redirectTo = Linking.createURL("update-password")
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo },
      )

      if (requestError) {
        setError("We couldn't send a reset link. Check your connection and try again.")
        return
      }

      setSent(true)
    } catch {
      setError("We couldn't send a reset link. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center px-6 py-12">
        <TouchableOpacity
          onPress={handleBack}
          className="mb-6"
          accessibilityRole="button"
          accessibilityLabel="Back to sign in"
        >
          <Text className="text-sage text-sm">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-warm-black mb-2">Reset password</Text>
        <Text className="text-base text-gray-500 mb-8">
          We'll send a reset link to your email.
        </Text>

        {(error || linkError) && <ErrorBanner message={error ?? linkError ?? ""} />}

        {sent ? (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4">
            <Text className="text-green-700 text-sm font-medium">
              If an account exists for that email, a reset link is on its way.
            </Text>
          </View>
        ) : (
          <>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Button title="Send Reset Link" onPress={handleReset} loading={loading} />
          </>
        )}
      </View>
    </Screen>
  )
}
