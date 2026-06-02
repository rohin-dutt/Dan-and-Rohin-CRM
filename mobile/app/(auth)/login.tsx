import { useState } from "react"
import { useRouter } from "expo-router"
import { Text, TouchableOpacity, View } from "react-native"
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.replace("/(app)/(tabs)/dashboard")
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center px-6 py-12">
        <Text className="text-3xl font-bold text-warm-black mb-2">Welcome back</Text>
        <Text className="text-base text-gray-500 mb-8">Sign in to Roots</Text>

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
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          onPress={() => router.push("/(auth)/forgot-password")}
          className="mb-6"
        >
          <Text className="text-sage text-sm">Forgot password?</Text>
        </TouchableOpacity>

        <Button title="Sign In" onPress={handleSignIn} loading={loading} />

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
