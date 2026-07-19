import { useRef, useState } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import {
  DeviceEventEmitter,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { supabase } from "@/lib/supabase"
import { PASSWORD_RECOVERY_RESOLVED_EVENT } from "@/lib/auth-links"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { ErrorBanner } from "@/components/ErrorBanner"

export default function LoginScreen() {
  const router = useRouter()
  const { passwordUpdated } = useLocalSearchParams<{ passwordUpdated?: string }>()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const passwordInputRef = useRef<TextInput>(null)

  function releaseRecoveryRouting() {
    DeviceEventEmitter.emit(PASSWORD_RECOVERY_RESOLVED_EVENT)
  }

  async function handleSignIn() {
    setError(null)
    if (!email.trim()) {
      setError("Email is required")
      return
    }
    if (!password) {
      setError("Password is required")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      releaseRecoveryRouting()
      router.replace("/(app)/(tabs)/dashboard")
    }
  }

  return (
    <Screen>
      <View className="flex-1 justify-center px-6 py-12">
        <Text className="text-3xl font-bold text-warm-black mb-2">Welcome back</Text>
        <Text className="text-base text-gray-500 mb-8">Sign in to Roots</Text>

        {error && <ErrorBanner message={error} />}
        {passwordUpdated === "true" && (
          <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <Text className="text-green-700 text-sm font-medium">
              Password updated. Sign in with your new password.
            </Text>
          </View>
        )}

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordInputRef.current?.focus()}
        />
        <TextField
          ref={passwordInputRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
        />

        <TouchableOpacity
          onPress={() => router.push("/(auth)/forgot-password")}
          className="mb-6"
          accessibilityRole="button"
          accessibilityLabel="Forgot password?"
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
