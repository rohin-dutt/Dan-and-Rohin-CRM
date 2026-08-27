import { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { AnchoredMenu, useAnchoredMenu } from "@/components/AnchoredMenu"
import { getCadenceDefaults, setCadenceDefaults } from "@/features/onboarding/onboarding-contacts"
import { RELATIONSHIP_CATEGORIES } from "@/constants/categories"
import { CONTACT_FREQUENCY_OPTIONS, frequencyLabel } from "@/constants/frequencies"
import { colors, fonts } from "@/constants/theme"

const FREQUENCY_MENU_OPTIONS = CONTACT_FREQUENCY_OPTIONS.map((option) => ({
  key: option.value,
  label: option.label,
}))

function CadenceRow({
  icon,
  label,
  days,
  onChange,
}: {
  icon: (typeof RELATIONSHIP_CATEGORIES)[number]["icon"]
  label: string
  days: number
  onChange: (days: number) => void
}) {
  const menu = useAnchoredMenu()

  return (
    <View className="mb-3">
      <View ref={menu.anchorRef}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Choose keep in touch cadence for ${label}`}
          onPress={menu.toggle}
          activeOpacity={0.78}
          className="flex-row items-center rounded-xl border border-stone-200 bg-white"
          style={{ height: 56 }}
        >
          <View className="items-center justify-center border-r border-stone-200" style={{ width: 48, height: 56 }}>
            <Ionicons name={icon} size={20} color={colors.forest} />
          </View>
          <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} className="flex-1 px-3 text-[15px]">
            {label}
          </Text>
          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">
            {frequencyLabel(days)}
          </Text>
          <Ionicons name={menu.visible ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
          <View className="w-3" />
        </TouchableOpacity>
      </View>
      <AnchoredMenu
        visible={menu.visible}
        position={menu.position}
        options={FREQUENCY_MENU_OPTIONS}
        selectedKey={days}
        onSelect={onChange}
        onClose={menu.close}
      />
    </View>
  )
}

export default function OnboardingCadenceDefaultsScreen() {
  const router = useRouter()
  const [cadenceDays, setCadenceDays] = useState(() => getCadenceDefaults())

  function handleContinue() {
    setCadenceDefaults(cadenceDays)
    router.push("/(app)/onboarding/select")
  }

  return (
    <Screen scrollable={false}>
      <View className="flex-1 px-6 pt-12 pb-6">
        <Text
          style={{ fontFamily: fonts.heading, color: colors.forest }}
          className="text-center text-[30px] leading-9"
        >
          How often do you want to stay in touch?
        </Text>
        <Text
          style={{ fontFamily: fonts.body, color: colors.muted }}
          className="mt-3 text-center text-[15px] leading-5"
        >
          You can always change this for individual people later.
        </Text>

        <View className="mt-10">
          {RELATIONSHIP_CATEGORIES.map((category) => (
            <CadenceRow
              key={category.label}
              icon={category.icon}
              label={category.label}
              days={cadenceDays[category.label]}
              onChange={(value) =>
                setCadenceDays((current) => ({
                  ...current,
                  [category.label]: value,
                }))
              }
            />
          ))}
        </View>

        <View className="flex-1" />

        <Button title="Continue" onPress={handleContinue} />
      </View>
    </Screen>
  )
}
