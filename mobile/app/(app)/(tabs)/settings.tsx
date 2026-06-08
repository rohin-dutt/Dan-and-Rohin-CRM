import { useEffect, useState } from "react"
import { Alert, Linking, Share, Switch, Text, TouchableOpacity, View } from "react-native"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system/legacy"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { clearLocalPrivateData } from "@/lib/private-data"
import { registerPushToken, revokePushToken } from "@/lib/push-notifications"
import { callTrustedApi } from "@/lib/trusted-api"
import { colors } from "@/constants/theme"
import type { Settings } from "@/types"

type Status = { ok: boolean; message: string } | null

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [settings, setSettings] = useState<Settings | null>(null)
  const [toggling, setToggling] = useState(false)
  const [pushWorking, setPushWorking] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [dataWorking, setDataWorking] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return
        setEmail(session.user.email ?? "")
        setDisplayName(
          typeof session.user.user_metadata?.full_name === "string"
            ? session.user.user_metadata.full_name
            : typeof session.user.user_metadata?.name === "string"
              ? session.user.user_metadata.name
              : typeof session.user.user_metadata?.display_name === "string"
                ? session.user.user_metadata.display_name
                : "",
        )

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

  function setOk(message: string) {
    setStatus({ ok: true, message })
    setError(null)
  }

  function setFailure(message: string) {
    setStatus({ ok: false, message })
  }

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

  async function saveDisplayName() {
    setSavingProfile(true)
    setStatus(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim() || null },
      })
      if (updateError) throw updateError
      setOk("Display name updated.")
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Failed to update display name.")
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveEmail() {
    if (!newEmail.trim()) {
      setFailure("Enter a new email address.")
      return
    }
    setSavingEmail(true)
    setStatus(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (updateError) throw updateError
      setNewEmail("")
      setOk("Confirmation sent. Check your inbox.")
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Failed to update email.")
    } finally {
      setSavingEmail(false)
    }
  }

  async function savePassword() {
    if (newPassword.length < 8) {
      setFailure("Password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setFailure("Passwords do not match.")
      return
    }
    setSavingPassword(true)
    setStatus(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setNewPassword("")
      setConfirmPassword("")
      setOk("Password updated.")
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Failed to update password.")
    } finally {
      setSavingPassword(false)
    }
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
      setOk("Reminder settings updated.")
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
      } else if (!settings[field === "push_followups_enabled" ? "push_birthdays_enabled" : "push_followups_enabled"]) {
        await revokePushToken()
      }

      await updateSettingsPatch({ [field]: value } as Partial<Settings>)
      setOk("Notification settings updated.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update notification settings")
    } finally {
      setPushWorking(false)
    }
  }

  async function exportData() {
    setDataWorking(true)
    setStatus(null)
    try {
      const payload = await callTrustedApi("/api/export", { method: "GET" })
      const text = JSON.stringify(payload, null, 2)
      await Share.share({
        title: "Roots export",
        message: text,
      })
      setOk("Export generated.")
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Failed to export data.")
    } finally {
      setDataWorking(false)
    }
  }

  async function pickJsonPayload() {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    })
    if (result.canceled) return null
    const asset = result.assets[0]
    if (!asset?.uri) return null
    const text = await FileSystem.readAsStringAsync(asset.uri)
    return JSON.parse(text) as unknown
  }

  async function importData() {
    setDataWorking(true)
    setStatus(null)
    try {
      const payload = await pickJsonPayload()
      if (!payload) return
      await callTrustedApi("/api/import/restore", {
        body: { payload, replace_existing: false },
      })
      setOk("Import complete.")
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Failed to import data.")
    } finally {
      setDataWorking(false)
    }
  }

  async function restoreData() {
    Alert.alert(
      "Restore and replace?",
      "This replaces your current Roots data with the selected export file.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Choose file",
          style: "destructive",
          onPress: async () => {
            setDataWorking(true)
            setStatus(null)
            try {
              const payload = await pickJsonPayload()
              if (!payload) return
              await callTrustedApi("/api/import/restore", {
                body: { payload, replace_existing: true },
              })
              setOk("Restore complete.")
            } catch (e) {
              setFailure(e instanceof Error ? e.message : "Failed to restore data.")
            } finally {
              setDataWorking(false)
            }
          },
        },
      ],
    )
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
        {status && (
          <Text className={`mb-4 rounded-xl px-3 py-2 text-sm ${status.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {status.message}
          </Text>
        )}

        <SectionTitle title="Account" />
        <Card className="mb-6">
          <Text className="text-xs text-gray-500">Signed in as</Text>
          <Text className="mt-1 text-sm font-semibold text-warm-black">{email}</Text>
          <View className="mt-4">
            <TextField
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              autoCapitalize="words"
            />
            <Button title="Save display name" onPress={saveDisplayName} loading={savingProfile} />
          </View>
          <TouchableOpacity onPress={handleSignOut} className="mt-4 min-h-11 justify-center">
            <Text className="text-sm font-semibold text-red-500">Sign out</Text>
          </TouchableOpacity>
        </Card>

        <SectionTitle title="Email and Password" />
        <Card className="mb-6">
          <TextField
            label="New email"
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="new@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button title="Update email" onPress={saveEmail} loading={savingEmail} />

          <View className="my-5 border-t border-gray-100" />

          <TextField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 characters"
            secureTextEntry
          />
          <TextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            secureTextEntry
          />
          <Button title="Update password" onPress={savePassword} loading={savingPassword} />
        </Card>

        <SectionTitle title="Notifications" />
        <Card className="mb-6">
          <SettingSwitch
            title="Weekly email digest"
            description="A weekly summary of people to reach out to and upcoming birthdays."
            value={settings?.email_reminders_enabled ?? false}
            onValueChange={toggleEmailReminders}
            disabled={toggling || !settings}
          />

          <Divider />

          <SettingSwitch
            title="Follow-up reminders"
            description="Privacy-safe push reminders when someone needs attention."
            value={settings?.push_followups_enabled ?? false}
            onValueChange={(value) => togglePushPreference("push_followups_enabled", value)}
            disabled={pushWorking || !settings}
          />

          <Divider />

          <SettingSwitch
            title="Birthday reminders"
            description="Minimal notification text; private details load only after opening Roots."
            value={settings?.push_birthdays_enabled ?? false}
            onValueChange={(value) => togglePushPreference("push_birthdays_enabled", value)}
            disabled={pushWorking || !settings}
          />
        </Card>

        <SectionTitle title="Data" />
        <Card className="mb-6">
          <Text className="text-sm text-gray-600 mb-4">
            Export your Roots data, import an export file, or restore from a saved backup.
          </Text>
          <Button title="Export data" onPress={exportData} loading={dataWorking} variant="secondary" />
          <View className="h-3" />
          <Button title="Import / update from file" onPress={importData} loading={dataWorking} variant="secondary" />
          <View className="h-3" />
          <TouchableOpacity
            onPress={restoreData}
            disabled={dataWorking}
            className={`min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 ${dataWorking ? "opacity-50" : ""}`}
            accessibilityRole="button"
            accessibilityLabel="Restore and replace from file"
          >
            <Text className="text-sm font-semibold text-red-700">Restore and replace</Text>
          </TouchableOpacity>
        </Card>

        <SectionTitle title="Billing" />
        <Card className="mb-6">
          <Text className="text-sm font-semibold text-warm-black">Roots beta</Text>
          <Text className="mt-1 text-sm text-gray-500">
            Billing is not active in mobile v1. Roots is free during beta, and no credit card is required.
          </Text>
        </Card>

        <SectionTitle title="Legal and Support" />
        <Card className="mb-6">
          <LinkRow label="Privacy Policy" url="https://useroots.app/privacy" />
          <Divider />
          <LinkRow label="Terms of Service" url="https://useroots.app/terms" />
          <Divider />
          <LinkRow label="Support" url="https://useroots.app/contact" />
          <Divider />
          <Text className="text-xs text-gray-400">Version 1.0.0</Text>
        </Card>

        <SectionTitle title="Delete Account" />
        <Card>
          <Text className="text-sm text-gray-600">
            Permanently delete your account and private CRM data.
          </Text>
          <TouchableOpacity
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            className="mt-4 min-h-11 justify-center rounded-xl border border-red-200 bg-red-50 px-4"
            accessibilityRole="button"
            accessibilityLabel="Delete account"
            accessibilityHint="Permanently deletes your Roots account and private CRM data"
          >
            <Text className="text-sm font-semibold text-red-700">
              {deletingAccount ? "Deleting account..." : "Delete account"}
            </Text>
          </TouchableOpacity>
        </Card>
      </View>
    </Screen>
  )
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
      {title}
    </Text>
  )
}

function Divider() {
  return <View className="border-t border-gray-100 my-4" />
}

function SettingSwitch({
  title,
  description,
  value,
  onValueChange,
  disabled,
}: {
  title: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 mr-4">
        <Text className="text-sm font-medium text-warm-black">{title}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.sage }}
        thumbColor="#FFFFFF"
      />
    </View>
  )
}

function LinkRow({ label, url }: { label: string; url: string }) {
  return (
    <TouchableOpacity onPress={() => Linking.openURL(url)} className="py-1">
      <Text className="text-sm font-medium text-warm-black">{label}</Text>
    </TouchableOpacity>
  )
}
