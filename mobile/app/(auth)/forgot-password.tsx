import { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "../../lib/supabase"
import { Screen } from "../../components/Screen"
import { Button } from "../../components/Button"
import { TextField } from "../../components/TextField"
import { ErrorBanner } from "../../components/ErrorBanner"

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSendReset() {
    setError("")
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
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
        Reset your password
      </Text>

      <ErrorBanner message={error} />

      {sent ? (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 15, color: "#1C1917", lineHeight: 22 }}>
            Check your email for a reset link.
          </Text>
        </View>
      ) : (
        <>
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

          <View style={{ marginTop: 8, marginBottom: 24 }}>
            <Button title="Send reset link" onPress={handleSendReset} loading={loading} />
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={() => router.push("/(auth)/login")}
        style={{ alignItems: "center" }}
      >
        <Text style={{ color: "#7C9A7E", fontSize: 14 }}>Back to sign in</Text>
      </TouchableOpacity>
    </Screen>
  )
}
