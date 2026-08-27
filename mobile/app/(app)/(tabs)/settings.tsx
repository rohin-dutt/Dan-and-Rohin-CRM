import { useEffect, useRef, useState } from "react"
import { Linking, Share, Switch, Text, TextInput, View } from "react-native"
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
import { colors, fonts } from "@/constants/theme"
import { InlineForm, SettingsRow, SettingsSection } from "@/features/settings/components"
import { useDataManagement } from "@/features/settings/use-data-management"
import { useCrmData } from "@/features/crm-data/CrmDataProvider"
import type { Settings } from "@/types"

type Status = { ok: boolean; message: string } | null
type ExpandedPanel = "profile" | "password" | null

export default function SettingsScreen() {
  const { snapshot, loading, refreshError, updateSnapshot } = useCrmData()
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
  const [debugPushError, setDebugPushError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const newPasswordInputRef = useRef<TextInput>(null)
  const confirmPasswordInputRef = useRef<TextInput>(null)
  const userIdRef = useRef<string | null>(null)
  const initializedProfileUserIdRef = useRef<string | null>(null)
  const settingsRef = useRef<Settings | null>(null)
  const persistedDigestRef = useRef(false)
  const digestDesiredRef = useRef<boolean | null>(null)
  const digestSaveInFlightRef = useRef(false)
  const persistedPushOnRef = useRef(false)
  const pushDesiredRef = useRef<boolean | null>(null)
  const pushSaveInFlightRef = useRef(false)
  const pushRegisteredRef = useRef(false)

  function setOk(message: string) {
    setStatus({ ok: true, message })
    setError(null)
  }

  function setFailure(message: string) {
    setStatus({ ok: false, message })
  }

  const dataManagement = useDataManagement({ onSuccess: setOk, onFailure: setFailure })

  function applySettings(nextSettings: Settings) {
    settingsRef.current = nextSettings
    setSettings(nextSettings)
  }

  useEffect(() => {
    if (!status?.ok) return
    const timer = setTimeout(() => setStatus(null), 2000)
    return () => clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!snapshot) return
    if (initializedProfileUserIdRef.current === snapshot.userId) return
    initializedProfileUserIdRef.current = snapshot.userId
    userIdRef.current = snapshot.userId
    setEmail(snapshot.profile.email)
    setDisplayName(snapshot.profile.displayName)
  }, [snapshot])

  useEffect(() => {
    const loadedSettings = snapshot?.settings
    if (!loadedSettings) return
    if (!digestSaveInFlightRef.current && !pushSaveInFlightRef.current) {
      settingsRef.current = loadedSettings
      setSettings(loadedSettings)
      persistedDigestRef.current = loadedSettings.email_reminders_enabled
    }

    let cancelled = false
    void getPushRegistrationStatus()
      .catch(() => false)
      .then((registered) => {
        if (cancelled) return
        const pushPreferenceOn = Boolean(
          loadedSettings.push_followups_enabled ||
            loadedSettings.push_birthdays_enabled ||
            loadedSettings.push_important_moments_enabled,
        )
        setPushRegistered(registered)
        pushRegisteredRef.current = registered
        persistedPushOnRef.current = pushPreferenceOn && registered
      })

    return () => {
      cancelled = true
    }
  }, [snapshot?.settings])

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
    const previousName = displayName
    const trimmedName = displayName.trim()
    setSavingProfile(true)
    // Optimistically show the edit as saved right away; revert if it fails.
    setDisplayName(trimmedName)
    setExpanded(null)
    setOk("Profile saved.")
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: trimmedName || null },
      })
      if (updateError) throw updateError
      updateSnapshot((current) => ({
        ...current,
        profile: {
          ...current.profile,
          displayName: trimmedName,
          firstName: trimmedName.split(/\s+/)[0] || "there",
        },
      }))
    } catch (e) {
      setDisplayName(previousName)
      setExpanded("profile")
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

  async function commitSettingsPatch(patch: Partial<Settings>) {
    const userId = userIdRef.current
    if (!userId) throw new Error("Not authenticated")

    const { error: err } = await supabase
      .from("settings")
      .update(patch)
      .eq("user_id", userId)
    if (err) throw err
    updateSnapshot((current) => ({
      ...current,
      settings: current.settings ? { ...current.settings, ...patch } : current.settings,
    }))
  }

  async function flushEmailDigestChanges() {
    if (digestSaveInFlightRef.current) return
    digestSaveInFlightRef.current = true

    try {
      while (digestDesiredRef.current !== null) {
        const nextEnabled = digestDesiredRef.current
        digestDesiredRef.current = null
        if (nextEnabled === persistedDigestRef.current) continue
        await commitSettingsPatch({ email_reminders_enabled: nextEnabled })
        persistedDigestRef.current = nextEnabled
      }
      setOk("Email digest preference saved.")
    } catch (e) {
      digestDesiredRef.current = null
      const currentSettings = settingsRef.current
      if (currentSettings) {
        applySettings({
          ...currentSettings,
          email_reminders_enabled: persistedDigestRef.current,
        })
      }
      setFailure(e instanceof Error ? e.message : "Failed to update email digest.")
    } finally {
      digestSaveInFlightRef.current = false
      if (digestDesiredRef.current !== null) void flushEmailDigestChanges()
    }
  }

  function toggleEmailDigest() {
    const currentSettings = settingsRef.current
    if (!currentSettings) return

    const nextEnabled = !currentSettings.email_reminders_enabled
    applySettings({ ...currentSettings, email_reminders_enabled: nextEnabled })
    digestDesiredRef.current = nextEnabled
    setError(null)
    void flushEmailDigestChanges()
  }

  async function flushPushNotificationChanges() {
    if (pushSaveInFlightRef.current) return
    pushSaveInFlightRef.current = true

    try {
      while (pushDesiredRef.current !== null) {
        const nextEnabled = pushDesiredRef.current
        pushDesiredRef.current = null
        if (nextEnabled === persistedPushOnRef.current) continue
        const patch = {
          push_followups_enabled: nextEnabled,
          push_birthdays_enabled: nextEnabled,
          push_important_moments_enabled: nextEnabled,
        }

        if (nextEnabled) {
          try {
            await registerPushToken()
            setDebugPushError("SUCCESS: token registered")
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            console.error("[PUSH TOKEN REGISTRATION FAILED]", message)
            setDebugPushError(message)
            /* token registration failed, continue anyway */
          }
        } else {
          try {
            await revokePushToken()
          } catch {
            /* token revocation failed, continue anyway */
          }
        }

        await commitSettingsPatch(patch)
        persistedPushOnRef.current = nextEnabled
      }
      setOk("Push notification preference saved.")
    } catch (e) {
      pushDesiredRef.current = null
      const currentSettings = settingsRef.current
      const persistedEnabled = persistedPushOnRef.current
      if (currentSettings) {
        applySettings({
          ...currentSettings,
          push_followups_enabled: persistedEnabled,
          push_birthdays_enabled: persistedEnabled,
          push_important_moments_enabled: persistedEnabled,
        })
      }
      setPushRegistered(persistedEnabled)
      pushRegisteredRef.current = persistedEnabled
      setFailure(e instanceof Error ? e.message : "Failed to update push notifications.")
    } finally {
      pushSaveInFlightRef.current = false
      if (pushDesiredRef.current !== null) void flushPushNotificationChanges()
    }
  }

  function togglePushNotifications() {
    const currentSettings = settingsRef.current
    if (!currentSettings) return

    const pushPreferenceOn = Boolean(
      currentSettings.push_followups_enabled ||
        currentSettings.push_birthdays_enabled ||
        currentSettings.push_important_moments_enabled,
    )
    const nextEnabled = !(pushPreferenceOn && pushRegisteredRef.current)
    const nextSettings = {
      ...currentSettings,
      push_followups_enabled: nextEnabled,
      push_birthdays_enabled: nextEnabled,
      push_important_moments_enabled: nextEnabled,
    }

    applySettings(nextSettings)
    setPushRegistered(nextEnabled)
    pushRegisteredRef.current = nextEnabled
    pushDesiredRef.current = nextEnabled
    setError(null)
    void flushPushNotificationChanges()
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
        {error || refreshError ? <ErrorBanner message={error ?? refreshError ?? ""} /> : null}
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

        {debugPushError ? (
          <View style={{ backgroundColor: '#000', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: '#0f0', fontSize: 11, fontFamily: 'monospace' }}>{debugPushError}</Text>
          </View>
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
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => newPasswordInputRef.current?.focus()}
              />
              <TextField
                ref={newPasswordInputRef}
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                secureTextEntry
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              />
              <TextField
                ref={confirmPasswordInputRef}
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
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
          <View>
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
                accessibilityLabel="Push notifications"
                value={pushOn}
                disabled={!settings}
                onValueChange={togglePushNotifications}
                trackColor={{ false: "#D1D5DB", true: colors.forest }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          </View>
          <Divider />
          <View>
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
                accessibilityLabel="Weekly email digest"
                value={Boolean(settings?.email_reminders_enabled)}
                disabled={!settings}
                onValueChange={toggleEmailDigest}
                trackColor={{ false: "#D1D5DB", true: colors.forest }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="Invite" subtitle="Share Roots with someone who would use it.">
          <SettingsRow
            icon="share-outline"
            title="Invite someone you know to Roots"
            onPress={() =>
              Share.share({
                message:
                  "Hey! I've been using Roots to stay close to the people who matter most to me. Thought you might like it — check it out at https://useroots.app",
              }).catch(() => null)
            }
          />
        </SettingsSection>

        <SettingsSection title="Your Data" subtitle="Access and manage your Roots data.">
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
