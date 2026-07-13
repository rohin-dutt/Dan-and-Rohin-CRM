import { Linking, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { IconTile, SoftCard } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"
import type { Tag } from "@/types"

export type ProfileTab = "Timeline" | "About" | "Notes" | "Follow-ups"

export const PROFILE_TABS: ProfileTab[] = ["Timeline", "About", "Notes", "Follow-ups"]

export type InfoRow = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  actionIcon?: keyof typeof Ionicons.glyphMap
  tone?: "green" | "purple" | "amber" | "red"
  phoneActions?: boolean
}

const toneColors = {
  green: { color: colors.forest, background: colors.mint },
  purple: { color: colors.purple, background: "#F0EAFB" },
  amber: { color: colors.amber, background: "#FFF3DE" },
  red: { color: "#CF2D2D", background: "#FEECEC" },
}

export function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: ProfileTab
  onChange: (tab: ProfileTab) => void
}) {
  return (
    <View className="mt-5 border-b border-stone-200">
      <View className="flex-row">
        {PROFILE_TABS.map((tab) => {
          const isActive = activeTab === tab
          return (
            <TouchableOpacity
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab} tab`}
              onPress={() => onChange(tab)}
              activeOpacity={0.78}
              className="flex-1 items-center px-1 pb-3"
            >
              <Text
                style={{ fontFamily: isActive ? fonts.semibold : fonts.medium, color: isActive ? colors.forest : colors.muted }}
                className="text-[15px]"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {tab}
              </Text>
              <View
                className="absolute bottom-[-1px] h-0.5 rounded-full"
                style={{ width: 78, backgroundColor: isActive ? colors.forest : "transparent" }}
              />
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

export function PhoneActionButtons({ phone }: { phone: string }) {
  return (
    <View className="flex-row items-center" style={{ gap: 6 }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Call"
        onPress={() => Linking.openURL(`tel:${phone}`)}
        style={{ backgroundColor: colors.mint, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 20 }}
      >
        <Ionicons name="call-outline" size={18} color={colors.forest} />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Text"
        onPress={() => Linking.openURL(`sms:${phone}`)}
        style={{ backgroundColor: colors.mint, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 20 }}
      >
        <Ionicons name="chatbubble-outline" size={18} color={colors.forest} />
      </TouchableOpacity>
    </View>
  )
}

export function TagPill({ tag, highlighted = false }: { tag: Pick<Tag, "id" | "name">; highlighted?: boolean }) {
  return (
    <View
      className="rounded-lg px-3 py-1.5"
      style={{ backgroundColor: highlighted ? "#E9F1FF" : colors.mint }}
    >
      <Text
        style={{ fontFamily: fonts.semibold, color: highlighted ? colors.blue : colors.forest }}
        className="text-xs"
      >
        {tag.name}
      </Text>
    </View>
  )
}

export function StatStrip({
  lastTalked,
  nextAction,
  interactionsCount,
  openFollowUpsCount,
}: {
  lastTalked: string
  nextAction: string
  interactionsCount: number
  openFollowUpsCount: number
}) {
  const stats = [
    ["Last talked", lastTalked],
    ["Next action", nextAction],
    ["Interactions", String(interactionsCount)],
    ["Open follow-ups", String(openFollowUpsCount)],
  ]

  return (
    <SoftCard className="mt-5 flex-row px-2 py-4">
      {stats.map(([label, value], index) => (
        <View
          key={label}
          className={`flex-1 items-center px-1 ${index > 0 ? "border-l border-stone-200" : ""}`}
        >
          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-[11px]" numberOfLines={1}>
            {label}
          </Text>
          <Text
            style={{ fontFamily: fonts.semibold, color: colors.ink }}
            className="mt-2 text-[13px]"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {value}
          </Text>
        </View>
      ))}
    </SoftCard>
  )
}

export function SectionCard({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  children: React.ReactNode
}) {
  return (
    <SoftCard className="mb-4 p-4">
      <View className="mb-3 flex-row items-center">
        <IconTile icon={icon} size={36} />
        <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="ml-3 text-lg">
          {title}
        </Text>
      </View>
      {children}
    </SoftCard>
  )
}

export function InfoList({ rows }: { rows: InfoRow[] }) {
  if (rows.length === 0) {
    return <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">Nothing added yet.</Text>
  }

  return (
    <View>
      {rows.map((row, index) => {
        const tone = toneColors[row.tone ?? "green"]
        return (
          <View key={`${row.label}-${row.value}`} className={index > 0 ? "border-t border-stone-100 pt-3 mt-3" : ""}>
            <View className="flex-row items-center">
              <IconTile icon={row.icon} color={tone.color} background={tone.background} size={38} />
              <View className="ml-3 flex-1">
                <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="text-sm">
                  {row.label}
                </Text>
                {row.phoneActions ? (
                  <View className="mt-0.5 flex-row items-center">
                    <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="flex-1 text-sm">
                      {row.value}
                    </Text>
                    <PhoneActionButtons phone={row.value} />
                  </View>
                ) : (
                  <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-0.5 text-sm">
                    {row.value}
                  </Text>
                )}
              </View>
              {row.actionIcon ? <Ionicons name={row.actionIcon} size={22} color={colors.forest} /> : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

export function DetailEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <SoftCard className="p-5">
      <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} className="text-base">
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm leading-5">
        {body}
      </Text>
    </SoftCard>
  )
}
