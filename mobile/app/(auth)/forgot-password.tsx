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
    if (!email.trim()) {
      setError("Email is required")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "roots://update-password",
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center px-6 py-12">
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-sage text-sm">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-warm-black mb-2">Reset password</Text>
        <Text className="text-base text-gray-500 mb-8">
          We'll send a reset link to your email.
        </Text>

        {error && <ErrorBanner message={error} />}

        {sent ? (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4">
            <Text className="text-green-700 text-sm font-medium">
              Check your email for a reset link.
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
