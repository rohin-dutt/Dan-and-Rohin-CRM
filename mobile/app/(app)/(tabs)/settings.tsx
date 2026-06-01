import { View, Text, TouchableOpacity, Alert } from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { colors } from "@/constants/theme"

export default function SettingsScreen() {
  const router = useRouter()

  async function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace("/(auth)/login")
        },
      },
    ])
  }

  return (
    <Screen>
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: colors.warmBlack,
          marginTop: 24,
          marginBottom: 32,
          fontFamily: "Georgia",
        }}
      >
        Settings
      </Text>
      <TouchableOpacity
        onPress={handleLogout}
        style={{
          padding: 16,
          backgroundColor: colors.card,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: "#DC2626", fontSize: 15, fontWeight: "500" }}>Sign out</Text>
      </TouchableOpacity>
    </Screen>
  )
}
