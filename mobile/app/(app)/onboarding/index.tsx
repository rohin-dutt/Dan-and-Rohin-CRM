import { useEffect } from "react"
import { Text, View } from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { LogoMark } from "@/components/RootsUI"
import { resetCadenceDefaults, resetContacts } from "@/features/onboarding/onboarding-contacts"
import { colors, fonts } from "@/constants/theme"

export default function OnboardingWelcomeScreen() {
  const router = useRouter()

  useEffect(() => {
    resetContacts()
    resetCadenceDefaults()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/(auth)/login")
    })
  }, [router])

  return (
    <Screen scrollable={false}>
      <View className="flex-1 items-center justify-center px-6 py-12">
        <LogoMark size={64} />
        <Text
          style={{ fontFamily: fonts.heading, color: colors.forest }}
          className="mt-6 text-center text-[32px] leading-[38px]"
        >
          Stay close to the people who matter.
        </Text>
        <Text
          style={{ fontFamily: fonts.body, color: colors.muted }}
          className="mt-4 text-center text-[15px] leading-5"
        >
          Roots reminds you to reach out, tracks your interactions, and makes sure no one
          important slips away.
        </Text>
        <Text
          style={{ fontFamily: fonts.body, color: colors.muted }}
          className="mt-3 text-center text-xs"
        >
          Takes about 2 minutes.
        </Text>
        <View className="mt-8 w-full">
          <Button
            title="Let's get started →"
            onPress={() => router.push("/(app)/onboarding/permission")}
          />
        </View>
      </View>
    </Screen>
  )
}
