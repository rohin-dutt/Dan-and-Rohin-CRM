import { useState } from "react"
import { useRouter } from "expo-router"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { ErrorBanner } from "@/components/ErrorBanner"

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setError(null)
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
    } else {
      router.replace("/(app)/(tabs)/dashboard")
    }
  }

  return (
    <Screen scrollable={false}>
      <View className="flex-1 justify-center px-6 py-12">
        <Text className="text-xs font-semibold text-sage uppercase tracking-wide mb-1">Roots</Text>
        <Text className="text-2xl font-semibold text-warm-black mb-6">Sign in</Text>

        {error && <ErrorBanner message={error} />}

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-sm font-medium text-warm-black">Password</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
              <Text className="text-xs text-gray-500">Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            accessibilityLabel="Password"
            className="border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white text-warm-black"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <Button title={loading ? "Signing in…" : "Sign in"} onPress={handleSignIn} loading={loading} />

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          className="mt-4 items-center"
        >
          <Text className="text-gray-500 text-sm">
            Don't have an account?{" "}
            <Text className="text-sage font-medium">Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}
