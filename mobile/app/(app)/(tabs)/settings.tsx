import { useEffect, useState } from "react"
import { Linking, Share, Switch, Text, TouchableOpacity, View } from "react-native"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { ConfirmModal } from "@/components/ConfirmModal"
import { TextField } from "@/components/TextField"
import { Divider, IconTile } from "@/components/RootsUI"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { clearLocalPrivateData } from "@/lib/private-data"
import {
  getPushRegistrationStatus,
  registerPushToken,
  revokePushToken,
} from "@/lib/push-notifications"
import { displayNameFromMetadata } from "@/lib/user-metadata"
import { colors, fonts } from "@/constants/theme"
import { InlineForm, SettingsRow, SettingsSection } from "@/features/settings/components"
import { useDataManagement } from "@/features/settings/use-data-management"
import type { Settings } from "@/types"

type Status = { ok: boolean; message: string } | null
type ExpandedPanel = "profile" | "password" | null

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [expanded, setExpanded] = useState<ExpandedPanel>(null)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [settings, setSettings] = useState<Settings | null>(null)
  const [pushRegistered, setPushRegistered] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [togglingDigest, setTogglingDigest] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  function setOk(message: string) {
    setStatus({ ok: true, message })
    setError(null)
  }

  function setFailure(message: string) {
    setStatus({ ok: false, message })
  }

  const dataManagement = useDataManagement({ onSuccess: setOk, onFailure: setFailure })

  useEffect(() => {
    if (!status?.ok) return
    const timer = setTimeout(() => setStatus(null), 2000)
    return () => clearTimeout(timer)
  }, [status])

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return
        setEmail(session.user.email ?? "")
        setDisplayName(displayNameFromMetadata(session.user.user_metadata))

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
        setPushRegistered(await getPushRegistrationStatus().catch(() => false))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load settings.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleSignOut() {
    setShowLogoutConfirm(true)
  }

  async function performSignOut() {
    setShowLogoutConfirm(false)
    // Token revocation is best-effort; sign-out must not be blocked by it.
    await revokePushToken().catch(() => null)
    await clearLocalPrivateData()
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setFailure(signOutError.message)
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })
      if (signInError) {
        setFailure("Current password is incorrect")
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) throw updateError
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setExpanded(null)
      setOk("Password changed.")
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
    if (!settings || togglingDigest) return
    setTogglingDigest(true)
    try {
      await updateSettingsPatch({ email_reminders_enabled: !settings.email_reminders_enabled })
      setOk("Email digest preference saved.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update email digest.")
    } finally {
      setTogglingDigest(false)
    }
  }

  async function togglePushNotifications() {
    if (!settings || toggling) return
    setToggling(true)
    try {
      const pushPreferenceOn =
        settings.push_followups_enabled ||
        settings.push_birthdays_enabled ||
        settings.push_important_moments_enabled
      const currentlyOn = pushPreferenceOn && pushRegistered
      if (currentlyOn) {
        await revokePushToken()
        setPushRegistered(false)
      } else {
        await registerPushToken()
        setPushRegistered(true)
      }
      await updateSettingsPatch({
        push_followups_enabled: !currentlyOn,
        push_birthdays_enabled: !currentlyOn,
        push_important_moments_enabled: !currentlyOn,
      })
      setOk("Push notification preference saved.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update push notifications.")
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <LoadingState />

  const pushPreferenceOn = Boolean(
    settings?.push_followups_enabled ||
      settings?.push_birthdays_enabled ||
      settings?.push_important_moments_enabled,
  )
  const pushOn = pushPreferenceOn && pushRegistered

  return (
    <Screen>
      <View className="px-5 pt-4 pb-3">
        <Text
          style={{ fontFamily: fonts.heading, color: colors.forest }}
          className="text-[32px] leading-[38px]"
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          Settings
        </Text>
        <Text
          style={{ fontFamily: fonts.body, color: colors.ink }}
          className="mt-1 text-[15px] leading-5"
        >
          Manage your account and preferences.
        </Text>
      </View>

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
          <SettingsRow icon="mail-outline" title="Email" description={email || "No email on file"} />
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
                label="Current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Your current password"
                secureTextEntry
              />
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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Push notifications"
            disabled={toggling || !settings}
            onPress={togglePushNotifications}
            activeOpacity={0.74}
          >
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
              <IconTile icon="notifications-outline" size={44} color={colors.forest} background={colors.mint} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
                  Push notifications
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                  Push notifications help you stay in touch
                </Text>
              </View>
              <Switch
                value={pushOn}
                onValueChange={togglePushNotifications}
                disabled={toggling || !settings}
                trackColor={{ false: "#D1D5DB", true: colors.forest }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Weekly email digest"
            disabled={togglingDigest || !settings}
            onPress={toggleEmailDigest}
            activeOpacity={0.74}
          >
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
              <IconTile icon="mail-open-outline" size={44} color={colors.forest} background={colors.mint} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
                  Weekly email digest
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                  Get a weekly summary of your Roots activity and a preview of the week ahead
                </Text>
              </View>
              <Switch
                value={Boolean(settings?.email_reminders_enabled)}
                onValueChange={toggleEmailDigest}
                disabled={togglingDigest || !settings}
                trackColor={{ false: "#D1D5DB", true: colors.forest }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          </TouchableOpacity>
        </SettingsSection>

        <SettingsSection title="Invite a Friend" subtitle="Share Roots with someone who would use it.">
          <SettingsRow
            icon="share-outline"
            title="Invite a friend"
            onPress={() =>
              Share.share({
                message:
                  "Hey! I've been using Roots to stay close to the people who matter most to me. Thought you might like it — check it out at https://useroots.app",
              }).catch(() => null)
            }
          />
        </SettingsSection>

        <SettingsSection title="Your data" subtitle="Access and manage your Roots data.">
          <SettingsRow
            icon="download-outline"
            title="Export data"
            description="Download a copy of your data as JSON"
            disabled={dataManagement.dataWorking}
            onPress={dataManagement.exportData}
          />
        </SettingsSection>

        <SettingsSection title="Legal & Support" subtitle="Resources and important information.">
          <SettingsRow
            icon="help-circle-outline"
            title="Help & Support"
            description="Contact us"
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
              title={dataManagement.deletingAccount ? "Deleting account..." : "Delete account"}
              description="Permanently delete your account and all data"
              danger
              disabled={dataManagement.deletingAccount}
              onPress={dataManagement.deleteAccount}
            />
          </View>
        </SettingsSection>
      </View>

      <ConfirmModal
        visible={showLogoutConfirm}
        title="Log out?"
        message="Sign out of your Roots account?"
        confirmLabel="Log out"
        destructive={false}
        onConfirm={performSignOut}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </Screen>
  )
}
