import { useState, useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, Alert, Switch, Linking } from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { colors } from "@/constants/theme"
import type { Settings } from "@/types"

function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 12,
      fontWeight: "700",
      color: colors.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 24,
      marginBottom: 8,
    }}>
      {title}
    </Text>
  )
}

function Row({
  label,
  labelColor,
  onPress,
  right,
}: {
  label: string
  labelColor?: string
  onPress?: () => void
  right?: React.ReactNode
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 15, color: labelColor ?? colors.warmBlack }}>{label}</Text>
      {right ?? (onPress ? <Text style={{ fontSize: 15, color: colors.muted }}>›</Text> : null)}
    </TouchableOpacity>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [emailReminders, setEmailReminders] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setEmail(session.user.email ?? "")

      const { data } = await supabase
        .from("settings")
        .select("email_reminders_enabled")
        .eq("user_id", session.user.id)
        .single()

      if (data) {
        setEmailReminders((data as Pick<Settings, "email_reminders_enabled">).email_reminders_enabled)
      }
      setLoadingSettings(false)
    }
    loadData()
  }, [])

  async function saveEmailReminders(value: boolean) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase
      .from("settings")
      .update({ email_reminders_enabled: value })
      .eq("user_id", session.user.id)
  }

  function handleToggleEmailReminders(value: boolean) {
    setEmailReminders(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => saveEmailReminders(value), 500)
  }

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
    <Screen scroll>
      <Text style={{
        fontSize: 26,
        fontWeight: "700",
        color: colors.warmBlack,
        fontFamily: "Georgia",
        marginTop: 8,
        marginBottom: 4,
      }}>
        Settings
      </Text>

      {/* Account */}
      <SectionHeader title="Account" />
      <Card style={{ padding: 0, paddingHorizontal: 16 }}>
        <Row label={email || "…"} />
        <Row
          label="Sign out"
          labelColor={colors.error}
          onPress={handleLogout}
        />
      </Card>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      <Card style={{ padding: 0, paddingHorizontal: 16 }}>
        <Row
          label="Weekly email digest"
          right={
            <Switch
              value={emailReminders}
              onValueChange={handleToggleEmailReminders}
              trackColor={{ false: colors.border, true: colors.sage }}
              thumbColor="#FFFFFF"
              disabled={loadingSettings}
            />
          }
        />
      </Card>

      {/* About */}
      <SectionHeader title="About" />
      <Card style={{ padding: 0, paddingHorizontal: 16 }}>
        <Row
          label="Privacy Policy"
          onPress={() => Linking.openURL("https://useroots.app/privacy")}
        />
        <Row
          label="Terms of Service"
          onPress={() => Linking.openURL("https://useroots.app/terms")}
        />
        <Row label="Version 1.0.0" />
      </Card>
    </Screen>
  )
}
