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
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSignUp() {
    setError(null)

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.")
      return
    }

    if (email !== confirmEmail) {
      setError("Email addresses do not match.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.")
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists. Please sign in instead.")
    } else if (data.session) {
      router.replace("/(app)/onboarding")
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <Screen scrollable={false}>
        <View className="flex-1 justify-center px-6 py-12">
          <View className="bg-white border border-gray-200 rounded-2xl p-8 items-center shadow-sm">
            <Text className="text-2xl font-semibold text-warm-black mb-4">Check your email</Text>
            <Text className="text-sm text-gray-500 text-center mb-6">
              We sent a confirmation link to <Text className="font-semibold">{email}</Text>. Click it to activate your account.
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text className="text-sm font-medium text-sage underline">Back to sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      <View className="px-6 py-12">
        <Text className="text-xs font-semibold text-sage uppercase tracking-wide mb-1">Roots</Text>
        <Text className="text-2xl font-semibold text-warm-black mb-6">Create an account</Text>

        {error && <ErrorBanner message={error} />}

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextField
          label="Confirm email"
          value={confirmEmail}
          onChangeText={setConfirmEmail}
          placeholder="Confirm your email"
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
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
          secureTextEntry
          autoComplete="new-password"
        />

        <TouchableOpacity
          onPress={() => setAgreed((v) => !v)}
          className="flex-row items-start gap-3 mb-6"
          activeOpacity={0.7}
        >
          <View
            className={`w-5 h-5 rounded border mt-0.5 items-center justify-center ${agreed ? "bg-sage border-sage" : "border-gray-300 bg-white"}`}
          >
            {agreed && <Text className="text-white text-xs font-bold">✓</Text>}
          </View>
          <Text className="text-sm text-gray-500 flex-1">
            I agree to the{" "}
            <Text className="text-sage underline">Terms of Service</Text>
            {" "}and{" "}
            <Text className="text-sage underline">Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        <Button title={loading ? "Creating account…" : "Sign up"} onPress={handleSignUp} loading={loading} />

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
