import { Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { IconTile, SoftCard } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"

export function SettingsSection({
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
      <Text style={{ fontFamily: fonts.heading, color: colors.forest }} className="text-lg">
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="mt-1 text-sm">
        {subtitle}
      </Text>
      <View className="mt-3">{children}</View>
    </SoftCard>
  )
}

export function SettingsRow({
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
  onPress?: () => void
}) {
  return (
    <TouchableOpacity
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={title}
      disabled={disabled || !onPress}
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
      {onPress ? <Ionicons name="chevron-forward" size={22} color={colors.muted} /> : null}
    </TouchableOpacity>
  )
}

export function InlineForm({ children }: { children: React.ReactNode }) {
  return <View className="mb-3 rounded-2xl bg-stone-50 p-3">{children}</View>
}
