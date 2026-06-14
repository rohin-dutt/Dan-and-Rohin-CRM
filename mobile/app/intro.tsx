import { useEffect, useState } from "react"
import { DeviceEventEmitter, Pressable, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { LogoMark, PersonAvatar, SoftCard } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"
import {
  FIRST_DOWNLOAD_INTRO_COMPLETE_EVENT,
  markFirstDownloadIntroComplete,
} from "@/lib/first-download-intro"

type IntroPage = {
  title: string
  body: string
  visual: "people" | "intentions" | "context" | "simple" | "final"
}

const pages: IntroPage[] = [
  {
    title: "We all have people in our lives who matter more than we show.",
    body: "The friend you could talk to for hours. The colleague who always had your back. The person you still think about, even though it's been a while.",
    visual: "people",
  },
  {
    title: "The intention to reach out is almost never the problem.",
    body: "We mean to call. We think about people. Then life gets busy, and somehow months turn into years.",
    visual: "intentions",
  },
  {
    title: "Roots helps good intentions become real connections.",
    body: "Keep the people you care about close, remember where you left off, and get a quiet nudge when it's been a while.",
    visual: "context",
  },
  {
    title: "Staying in touch can be simple.",
    body: "Add the people who matter. Log when you connect. Roots quietly keeps track of the rest.",
    visual: "simple",
  },
  {
    title: "Stay close to the people that matter most.",
    body: "No networking. No pipeline. No productivity system. Just a quiet nudge to reach out.",
    visual: "final",
  },
]

function ProgressDots({ index }: { index: number }) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {pages.map((_, dotIndex) => (
        <View
          key={dotIndex}
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: dotIndex === index ? colors.forest : "#EDE5D6" }}
        />
      ))}
    </View>
  )
}

function MemoryTag({
  icon,
  label,
  tone = "warm",
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  tone?: "warm" | "sage" | "lilac"
}) {
  const background = tone === "sage" ? colors.mint : tone === "lilac" ? "#F1EEF8" : "#F4EDDE"
  const iconColor = tone === "lilac" ? colors.purple : tone === "sage" ? colors.sage : colors.amber

  return (
    <View
      className="flex-row items-center rounded-xl px-3 py-2 shadow-sm"
      style={{ backgroundColor: background }}
    >
      <Ionicons name={icon} size={16} color={iconColor} />
      <Text
        className="ml-2 text-xs leading-4"
        style={{ color: colors.ink, fontFamily: fonts.medium }}
      >
        {label}
      </Text>
    </View>
  )
}

function PeopleVisual() {
  return (
    <View className="mt-8 h-[340px] w-full">
      <View className="absolute left-1 top-1">
        <PersonAvatar name="Maya Chen" size={104} />
      </View>
      <View className="absolute right-5 top-24">
        <PersonAvatar name="Alex Morgan" size={118} />
      </View>
      <View className="absolute left-8" style={{ top: 226 }}>
        <PersonAvatar name="Dr Lee" size={92} />
      </View>
      <View className="absolute right-1 top-20 max-w-[148px]">
        <MemoryTag icon="heart-outline" label="Could talk for hours" tone="sage" />
      </View>
      <View className="absolute left-2 max-w-[144px]" style={{ top: 170 }}>
        <MemoryTag icon="shield-checkmark-outline" label="Always had your back" />
      </View>
      <View className="absolute right-4 max-w-[150px]" style={{ top: 270 }}>
        <MemoryTag icon="star-outline" label="Changed how you think" tone="lilac" />
      </View>
      <View className="absolute bottom-0 left-0 opacity-40">
        <LogoMark size={74} muted />
      </View>
    </View>
  )
}

