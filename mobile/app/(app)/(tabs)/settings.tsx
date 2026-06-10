import { useEffect, useState } from "react"
import { Alert, Linking, Share, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system/legacy"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { BrandHeader, Divider, IconTile, SoftCard } from "@/components/RootsUI"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { clearLocalPrivateData } from "@/lib/private-data"
import { registerPushToken, revokePushToken } from "@/lib/push-notifications"
import { callTrustedApi } from "@/lib/trusted-api"
import { colors, fonts } from "@/constants/theme"
import type { Settings } from "@/types"

type Status = { ok: boolean; message: string } | null
type ExpandedPanel = "profile" | "email" | "password" | null

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [expanded, setExpanded] = useState<ExpandedPanel>(null)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [settings, setSettings] = useState<Settings | null>(null)
  const [toggling, setToggling] = useState(false)
  const [dataWorking, setDataWorking] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

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
          .maybeSingle()
        if (data) {
          setSettings(data)
        } else {
          const { data: created, error: createError } = await supabase
            .from("settings")
            .upsert({ user_id: session.user.id }, { onConflict: "user_id" })
            .select("*")
            .single()
          if (createError) throw createError
          setSettings(created)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load settings.")
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
    Alert.alert("Log out", "Sign out of your Roots account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
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
      setExpanded(null)
      setOk("Profile updated.")
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Failed to update profile.")
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
      setExpanded(null)
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
      setExpanded(null)
      setOk("Password updated.")
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Failed to update password.")
    } finally {
      setSavingPassword(false)
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

  async function toggleEmailDigest() {
    if (!settings) return
    setToggling(true)
    try {
      await updateSettingsPatch({ email_reminders_enabled: !settings.email_reminders_enabled })
      setOk("Email digest settings updated.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update email digest.")
    } finally {
      setToggling(false)
    }
  }

  async function togglePushNotifications() {
    if (!settings) return
    setToggling(true)
    try {
      const currentlyOn =
        settings.push_followups_enabled ||
        settings.push_birthdays_enabled ||
        settings.push_important_moments_enabled
      if (currentlyOn) {
        await revokePushToken()
      } else {
        await registerPushToken()
      }
      await updateSettingsPatch({
        push_followups_enabled: !currentlyOn,
        push_birthdays_enabled: !currentlyOn,
        push_important_moments_enabled: !currentlyOn,
      })
      setOk("Push notification settings updated.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update push notifications.")
    } finally {
      setToggling(false)
    }
  }

  async function exportData() {
    setDataWorking(true)
    setStatus(null)
    try {
      const payload = await callTrustedApi("/api/export", { method: "GET" })
      await Share.share({
        title: "Roots export",
        message: JSON.stringify(payload, null, 2),
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
              setError(e instanceof Error ? e.message : "Failed to delete account.")
            } finally {
              setDeletingAccount(false)
            }
          },
        },
      ],
    )
  }

  if (loading) return <LoadingState />

  const pushOn = Boolean(
    settings?.push_followups_enabled ||
      settings?.push_birthdays_enabled ||
      settings?.push_important_moments_enabled,
  )
  const emailDigestOn = Boolean(settings?.email_reminders_enabled)

  return (
    <Screen>
      <BrandHeader
        title="Settings"
        subtitle="Manage your account and preferences."
        actionIcon="person-outline"
        actionLabel="Profile settings"
        onAction={() => setExpanded((current) => current === "profile" ? null : "profile")}
      />

      <View className="px-5 pb-8">
        {error ? <ErrorBanner message={error} /> : null}
        {status ? (
          <Text
            style={{ fontFamily: fonts.medium }}
            className={`mb-4 rounded-xl px-3 py-2 text-sm ${
              status.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {status.message}
          </Text>
        ) : null}

        <SettingsSection title="Account" subtitle="Manage your profile and security.">
          <SettingsRow
            icon="person-outline"
            title="Profile"
            description="View and edit your profile information"
            onPress={() => setExpanded((current) => current === "profile" ? null : "profile")}
          />
          {expanded === "profile" ? (
            <InlineForm>
              <TextField
                label="Display name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                autoCapitalize="words"
              />
              <Button title="Save profile" onPress={saveDisplayName} loading={savingProfile} />
            </InlineForm>
          ) : null}
          <Divider />
          <SettingsRow
            icon="mail-outline"
            title="Email"
            description={email || "Update your email address"}
            onPress={() => setExpanded((current) => current === "email" ? null : "email")}
          />
          {expanded === "email" ? (
            <InlineForm>
              <TextField
                label="New email"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="new@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button title="Update email" onPress={saveEmail} loading={savingEmail} />
            </InlineForm>
          ) : null}
          <Divider />
          <SettingsRow
            icon="lock-closed-outline"
            title="Password"
            description="Change your password"
            onPress={() => setExpanded((current) => current === "password" ? null : "password")}
          />
          {expanded === "password" ? (
            <InlineForm>
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
            </InlineForm>
          ) : null}
          <Divider />
          <SettingsRow
            icon="log-out-outline"
            title="Log out"
            description="Sign out of your account"
            onPress={handleSignOut}
          />
        </SettingsSection>

        <SettingsSection title="Notifications" subtitle="Choose how you stay up to date.">
          <SettingsRow
            icon="notifications-outline"
            title="Push notifications"
            description="Follow-ups, birthdays, and important moments"
            value={pushOn ? "On" : "Off"}
            disabled={toggling || !settings}
            onPress={togglePushNotifications}
          />
          <Divider />
          <SettingsRow
            icon="mail-outline"
            title="Email digest"
            description="Weekly relationship summary"
            value={emailDigestOn ? "On" : "Off"}
            disabled={toggling || !settings}
            onPress={toggleEmailDigest}
          />
        </SettingsSection>

        <SettingsSection title="Invite a Friend" subtitle="Share Roots with someone who would use it.">
          <SettingsRow
            icon="share-outline"
            title="Invite a friend"
            description="Send the current Roots website link"
            onPress={() =>
              Share.share({
                message:
                  "Hey! I've been using Roots to stay close to the people who matter most to me. Thought you might like it — check it out at useroots.app",
              }).catch(() => null)
            }
          />
        </SettingsSection>

        <SettingsSection title="Data" subtitle="Import, export, and manage your data.">
          <SettingsRow
            icon="cloud-download-outline"
            title="Export data"
            description="Download a copy of your data"
            disabled={dataWorking}
            onPress={exportData}
          />
          <Divider />
          <SettingsRow
            icon="cloud-upload-outline"
            title="Import data"
            description="Import or update from a file"
            disabled={dataWorking}
            onPress={importData}
          />
          <Divider />
          <SettingsRow
            icon="refresh-outline"
            title="Restore / Replace"
            description="Replace all your data with a backup"
            disabled={dataWorking}
            onPress={restoreData}
          />
        </SettingsSection>

        <SettingsSection title="Tags" subtitle="Organize your people with tags.">
          <SettingsRow
            icon="pricetag-outline"
            title="Manage tags"
            description="Create, edit, and organize your tags"
            onPress={() => Alert.alert("Manage tags", "Tag management is available from people profile flows today.")}
          />
        </SettingsSection>

        <SettingsSection title="Legal & Support" subtitle="Resources and important information.">
          <SettingsRow
            icon="help-circle-outline"
            title="Help & Support"
            description="Get help or contact us"
            onPress={() => Linking.openURL("https://useroots.app/contact").catch(() => null)}
          />
          <Divider />
          <SettingsRow
            icon="document-text-outline"
            title="Privacy Policy"
            onPress={() => Linking.openURL("https://useroots.app/privacy").catch(() => null)}
          />
          <Divider />
          <SettingsRow
            icon="document-text-outline"
            title="Terms of Service"
            onPress={() => Linking.openURL("https://useroots.app/terms").catch(() => null)}
          />
          <View className="mt-3 rounded-xl bg-red-50">
            <SettingsRow
              icon="trash-outline"
              title={deletingAccount ? "Deleting account..." : "Delete account"}
              description="Permanently delete your account and all data"
              danger
              disabled={deletingAccount}
              onPress={handleDeleteAccount}
            />
          </View>
        </SettingsSection>
      </View>
    </Screen>
  )
}

function SettingsSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <SoftCard className="mb-4 p-4">
      <Text style={{ fontFamily: fonts.bold, color: colors.forest }} className="text-lg">
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="mt-1 text-sm">
        {subtitle}
      </Text>
      <View className="mt-3">{children}</View>
    </SoftCard>
  )
}

function SettingsRow({
  icon,
  title,
  description,
  value,
  danger,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description?: string
  value?: string
  danger?: boolean
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.74}
      className={`min-h-16 flex-row items-center py-2 ${disabled ? "opacity-50" : ""}`}
    >
      <IconTile
        icon={icon}
        size={44}
        color={danger ? colors.danger : colors.forest}
        background={danger ? "#FDECE8" : colors.mint}
      />
      <View className="ml-4 flex-1">
        <Text
          style={{ fontFamily: fonts.bold, color: danger ? colors.danger : colors.ink }}
          className="text-base"
        >
          {title}
        </Text>
        {description ? (
          <Text style={{ fontFamily: fonts.body, color: danger ? "#7A271A" : colors.muted }} className="mt-1 text-sm">
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="mr-2 text-base">
          {value}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </TouchableOpacity>
  )
}

function InlineForm({ children }: { children: React.ReactNode }) {
  return <View className="mb-3 rounded-2xl bg-stone-50 p-3">{children}</View>
}
