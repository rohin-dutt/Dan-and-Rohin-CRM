import { useState } from "react"
import { useRouter } from "expo-router"
import { Text, TouchableOpacity, View } from "react-native"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { ErrorBanner } from "@/components/ErrorBanner"

export default function SignupScreen() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSignUp() {
    setError(null)
    if (!firstName.trim()) {
      setError("First name is required")
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else if (!data.session) {
      setConfirmationSent(true)
    } else {
      router.replace("/(app)/onboarding")
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center px-6 py-12">
        <Text className="text-3xl font-bold text-warm-black mb-2">Create account</Text>
        <Text className="text-base text-gray-500 mb-8">Join Roots</Text>

        {error && <ErrorBanner message={error} />}
        {confirmationSent && (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <Text className="text-green-700 text-sm font-medium">
              Check your email to confirm your account before signing in.
            </Text>
          </View>
        )}

        <TextField label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
        <TextField label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <Button title="Create Account" onPress={handleSignUp} loading={loading} />

        <TouchableOpacity
          onPress={() => router.push("/(auth)/login")}
          className="mt-4 items-center"
        >
          <Text className="text-gray-500 text-sm">
            Already have an account?{" "}
            <Text className="text-sage font-medium">Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}