function IntentionsVisual() {
  const rows = [
    ["Thought about reaching out", "A few weeks later"],
    ["Saw something they would love", "A few months later"],
    ["Meant to ask how they were", "It's been a while"],
  ]

  return (
    <View className="mt-8 w-full">
      {rows.map(([thought, delay], index) => (
        <View key={thought} className="mb-4 flex-row items-center">
          <View className="h-[78px] w-[92px] items-center justify-center rounded-2xl bg-white shadow-sm">
            <Ionicons
              name={index === 0 ? "call-outline" : index === 1 ? "walk-outline" : "moon-outline"}
              size={28}
              color={colors.forest}
            />
          </View>
          <View className="ml-4 flex-1">
            <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="text-sm leading-5">
              {thought}
            </Text>
            <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-xs">
              {delay}
            </Text>
          </View>
          <View className="items-center">
            <PersonAvatar name="Alex Morgan" size={42} />
            {index < rows.length - 1 ? (
              <View className="mt-1 h-10 w-px border-l border-dashed" style={{ borderColor: colors.sage }} />
            ) : null}
          </View>
        </View>
      ))}
      <View className="mt-3 flex-row items-center justify-center">
        <LogoMark size={28} muted />
        <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="ml-3 text-sm">
          Life moves fast. Good intentions get lost in it.
        </Text>
      </View>
    </View>
  )
}

function ContextVisual() {
  return (
    <View className="mt-8 h-[340px] w-full items-center justify-center">
      <SoftCard className="absolute top-0 px-4 py-3">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={20} color={colors.amber} />
          <View className="ml-3">
            <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="text-xs">
              Last caught up
            </Text>
            <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-xs">
              6 weeks ago
            </Text>
          </View>
        </View>
      </SoftCard>
      <PersonAvatar name="Alex Morgan" size={132} />
      <View className="absolute left-0 max-w-[130px]" style={{ top: 86 }}>
        <MemoryTag icon="briefcase-outline" label="Starting a new role" />
      </View>
      <View className="absolute right-0 max-w-[128px]" style={{ top: 92 }}>
        <MemoryTag icon="chatbubble-ellipses-outline" label="Ask how the move went" tone="sage" />
      </View>
      <View className="absolute bottom-14 left-2 max-w-[132px]">
        <MemoryTag icon="book-outline" label="Met during freshman year" />
      </View>
      <View className="absolute bottom-8 right-1 max-w-[122px]">
        <MemoryTag icon="calendar-outline" label="Birthday August 14" />
      </View>
      <View className="absolute bottom-0">
        <MemoryTag icon="heart" label="Loves trail running" tone="sage" />
      </View>
    </View>
  )
}

function SimpleVisual() {
  return (
    <View className="mt-8 w-full items-center">
      <SoftCard className="w-full p-5">
        <View className="flex-row items-center">
          <PersonAvatar name="Alex Morgan" size={72} />
          <View className="ml-4 flex-1">
            <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-xl">
              Alex Morgan
            </Text>
            <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="mt-1 text-sm">
              Last caught up
            </Text>
            <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="mt-1 text-sm">
              6 weeks ago
            </Text>
          </View>
        </View>
        <View className="mt-5 rounded-xl px-4 py-4" style={{ backgroundColor: "#F4EDDE" }}>
          <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="text-sm leading-5">
            Alex was preparing for a promotion interview when you last spoke.
          </Text>
        </View>
      </SoftCard>
      <View className="my-5 w-full rounded-2xl px-5 py-4" style={{ backgroundColor: colors.forest }}>
        <View className="flex-row items-center justify-center">
          <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
          <Text style={{ fontFamily: fonts.semibold, color: "#FFFFFF" }} className="ml-3 text-base">
            Log connection
          </Text>
        </View>
      </View>
      <Ionicons name="arrow-down-outline" size={30} color={colors.forest} />
      <SoftCard className="mt-5 w-full p-5">
        <View className="flex-row items-center">
          <PersonAvatar name="Alex Morgan" size={64} />
          <View className="ml-4 flex-1">
            <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-lg">
              Alex Morgan
            </Text>
            <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="mt-1 text-sm">
              Last caught up today
            </Text>
          </View>
        </View>
      </SoftCard>
    </View>
  )
}

