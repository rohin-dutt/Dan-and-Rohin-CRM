import { useRef, useState } from "react"
import { useRouter } from "expo-router"
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
import { markOnboardingNotificationPromptEligible } from "@/lib/onboarding-notifications"

export default function SignupScreen() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const lastNameInputRef = useRef<TextInput>(null)
  const emailInputRef = useRef<TextInput>(null)
  const passwordInputRef = useRef<TextInput>(null)
  const confirmPasswordInputRef = useRef<TextInput>(null)

  function releaseRecoveryRouting() {
    DeviceEventEmitter.emit(PASSWORD_RECOVERY_RESOLVED_EVENT)
  }

  async function handleSignUp() {
    setError(null)
    if (!firstName.trim()) {
      setError("First name is required")
      return
    }
    if (!email.trim()) {
      setError("Email is required")
      return
    }
    if (!password) {
      setError("Password is required")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else if (data.user) {
      const isNewSignup = Boolean(data.session || data.user.identities?.length)
      if (isNewSignup) {
        await markOnboardingNotificationPromptEligible(data.user.id)
      }
      if (!data.session) {
        setConfirmationSent(true)
      } else {
        router.replace("/(app)/onboarding")
      }
    } else if (!data.session) {
      setConfirmationSent(true)
    } else {
      releaseRecoveryRouting()
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

        <TextField
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          autoComplete="given-name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => lastNameInputRef.current?.focus()}
        />
        <TextField
          ref={lastNameInputRef}
          label="Last name"
          value={lastName}
          onChangeText={setLastName}
          autoComplete="family-name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailInputRef.current?.focus()}
        />
        <TextField
          ref={emailInputRef}
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
          autoComplete="new-password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
        />
        <TextField
          ref={confirmPasswordInputRef}
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
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
