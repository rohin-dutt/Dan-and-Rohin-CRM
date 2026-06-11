import { Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { SoftCard } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"

export function MetricCard({
  icon,
  value,
  label,
  tone = "green",
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  value: number
  label: string
  tone?: "green" | "amber" | "blue"
  onPress?: () => void
}) {
  const toneColors = {
    green: { bg: colors.mint, icon: colors.forest },
    amber: { bg: "#FFF3DE", icon: colors.amber },
    blue: { bg: "#EAF1FC", icon: colors.blue },
  }[tone]

  return (
    <TouchableOpacity
      activeOpacity={0.76}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1"
    >
      <SoftCard className="flex-1 justify-center px-3 py-3">
        <View className="flex-row items-center justify-center">
          <View
            className="mr-2 h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: toneColors.bg }}
          >
            <Ionicons name={icon} size={16} color={toneColors.icon} />
          </View>
          <Text
            style={{ fontFamily: fonts.bold, color: colors.forest }}
            className="text-2xl leading-7"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {value}
          </Text>
        </View>
        <Text
          style={{ fontFamily: fonts.body, color: colors.ink }}
          className="mt-1 text-center text-[10px] leading-3"
          numberOfLines={2}
        >
          {label}
        </Text>
      </SoftCard>
    </TouchableOpacity>
  )
}

export function SummaryStat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap
  value: string
  label: string
}) {
  return (
    <View className="flex-1 items-center px-2">
      <Ionicons name={icon} size={20} color={colors.forest} />
      <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} adjustsFontSizeToFit className="mt-2 text-lg">
        {value}
      </Text>
      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-center text-xs leading-4">
        {label}
      </Text>
    </View>
  )
}

export function SummaryDivider() {
  return <View className="h-16 w-px bg-stone-200" />
}
