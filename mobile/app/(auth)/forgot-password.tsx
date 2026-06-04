import { useState } from "react"
import { useRouter } from "expo-router"
import { Text, TouchableOpacity, View } from "react-native"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { ErrorBanner } from "@/components/ErrorBanner"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleReset() {
    setError(null)
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "roots://update-password",
    })
    setLoading(false)
    if (resetError) {
      setError(resetError.message)
    } else {
      setSent(true)
    }
  }

  return (
    <Screen scrollable={false}>
      <View className="flex-1 justify-center px-6 py-12">
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-sm text-gray-500">← Back to sign in</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-semibold text-warm-black mb-2">Reset your password</Text>
        <Text className="text-sm text-gray-500 mb-8">
          Enter your email and we'll send you a reset link.
        </Text>

        {error && <ErrorBanner message={error} />}

        {sent ? (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4">
            <Text className="text-green-700 text-sm font-medium">
              Check your email for a reset link. It may take a minute to arrive.
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
            <Button
              title={loading ? "Sending…" : "Send reset link"}
              onPress={handleReset}
              loading={loading}
            />
          </>
        )}
      </View>
    </Screen>
  )
}
