import { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "../../lib/supabase"
import { Screen } from "../../components/Screen"
import { Button } from "../../components/Button"
import { TextField } from "../../components/TextField"
import { ErrorBanner } from "../../components/ErrorBanner"

export default function SignupScreen() {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    setError("")
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.replace("/(app)/onboarding")
    }
  }

  return (
    <Screen>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: "#1C1917",
          marginTop: 64,
          marginBottom: 24,
          fontFamily: "Georgia",
        }}
      >
        Create your account
      </Text>

      <ErrorBanner message={error} />

      <TextField
        label="First name"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Jane"
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
      />

      <TextField
        label="Last name"
        value={lastName}
        onChangeText={setLastName}
        placeholder="Smith"
        autoCapitalize="words"
        autoComplete="family-name"
        textContentType="familyName"
      />

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />

      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <View style={{ marginTop: 8, marginBottom: 24 }}>
        <Button title="Create account" onPress={handleSignUp} loading={loading} />
      </View>

      <TouchableOpacity
        onPress={() => router.push("/(auth)/login")}
        style={{ alignItems: "center" }}
      >
        <Text style={{ color: "#6B7280", fontSize: 14 }}>
          Already have an account?{" "}
          <Text style={{ color: "#7C9A7E", fontWeight: "600" }}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </Screen>
  )
}
