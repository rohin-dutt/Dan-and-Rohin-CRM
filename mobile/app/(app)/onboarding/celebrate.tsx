import { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { QuickAddFormSheet } from "@/features/quick-add/QuickAddFormSheet"
import { colors, fonts } from "@/constants/theme"

export default function OnboardingCelebrateScreen() {
  const router = useRouter()
  const { count } = useLocalSearchParams<{ count?: string }>()
  const [showLogChat, setShowLogChat] = useState(false)

  const savedCount = Number(count) || 0
  const peopleLine =
    savedCount === 1 ? "You've added 1 person to Roots." : `You've added ${savedCount} people to Roots.`

  return (
    <Screen scrollable={false}>
      <View className="flex-1 items-center justify-center px-6 py-12" style={{ backgroundColor: colors.cream }}>
        <Text
          style={{ fontFamily: fonts.heading, color: colors.forest }}
          className="text-center text-[32px] leading-[38px]"
        >
          Your Roots are planted 🌱
        </Text>
        <Text
          style={{ fontFamily: fonts.body, color: colors.muted }}
          className="mt-4 text-center text-[15px] leading-5"
        >
          {peopleLine} Now log your first chat — it takes 10 seconds and helps Roots know where
          to start.
        </Text>
        <View className="mt-8 w-full">
          <Button title="Log a chat" onPress={() => setShowLogChat(true)} />
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go to Roots"
          onPress={() => router.replace("/(app)/(tabs)/dashboard")}
          className="mt-5 min-h-11 items-center justify-center"
        >
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="text-sm">
            Go to Roots
          </Text>
        </TouchableOpacity>
      </View>

      <QuickAddFormSheet
        mode={showLogChat ? "chat" : null}
        onClose={() => {
          setShowLogChat(false)
          router.replace("/(app)/(tabs)/dashboard")
        }}
      />
    </Screen>
  )
}