function FinalVisual({
  canContinue,
  onSignup,
  onLogin,
}: {
  canContinue: boolean
  onSignup: () => void
  onLogin: () => void
}) {
  return (
    <View className="mt-8 w-full flex-1 items-center">
      <LogoMark size={86} />
      <Text
        style={{ fontFamily: fonts.heading, color: colors.forest }}
        className="mt-2 text-[50px] leading-[54px]"
      >
        roots
      </Text>
      <View className="mt-3 h-px w-10" style={{ backgroundColor: colors.forest }} />
      <View className="mt-8 h-[164px] w-full items-center justify-end overflow-hidden rounded-[28px]">
        <View
          className="absolute bottom-0 h-[110px] w-[220px] rounded-t-full"
          style={{ backgroundColor: "#D9D5A4" }}
        />
        <View
          className="absolute bottom-0 h-[76px] w-[320px] rounded-t-full"
          style={{ backgroundColor: "#EEE2C7" }}
        />
        <LogoMark size={132} />
      </View>
      <View className="mt-7 w-full gap-3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Continue with email"
          disabled={!canContinue}
          onPress={onSignup}
          activeOpacity={0.78}
          className="min-h-12 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white shadow-sm"
          style={{ opacity: canContinue ? 1 : 0.55 }}
        >
          <Ionicons name="mail-outline" size={22} color={colors.forest} />
          <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} className="ml-3 text-base">
            Continue with email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="I already have an account"
          disabled={!canContinue}
          onPress={onLogin}
          activeOpacity={0.78}
          className="min-h-11 items-center justify-center"
          style={{ opacity: canContinue ? 1 : 0.55 }}
        >
          <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="text-sm">
            I already have an account
          </Text>
        </TouchableOpacity>
      </View>
      <View className="mt-auto flex-row items-center px-5 pb-2">
        <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="ml-2 flex-1 text-center text-xs leading-4">
          Your relationship information is never shared with other Roots users.
        </Text>
      </View>
    </View>
  )
}

function PageVisual({
  page,
  canContinue,
  onSignup,
  onLogin,
}: {
  page: IntroPage
  canContinue: boolean
  onSignup: () => void
  onLogin: () => void
}) {
  if (page.visual === "people") return <PeopleVisual />
  if (page.visual === "intentions") return <IntentionsVisual />
  if (page.visual === "context") return <ContextVisual />
  if (page.visual === "simple") return <SimpleVisual />
  return <FinalVisual canContinue={canContinue} onSignup={onSignup} onLogin={onLogin} />
}

export default function FirstDownloadIntroScreen() {
  const router = useRouter()
  const [pageIndex, setPageIndex] = useState(0)
  const [canContinue, setCanContinue] = useState(false)
  const page = pages[pageIndex]
  const isFinalPage = pageIndex === pages.length - 1

  useEffect(() => {
    setCanContinue(false)
    const timeout = setTimeout(() => setCanContinue(true), 2000)
    return () => clearTimeout(timeout)
  }, [pageIndex])

  function advancePage() {
    if (!canContinue || isFinalPage) return
    setPageIndex((current) => current + 1)
  }

  async function completeIntro(route: "/(auth)/signup" | "/(auth)/login") {
    if (!canContinue) return
    await markFirstDownloadIntroComplete()
    DeviceEventEmitter.emit(FIRST_DOWNLOAD_INTRO_COMPLETE_EVENT)
    router.replace(route)
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.ivory }}>
      <Pressable
        className="flex-1 px-6 pb-5 pt-4"
        accessibilityRole={isFinalPage ? undefined : "button"}
        accessibilityLabel={isFinalPage ? undefined : "Advance intro"}
        onPress={advancePage}
      >
        <ProgressDots index={pageIndex} />
        <View className="mt-10 items-center">
          <Text
            style={{ fontFamily: fonts.heading, color: colors.forest }}
            className="text-center text-[32px] leading-[39px]"
          >
            {page.title}
          </Text>
          <Text
            style={{ fontFamily: fonts.body, color: colors.ink }}
            className="mt-5 text-center text-[15px] leading-7"
          >
            {page.body}
          </Text>
        </View>
        <PageVisual
          page={page}
          canContinue={canContinue}
          onSignup={() => void completeIntro("/(auth)/signup")}
          onLogin={() => void completeIntro("/(auth)/login")}
        />
      </Pressable>
    </SafeAreaView>
  )
}
