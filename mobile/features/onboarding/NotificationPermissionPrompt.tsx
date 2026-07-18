import { useEffect, useRef, useState } from "react"
import { Modal, Platform, Pressable, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { SoftCard } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"
import {
  markOnboardingNotificationPromptHandled,
  shouldShowOnboardingNotificationPrompt,
} from "@/lib/onboarding-notifications"
import { registerPushToken, revokePushToken } from "@/lib/push-notifications"
import { supabase } from "@/lib/supabase"

type NotificationPermissionPromptProps = {
  userId: string
  visible: boolean
  onFinished: () => void | Promise<void>
}

const PUSH_PREFERENCES = {
  push_followups_enabled: true,
  push_birthdays_enabled: true,
  push_important_moments_enabled: true,
}

const PUSH_PREFERENCES_OFF = {
  push_followups_enabled: false,
  push_birthdays_enabled: false,
  push_important_moments_enabled: false,
}

async function savePushPreferences(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from("settings")
    .upsert(
      {
        user_id: userId,
        ...(enabled ? PUSH_PREFERENCES : PUSH_PREFERENCES_OFF),
      },
      { onConflict: "user_id" },
    )

  if (error) throw error
}

export function NotificationPermissionPrompt({
  userId,
  visible,
  onFinished,
}: NotificationPermissionPromptProps) {
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [enabling, setEnabling] = useState(false)
  const [permissionDeclined, setPermissionDeclined] = useState(false)
  const resolvedRef = useRef(false)

  useEffect(() => {
    if (!visible || resolvedRef.current) return

    let cancelled = false
    async function checkEligibility() {
      const shouldShow =
        Platform.OS === "ios" &&
        (await shouldShowOnboardingNotificationPrompt(userId).catch(() => false))

      if (cancelled) return
      setEligible(shouldShow)
      if (!shouldShow) {
        resolvedRef.current = true
        await onFinished()
      }
    }

    void checkEligibility()
    return () => {
      cancelled = true
    }
  }, [onFinished, userId, visible])

  async function finishPrompt() {
    if (resolvedRef.current) return
    resolvedRef.current = true
    setEligible(false)
    await onFinished()
  }

  async function handleNotNow() {
    if (enabling) return
    await markOnboardingNotificationPromptHandled(userId).catch(() => null)
    void savePushPreferences(userId, false).catch(() => null)
    await finishPrompt()
  }

  async function handleEnable() {
    if (enabling) return
    setEnabling(true)

    try {
      await registerPushToken()
      await savePushPreferences(userId, true)
      await markOnboardingNotificationPromptHandled(userId).catch(() => null)
      await finishPrompt()
    } catch {
      await revokePushToken().catch(() => null)
      await savePushPreferences(userId, false).catch(() => null)
      await markOnboardingNotificationPromptHandled(userId).catch(() => null)
      setPermissionDeclined(true)
      setEnabling(false)
    }
  }

  if (!visible || eligible !== true) return null

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={permissionDeclined ? finishPrompt : handleNotNow}
    >
      <Pressable
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(15, 74, 36, 0.42)",
        }}
        onPress={permissionDeclined ? finishPrompt : handleNotNow}
      >
        <Pressable onPress={() => {}} style={{ width: "100%" }}>
          <SoftCard
            style={{
              margin: 28,
              borderRadius: 24,
              padding: 24,
              backgroundColor: colors.ivory,
            }}
          >
            <View className="items-center">
              <View
                className="h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.mint }}
              >
                <Ionicons name="notifications-outline" size={28} color={colors.forest} />
              </View>
              <Text
                style={{ fontFamily: fonts.heading, color: colors.forest }}
                className="mt-4 text-center text-[28px] leading-8"
              >
                Let Roots remember for you
              </Text>
              <Text
                style={{ fontFamily: fonts.body, color: colors.muted }}
                className="mt-3 text-center text-[15px] leading-5"
              >
                Get gentle reminders for follow-ups, birthdays, and important moments.
              </Text>
              <View
                className="mt-4 flex-row items-center rounded-xl px-3 py-2.5"
                style={{ backgroundColor: colors.cream }}
              >
                <Ionicons name="lock-closed-outline" size={15} color={colors.sage} />
                <Text
                  style={{ fontFamily: fonts.body, color: colors.muted }}
                  className="ml-2 flex-1 text-xs leading-4"
                >
                  Notifications stay private—no names or personal notes appear on your lock screen.
                </Text>
              </View>
            </View>

            {permissionDeclined ? (
              <>
                <Text
                  style={{ fontFamily: fonts.medium, color: colors.muted }}
                  className="mt-5 text-center text-sm leading-5"
                >
                  Notifications are off. You can turn them on later from Settings.
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Continue"
                  onPress={finishPrompt}
                  className="mt-4 min-h-11 items-center justify-center rounded-xl bg-forest px-4"
                >
                  <Text style={{ fontFamily: fonts.semibold }} className="text-sm text-white">
                    Continue
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View className="mt-6 gap-2.5">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Turn on reminders"
                  disabled={enabling}
                  onPress={handleEnable}
                  className={`min-h-11 items-center justify-center rounded-xl bg-forest px-4 ${
                    enabling ? "opacity-60" : ""
                  }`}
                >
                  <Text style={{ fontFamily: fonts.semibold }} className="text-sm text-white">
                    {enabling ? "Turning on reminders…" : "Turn on reminders"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Not now"
                  disabled={enabling}
                  onPress={handleNotNow}
                  className="min-h-11 items-center justify-center px-4"
                >
                  <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="text-sm">
                    Not now
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </SoftCard>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
