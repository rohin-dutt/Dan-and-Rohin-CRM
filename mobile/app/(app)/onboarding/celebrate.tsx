import { useCallback, useEffect, useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { QuickAddFormSheet } from "@/features/quick-add/QuickAddFormSheet"
import { NotificationPermissionPrompt } from "@/features/onboarding/NotificationPermissionPrompt"
import { markOnboardingComplete } from "@/lib/onboarding-status"
import { supabase } from "@/lib/supabase"
import { colors, fonts } from "@/constants/theme"

export default function OnboardingCelebrateScreen() {
  const router = useRouter()
  const { count, skipped } = useLocalSearchParams<{
    count?: string
    skipped?: string
  }>()
  const [userId, setUserId] = useState<string | null>(null)
  const [onboardingReady, setOnboardingReady] = useState(false)
  const [showLogChat, setShowLogChat] = useState(false)

  const savedCount = Number(count) || 0
  const skippedPeople = skipped === "true"
  const peopleLine =
    savedCount === 1
      ? "You've added 1 person to Roots."
      : savedCount > 1
        ? `You've added ${savedCount} people to Roots.`
        : "Your account is ready whenever you are."

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/(auth)/login")
        return
      }
      setUserId(user.id)
    })
  }, [router])

  const finishOnboarding = useCallback(async () => {
    if (!userId) return
    await markOnboardingComplete(userId)
    setOnboardingReady(true)
  }, [userId])

  return (
    <Screen scrollable={false}>
      <View
        className="flex-1 items-center justify-center px-6 py-12"
        style={{ backgroundColor: colors.cream }}
      >
        <Text
          style={{ fontFamily: fonts.heading, color: colors.forest }}
          className="text-center text-[32px] leading-[38px]"
        >
          {skippedPeople ? "You're all set" : "Your Roots are planted 🌱"}
        </Text>
        <Text
          style={{ fontFamily: fonts.body, color: colors.muted }}
          className="mt-4 text-center text-[15px] leading-5"
        >
          {skippedPeople
            ? `${peopleLine} Add someone when you're ready, and Roots will help you stay close.`
            : `${peopleLine} Now log your first chat—it takes 10 seconds and helps Roots know where to start.`}
        </Text>

        {skippedPeople ? (
          <View className="mt-8 w-full">
            <Button
              title="Go to Roots"
              disabled={!onboardingReady}
              onPress={() => router.replace("/(app)/(tabs)/dashboard")}
            />
          </View>
        ) : (
          <>
            <View className="mt-8 w-full">
              <Button
                title="Log a chat"
                disabled={!onboardingReady}
                onPress={() => setShowLogChat(true)}
              />
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go to Roots"
              disabled={!onboardingReady}
              onPress={() => router.replace("/(app)/(tabs)/dashboard")}
              className={`mt-5 min-h-11 items-center justify-center ${
                onboardingReady ? "" : "opacity-50"
              }`}
            >
              <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="text-sm">
                Go to Roots
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <QuickAddFormSheet
        mode={showLogChat ? "chat" : null}
        onClose={() => {
          setShowLogChat(false)
          router.replace("/(app)/(tabs)/dashboard")
        }}
      />

      {userId ? (
        <NotificationPermissionPrompt
          userId={userId}
          visible={!onboardingReady}
          onFinished={finishOnboarding}
        />
      ) : null}
    </Screen>
  )
}
