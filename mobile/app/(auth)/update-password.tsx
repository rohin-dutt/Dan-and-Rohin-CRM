import { useState } from "react"
import { Text, View } from "react-native"
import { useRouter } from "expo-router"
import { Button } from "@/components/Button"
import { ErrorBanner } from "@/components/ErrorBanner"
import { Screen } from "@/components/Screen"
import { TextField } from "@/components/TextField"
import { supabase } from "@/lib/supabase"

export default function UpdatePasswordScreen() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleUpdate() {
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.replace("/(app)/(tabs)/dashboard")
    }, 1500)
  }

  return (
    <Screen scrollable={false}>
      <View className="flex-1 justify-center px-6 py-12">
        <Text className="text-2xl font-semibold text-warm-black mb-6">Choose a new password</Text>

        {error && <ErrorBanner message={error} />}

        {success ? (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4">
            <Text className="text-green-700 text-sm font-medium">
              Password updated successfully. Redirecting…
            </Text>
          </View>
        ) : (
          <>
            <TextField
              label="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <TextField
              label="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <Button
              title={loading ? "Updating…" : "Update password"}
              onPress={handleUpdate}
              loading={loading}
            />
          </>
        )}
      </View>
    </Screen>
  )
}
