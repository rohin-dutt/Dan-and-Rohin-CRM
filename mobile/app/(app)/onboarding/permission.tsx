import { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import * as Contacts from "expo-contacts"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { LogoMark } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"

export default function OnboardingPermissionScreen() {
  const router = useRouter()
  const [requesting, setRequesting] = useState(false)

  async function handleConnectContacts() {
    if (requesting) return
    setRequesting(true)
    try {
      const permission = await Contacts.requestPermissionsAsync()
      if (permission.granted) {
        router.push("/(app)/onboarding/select")
      } else {
        router.push("/(app)/onboarding/manual")
      }
    } finally {
      setRequesting(false)
    }
  }

  return (
    <Screen scrollable={false}>
      <View className="flex-1 items-center justify-center px-6 py-12">
        <LogoMark size={80} />
        <Text
          style={{ fontFamily: fonts.heading, color: colors.forest }}
          className="mt-6 text-center text-[32px] leading-[38px]"
        >
          Find the people who matter
        </Text>
        <Text
          style={{ fontFamily: fonts.body, color: colors.muted }}
          className="mt-4 text-center text-[15px] leading-5"
        >
          Roots works best when you can pick directly from your contacts. We only access the
          people you choose — nothing is imported automatically.
        </Text>
        <View className="mt-8 w-full">
          <Button title="Connect Contacts" onPress={handleConnectContacts} loading={requesting} />
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add someone manually instead"
          onPress={() => router.push("/(app)/onboarding/manual")}
          className="mt-5 min-h-11 items-center justify-center"
        >
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="text-sm">
            Add someone manually instead
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding for now"
          onPress={() =>
            router.push({
              pathname: "/(app)/onboarding/celebrate",
              params: { skipped: "true" },
            })
          }
          className="mt-1 min-h-11 items-center justify-center"
        >
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="text-sm">
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}
