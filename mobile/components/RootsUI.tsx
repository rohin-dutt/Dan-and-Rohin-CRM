import { Image, Text, TouchableOpacity, View, type ImageSourcePropType } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import logoMarkAsset from "../assets/roots-logo-mark.png"

const logoMark = logoMarkAsset as ImageSourcePropType

export function LogoMark({ size = 34, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <Image
      source={logoMark}
      resizeMode="contain"
      style={{
        width: size,
        height: size,
        opacity: muted ? 0.62 : 1,
        tintColor: muted ? colors.sage : undefined,
      }}
      accessibilityIgnoresInvertColors
    />
  )
}

export function BrandHeader({
  title,
  subtitle,
  titleIcon,
  actionIcon,
  actionLabel,
  onAction,
}: {
  title: string
  subtitle?: string
  titleIcon?: keyof typeof Ionicons.glyphMap
  actionIcon?: keyof typeof Ionicons.glyphMap
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View className="px-5 pt-4 pb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <View className="flex-row items-center">
            <Text
              style={{ fontFamily: fonts.heading, color: colors.forest }}
              className="text-[32px] leading-[38px]"
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {title}
            </Text>
            <View className="ml-2 mt-1">
              {titleIcon ? (
                <Ionicons name={titleIcon} size={24} color={colors.sage} />
              ) : (
                <LogoMark size={24} muted />
              )}
            </View>
          </View>
          {subtitle ? (
            <Text
              style={{ fontFamily: fonts.body, color: colors.ink }}
              className="mt-1 text-[15px] leading-5"
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {actionIcon && onAction ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={actionLabel ?? "Screen action"}
            onPress={onAction}
            activeOpacity={0.78}
            className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm"
          >
            <Ionicons name={actionIcon} size={20} color={colors.forest} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}

export function SoftCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <View className={`rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`}>
      {children}
    </View>
  )
}

export function SectionTitle({
  title,
  actionLabel,
  onAction,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between">
      <Text
        style={{ fontFamily: fonts.heading, color: colors.forest }}
        className="text-[20px] leading-6"
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          className="min-h-9 justify-center px-1"
        >
          <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-base">
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export function PersonAvatar({
  name,
  size = 44,
  imageUrl,
}: {
  name: string
  size?: number
  imageUrl?: string | null
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?"

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={`${name} photo`}
      />
    )
  }

  return (
    <View
      className="items-center justify-center rounded-full border border-white bg-mint"
      style={{ width: size, height: size, borderRadius: size / 2 }}
      accessibilityLabel={`${name} initials`}
    >
      <Text style={{ fontFamily: fonts.bold, color: colors.forest }} className="text-sm">
        {initials}
      </Text>
    </View>
  )
}

export function IconTile({
  icon,
  color = colors.forest,
  background = colors.mint,
  size = 40,
}: {
  icon: keyof typeof Ionicons.glyphMap
  color?: string
  background?: string
  size?: number
}) {
  return (
    <View
      className="items-center justify-center rounded-xl"
      style={{ width: size, height: size, backgroundColor: background }}
    >
      <Ionicons name={icon} size={20} color={color} />
    </View>
  )
}

export function SearchBox({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <View className={`flex-row items-center rounded-2xl border border-stone-200 bg-white px-4 shadow-sm ${className}`}>
      <Ionicons name="search-outline" size={18} color="#60646D" />
      {children}
    </View>
  )
}

export function Divider() {
  return <View className="h-px bg-stone-200" />
}

export function StatusDot({ status }: { status: "red" | "amber" | "green" | "gray" }) {
  const color = {
    red: "#EF3E35",
    amber: "#F3A10B",
    green: "#78AD6E",
    gray: "#B8B8B8",
  }[status]

  return <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
}

export function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <SoftCard className="mx-5 mt-6 p-5">
      <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} className="text-base">
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm leading-5">
        {body}
      </Text>
    </SoftCard>
  )
}
