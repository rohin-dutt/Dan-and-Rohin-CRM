import { useEffect, useRef, useState } from "react"
import { AppState, Linking, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { IconTile, SoftCard } from "@/components/RootsUI"
import { BottomSheetModal } from "@/components/BottomSheetModal"
import { colors, fonts } from "@/constants/theme"
import type { Tag } from "@/types"

const POST_ACTION_RESET_MS = 30000

export type ProfileTab = "Timeline" | "About" | "Notes" | "Follow-ups"

export const PROFILE_TABS: ProfileTab[] = ["Timeline", "About", "Notes", "Follow-ups"]

export type InfoRow = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  actionIcon?: keyof typeof Ionicons.glyphMap
  tone?: "green" | "purple" | "amber" | "red"
  contactActions?: {
    phone?: string | null
    email?: string | null
    personName: string
    onLogInteraction: () => void
  }
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

export function ContactActionButtons({
  phone,
  email,
  personName,
  onLogInteraction,
}: {
  phone?: string | null
  email?: string | null
  personName: string
  onLogInteraction: () => void
}) {
  const [promptVisible, setPromptVisible] = useState(false)
  const awaitingReturnRef = useRef(false)
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const appStateRef = useRef(AppState.currentState)

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current
      appStateRef.current = nextState
      if (previousState !== "active" && nextState === "active" && awaitingReturnRef.current) {
        awaitingReturnRef.current = false
        clearResetTimeout()
        setPromptVisible(true)
      }
    })
    return () => {
      subscription.remove()
      clearResetTimeout()
    }
  }, [])

  function clearResetTimeout() {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = null
    }
  }

  function handleAction(url: string) {
    awaitingReturnRef.current = true
    clearResetTimeout()
    resetTimeoutRef.current = setTimeout(() => {
      awaitingReturnRef.current = false
    }, POST_ACTION_RESET_MS)
    void Linking.openURL(url)
  }

  function dismissPrompt() {
    setPromptVisible(false)
  }

  function confirmLogInteraction() {
    setPromptVisible(false)
    onLogInteraction()
  }

  const firstName = personName.trim().split(/\s+/)[0] || personName

  return (
    <>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        {phone ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Call"
            onPress={() => handleAction(`tel:${phone}`)}
            style={{ backgroundColor: colors.mint, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 20 }}
          >
            <Ionicons name="call-outline" size={18} color={colors.forest} />
          </TouchableOpacity>
        ) : null}
        {phone ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Text"
            onPress={() => handleAction(`sms:${phone}`)}
            style={{ backgroundColor: colors.mint, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 20 }}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.forest} />
          </TouchableOpacity>
        ) : null}
        {email ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Email"
            onPress={() => handleAction(`mailto:${email}`)}
            style={{ backgroundColor: colors.mint, paddingHorizontal: 6, paddingVertical: 5, borderRadius: 20 }}
          >
            <Ionicons name="mail-outline" size={18} color={colors.forest} />
          </TouchableOpacity>
        ) : null}
      </View>

      <BottomSheetModal
        visible={promptVisible}
        onClose={dismissPrompt}
        accessibilityLabel="Dismiss log interaction prompt"
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View style={{ height: 6, width: 96, borderRadius: 3, backgroundColor: "#E7E5E4" }} />
          </View>
          <Text
            style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 18, textAlign: "center", marginBottom: 20 }}
          >
            Did you connect with {firstName}?
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Yes, log it"
            onPress={confirmLogInteraction}
            activeOpacity={0.8}
            style={{
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              backgroundColor: colors.forest,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontFamily: fonts.bold, color: "white", fontSize: 16 }}>Yes, log it</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Not now"
            onPress={dismissPrompt}
            activeOpacity={0.8}
            style={{
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E7E5E4",
              backgroundColor: "white",
            }}
          >
            <Text style={{ fontFamily: fonts.semibold, color: colors.muted, fontSize: 16 }}>Not now</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    </>
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
    ["Reach out", nextAction],
    ["Chats", String(interactionsCount)],
    ["Follow up?", openFollowUpsCount > 0 ? "Yes" : "No"],
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
        <Text style={{ fontFamily: fonts.heading, color: colors.warmBlack }} className="ml-3 text-lg">
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
                {row.contactActions ? (
                  <View className="mt-0.5 flex-row items-center">
                    <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="flex-1 text-sm">
                      {row.value}
                    </Text>
                    <ContactActionButtons
                      phone={row.contactActions.phone}
                      email={row.contactActions.email}
                      personName={row.contactActions.personName}
                      onLogInteraction={row.contactActions.onLogInteraction}
                    />
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
