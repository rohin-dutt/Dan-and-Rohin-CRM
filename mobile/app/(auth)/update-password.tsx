import { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
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
  const [saved, setSaved] = useState(false)

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
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setPassword("")
    setConfirmPassword("")
    setSaved(true)
  }

  return (
    <Screen>
      <View className="flex-1 justify-center px-6 py-12">
        <Text className="text-3xl font-bold text-warm-black mb-2">Update password</Text>
        <Text className="text-base text-gray-500 mb-8">
          Choose a new password for your Roots account.
        </Text>

        {error && <ErrorBanner message={error} />}
        {saved && (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <Text className="text-green-700 text-sm font-medium">Password updated.</Text>
          </View>
        )}

        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <Button title="Update password" onPress={handleUpdate} loading={loading} />

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Return to sign in"
          onPress={() => router.replace("/(auth)/login")}
          className="mt-4 min-h-11 items-center justify-center"
        >
          <Text className="text-sage text-sm font-medium">Back to sign in</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}
