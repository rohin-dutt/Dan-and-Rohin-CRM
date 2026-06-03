import { useEffect, useState } from "react"
import { Alert, Linking, Switch, Text, TouchableOpacity, View } from "react-native"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { clearLocalPrivateData } from "@/lib/private-data"
import { registerPushToken, revokePushToken } from "@/lib/push-notifications"
import { callTrustedApi } from "@/lib/trusted-api"
import { colors } from "@/constants/theme"
import type { Settings } from "@/types"

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [settings, setSettings] = useState<Settings | null>(null)
  const [toggling, setToggling] = useState(false)
  const [pushWorking, setPushWorking] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return
        setEmail(session.user.email ?? "")

        const { data } = await supabase
          .from("settings")
          .select("*")
          .eq("user_id", session.user.id)
          .single()
        setSettings(data ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load settings")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await revokePushToken().catch(() => null)
          await clearLocalPrivateData()
          await supabase.auth.signOut()
        },
      },
    ])
  }

  async function toggleEmailReminders(value: boolean) {
    if (!settings) return
    setToggling(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const { error: err } = await supabase
        .from("settings")
        .update({ email_reminders_enabled: value })
        .eq("user_id", session.user.id)
      if (err) throw err
      setSettings({ ...settings, email_reminders_enabled: value })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update settings")
    } finally {
      setToggling(false)
    }
  }

  async function updateSettingsPatch(patch: Partial<Settings>) {
    if (!settings) return
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    const { error: err } = await supabase
      .from("settings")
      .update(patch)
      .eq("user_id", session.user.id)
    if (err) throw err
    setSettings({ ...settings, ...patch })
    setError(null)
  }

  async function togglePushPreference(
    field: "push_followups_enabled" | "push_birthdays_enabled",
    value: boolean,
  ) {
    if (!settings) return
    setPushWorking(true)
    try {
      if (value) {
        await registerPushToken()
      } else if (!value && !settings[field === "push_followups_enabled" ? "push_birthdays_enabled" : "push_followups_enabled"]) {
        await revokePushToken()
      }

      await updateSettingsPatch({ [field]: value } as Partial<Settings>)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update notification settings")
    } finally {
      setPushWorking(false)
    }
  }

  async function handleDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your Roots account and private CRM data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            setDeletingAccount(true)
            setError(null)
            try {
              await callTrustedApi("/api/account/delete", {
                method: "POST",
                body: { confirm: "DELETE" },
              })
              await clearLocalPrivateData()
              await supabase.auth.signOut()
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to delete account")
            } finally {
              setDeletingAccount(false)
            }
          },
        },
      ],
    )
  }

  if (loading) return <LoadingState />

  return (
    <Screen>
      <View className="px-5 pt-6 pb-8">
        <Text className="text-2xl font-bold text-warm-black mb-6">Settings</Text>

        {error && <ErrorBanner message={error} />}

        {/* Account */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Account
        </Text>
        <Card className="mb-6">
          <Text className="text-sm text-warm-black">{email}</Text>
          <TouchableOpacity onPress={handleSignOut} className="mt-4">
            <Text className="text-sm font-semibold text-red-500">Sign out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            className="mt-4 min-h-11 justify-center"
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            accessibilityHint="Permanently deletes your Roots account and private CRM data"
          >
            <Text className="text-sm font-semibold text-red-700">
              {deletingAccount ? "Deleting account..." : "Delete account"}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Notifications */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Notifications
        </Text>
        <Card className="mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-medium text-warm-black">Weekly email digest</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Get a weekly summary of who to reach out to
              </Text>
            </View>
            <Switch
              value={settings?.email_reminders_enabled ?? false}
              onValueChange={toggleEmailReminders}
              disabled={toggling || !settings}
              trackColor={{ false: colors.border, true: colors.sage }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="border-t border-gray-100 my-4" />

          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-medium text-warm-black">Follow-up reminders</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Get privacy-safe push reminders when relationships need attention
              </Text>
            </View>
            <Switch
              value={settings?.push_followups_enabled ?? false}
              onValueChange={(value) => togglePushPreference("push_followups_enabled", value)}
              disabled={pushWorking || !settings}
              trackColor={{ false: colors.border, true: colors.sage }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="border-t border-gray-100 my-4" />

          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-medium text-warm-black">Birthday reminders</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Use minimal notification text and load private details after opening Roots
              </Text>
            </View>
            <Switch
              value={settings?.push_birthdays_enabled ?? false}
              onValueChange={(value) => togglePushPreference("push_birthdays_enabled", value)}
              disabled={pushWorking || !settings}
              trackColor={{ false: colors.border, true: colors.sage }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* About */}
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          About
        </Text>
        <Card>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://tryrootsapp.com/privacy")}
            className="py-1"
          >
            <Text className="text-sm font-medium text-warm-black">Privacy Policy</Text>
          </TouchableOpacity>

          <View className="border-t border-gray-100 my-3" />

          <TouchableOpacity
            onPress={() => Linking.openURL("https://tryrootsapp.com/terms")}
            className="py-1"
          >
            <Text className="text-sm font-medium text-warm-black">Terms of Service</Text>
          </TouchableOpacity>

          <View className="border-t border-gray-100 my-3" />

          <TouchableOpacity
            onPress={() => Linking.openURL("https://tryrootsapp.com/contact")}
            className="py-1"
          >
            <Text className="text-sm font-medium text-warm-black">Support</Text>
          </TouchableOpacity>

          <View className="border-t border-gray-100 my-3" />

          <Text className="text-xs text-gray-400">Version 1.0.0</Text>
        </Card>
      </View>
    </Screen>
  )
}
