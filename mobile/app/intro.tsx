import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native"
import { Image, type ImageRef } from "expo-image"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

import { AppleSignInButton } from "@/components/AppleSignInButton"
import { LogoMark } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"
import {
  FIRST_DOWNLOAD_INTRO_COMPLETE_EVENT,
  markFirstDownloadIntroComplete,
} from "@/lib/first-download-intro"
import peopleArt from "../assets/onboarding/onboarding-01-people.png"
import timelineArt from "../assets/onboarding/onboarding-02-botanical.png"
import contextArt from "../assets/onboarding/onboarding-03-context.png"
import simpleArt from "../assets/onboarding/onboarding-04-simple.png"

type IntroPage = {
  title: string
  body: string
  art?: number
  kind: "story" | "timeline" | "final"
  artFit?: "cover" | "contain"
  artTop?: `${number}%`
  artScale?: number
  closing?: string
}

type TimelineEntry = {
  label: string
  message: string
}

const onboardingArtwork = [
  { pageIndex: 0, source: peopleArt },
  { pageIndex: 1, source: timelineArt },
  { pageIndex: 2, source: contextArt },
  { pageIndex: 3, source: simpleArt },
]

const SHOW_APPLE_SIGN_IN_ON_ONBOARDING = false

const timelineEntries: TimelineEntry[] = [
  { label: "Today", message: "I should text Alex." },
  { label: "A few weeks later", message: "I’ll reach out this weekend." },
  { label: "A few months later", message: "Where do I even start?" },
]

const pages: IntroPage[] = [
  {
    title: "We all have people in our lives who matter more than we show.",
    body: "The friend you could talk to for hours. The colleague who always had your back. The person you still think about, even though it's been a while.",
    art: peopleArt,
    kind: "story",
  },
  {
    title: "The longer we wait,\nthe harder reaching out\ncan feel.",
    body: "A quick thought becomes “I’ll do it later.”\nBefore long, even a simple message\ncan feel difficult to send.",
    closing:
      "Time does not change how much\nsomeone matters. It only makes the\nfirst step feel bigger.",
    art: timelineArt,
    kind: "timeline",
  },
  {
    title: "Roots helps good intentions become real connections.",
    body: "Keep the people you care about close, remember where you left off, and get a quiet nudge when it's been a while.",
    art: contextArt,
    kind: "story",
    artTop: "10%",
  },
  {
    title: "Staying in touch can be simple.",
    body: "Add the people who matter. Log when you connect. Roots quietly keeps track of the rest.",
    art: simpleArt,
    kind: "story",
    artFit: "contain",
    artTop: "9%",
    artScale: 0.95,
  },
  {
    title: "Stay close to the people\nthat matter.",
    body: "No networking. No pipeline. No productivity system.\nJust a quiet nudge to reach out.",
    kind: "final",
  },
]

const styles = StyleSheet.create({
  backgroundArt: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
})

function ProgressHeader({ index }: { index: number }) {
  return (
    <View className="h-10 w-full items-center justify-center">
      <View
        className="absolute left-0 h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(239, 228, 209, 0.9)" }}
      >
        <Text style={{ color: colors.forest, fontFamily: fonts.semibold }} className="text-sm">
          {index + 1}
        </Text>
      </View>
      <View className="flex-row items-center justify-center gap-2.5">
        {pages.map((_, dotIndex) => (
          <View
            key={dotIndex}
            className="h-2.5 w-2.5 rounded-full"
            style={{
              backgroundColor:
                dotIndex === index ? colors.forest : "rgba(239, 228, 209, 0.95)",
            }}
          />
        ))}
      </View>
    </View>
  )
}

function StoryCopy({ page, compact }: { page: IntroPage; compact: boolean }) {
  return (
    <View className={compact ? "mt-2 items-center" : "mt-4 items-center"}>
      <Text
        style={{
          color: colors.forest,
          fontFamily: fonts.heading,
          fontSize: compact ? 27 : 31,
          lineHeight: compact ? 31 : 37,
        }}
        className="text-center"
      >
        {page.title}
      </Text>
      <Text
        style={{
          color: colors.ink,
          fontFamily: fonts.body,
          fontSize: compact ? 12 : 14,
          lineHeight: compact ? 18 : 22,
        }}
        className={compact ? "mt-2 text-center" : "mt-3 text-center"}
      >
        {page.body}
      </Text>
    </View>
  )
}

function OnboardingInitialsAvatar({ compact }: { compact: boolean }) {
  const size = compact ? 54 : 64

  return (
    <View
      className="items-center justify-center rounded-full border-2 border-white bg-white shadow-sm"
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel="Alex Morgan initials"
    >
      <View
        className="items-center justify-center rounded-full border"
        style={{
          width: size - 8,
          height: size - 8,
          borderColor: colors.sage,
          backgroundColor: colors.ivory,
        }}
      >
        <Text
          style={{
            color: colors.forest,
            fontFamily: fonts.heading,
            fontSize: compact ? 24 : 29,
            lineHeight: compact ? 27 : 32,
          }}
          maxFontSizeMultiplier={1.15}
        >
          AM
        </Text>
      </View>
      <View
        className="absolute -bottom-1 -right-1 rounded-full p-0.5"
        style={{ backgroundColor: colors.brandIvory }}
      >
        <Ionicons name="leaf-outline" size={compact ? 13 : 15} color={colors.sage} />
      </View>
    </View>
  )
}

function TimelineEntryRow({
  entry,
  compact,
}: {
  entry: TimelineEntry
  compact: boolean
}) {
  return (
    <View className="flex-row items-center" style={{ minHeight: compact ? 66 : 82 }}>
      <View
        className="self-stretch items-center justify-start"
        style={{ width: compact ? 66 : 78 }}
      >
        <OnboardingInitialsAvatar compact={compact} />
      </View>

      <View className="ml-2 flex-1">
        <Text
          style={{
            color: colors.forest,
            fontFamily: fonts.semibold,
            fontSize: compact ? 12 : 14,
            lineHeight: compact ? 16 : 19,
          }}
          maxFontSizeMultiplier={1.2}
        >
          {entry.label}
        </Text>
        <View
          className="mt-1 min-h-[46px] flex-row items-center rounded-2xl border bg-white/95 px-3 shadow-sm"
          style={{ borderColor: colors.border }}
        >
          <Text
            className="flex-1 pr-2"
            style={{
              color: colors.ink,
              fontFamily: fonts.body,
              fontSize: compact ? 12 : 14,
              lineHeight: compact ? 17 : 20,
            }}
            maxFontSizeMultiplier={1.2}
          >
            {entry.message}
          </Text>
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: compact ? 30 : 34,
              height: compact ? 30 : 34,
              backgroundColor: colors.sand,
            }}
          >
            <Ionicons
              name="paper-plane"
              size={compact ? 14 : 16}
              color={colors.sage}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

function TimelineContent({ page, compact }: { page: IntroPage; compact: boolean }) {
  return (
    <View className="flex-1">
      <View className={compact ? "mt-1 items-center" : "mt-3 items-center"}>
        <Text
          style={{
            color: colors.forest,
            fontFamily: fonts.heading,
            fontSize: compact ? 25 : 30,
            lineHeight: compact ? 28 : 34,
            textAlign: "center",
          }}
          maxFontSizeMultiplier={1.16}
        >
          {page.title}
        </Text>
        <Text
          className={compact ? "mt-1.5" : "mt-2"}
          style={{
            color: colors.ink,
            fontFamily: fonts.body,
            fontSize: compact ? 11 : 13,
            lineHeight: compact ? 16 : 19,
            textAlign: "center",
          }}
          maxFontSizeMultiplier={1.2}
        >
          {page.body}
        </Text>
      </View>

      <View className={compact ? "mt-2 flex-1 justify-between" : "mt-4 flex-1 justify-between"}>
        {timelineEntries.map((entry) => (
          <TimelineEntryRow
            key={entry.label}
            entry={entry}
            compact={compact}
          />
        ))}
      </View>

      <View className={compact ? "items-center pt-1" : "items-center pt-3"}>
        <Ionicons name="leaf-outline" size={compact ? 17 : 20} color={colors.sage} />
        <Text
          className="mt-1 text-center"
          style={{
            color: colors.ink,
            fontFamily: fonts.body,
            fontSize: compact ? 10 : 12,
            lineHeight: compact ? 14 : 17,
          }}
          maxFontSizeMultiplier={1.2}
        >
          {page.closing}
        </Text>
      </View>
    </View>
  )
}

function FinalContent({
  compact,
  page,
  appleError,
  onAppleError,
  onAppleSignedIn,
  onActionPressIn,
  onLogin,
  onSignup,
}: {
  compact: boolean
  page: IntroPage
  appleError: string | null
  onAppleError: (message: string | null) => void
  onAppleSignedIn: () => void | Promise<void>
  onActionPressIn: () => void
  onLogin: () => void
  onSignup: () => void
}) {
  return (
    <View className="flex-1 w-full justify-center">
      <View className="items-center">
        <LogoMark size={compact ? 58 : 70} />
        <Text
          style={{
            color: colors.forest,
            fontFamily: fonts.heading,
            fontSize: compact ? 35 : 41,
            lineHeight: compact ? 37 : 43,
          }}
          className="-mt-2"
          maxFontSizeMultiplier={1.15}
        >
          roots
        </Text>
        <View className="mt-2 h-px w-10" style={{ backgroundColor: colors.sage }} />

        <Text
          style={{
            color: colors.forest,
            fontFamily: fonts.heading,
            fontSize: compact ? 26 : 31,
            lineHeight: compact ? 29 : 35,
          }}
          className={compact ? "mt-4 px-2 text-center" : "mt-5 px-2 text-center"}
          maxFontSizeMultiplier={1.15}
        >
          {page.title}
        </Text>
        <Text
          style={{
            color: colors.ink,
            fontFamily: fonts.body,
            fontSize: compact ? 11 : 13,
            lineHeight: compact ? 16 : 20,
          }}
          className="mt-3 px-3 text-center"
          maxFontSizeMultiplier={1.2}
        >
          {page.body}
        </Text>
      </View>

      <View
        className={compact ? "mt-5 w-full gap-2" : "mt-8 w-full gap-2.5"}
        onTouchEnd={(event) => event.stopPropagation()}
      >
        {appleError ? (
          <Text
            style={{ color: colors.error, fontFamily: fonts.medium }}
            className="text-center text-xs leading-4"
          >
            {appleError}
          </Text>
        ) : null}
        {SHOW_APPLE_SIGN_IN_ON_ONBOARDING ? (
          <AppleSignInButton
            kind="continue"
            onError={onAppleError}
            onSignedIn={onAppleSignedIn}
          />
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Continue with email"
          onPressIn={onActionPressIn}
          onPress={(event) => {
            event.stopPropagation()
            onSignup()
          }}
          activeOpacity={0.78}
          className="min-h-[50px] flex-row items-center justify-center rounded-[14px] border bg-white/95 shadow-sm"
          style={{ borderColor: colors.border }}
        >
          <Ionicons name="mail-outline" size={21} color={colors.forest} />
          <Text style={{ color: colors.ink, fontFamily: fonts.semibold }} className="ml-3 text-base">
            Continue with email
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="I already have an account"
          onPressIn={onActionPressIn}
          onPress={(event) => {
            event.stopPropagation()
            onLogin()
          }}
          activeOpacity={0.72}
          className="min-h-8 items-center justify-center"
        >
          <Text style={{ color: colors.forest, fontFamily: fonts.medium }} className="text-sm">
            I already have an account
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-2.5 flex-row items-center px-4">
        <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
        <Text
          style={{ color: colors.muted, fontFamily: fonts.body }}
          className="ml-2 flex-1 text-center text-[10px] leading-4"
          maxFontSizeMultiplier={1.2}
        >
          Your relationship data remains private to your account.{"\n"}
          Roots does not sell your data or share it with advertisers.
        </Text>
      </View>
    </View>
  )
}

export default function FirstDownloadIntroScreen() {
  const router = useRouter()
  const { height, width } = useWindowDimensions()
  const [pageIndex, setPageIndex] = useState(0)
  const [appleError, setAppleError] = useState<string | null>(null)
  const [preloadedArtwork, setPreloadedArtwork] = useState<Record<number, ImageRef> | null>(null)
  const [artworkLoadFailed, setArtworkLoadFailed] = useState(false)
  const suppressScreenPressUntil = useRef(0)
  const page = pages[pageIndex]
  const compact = height < 760
  const isNarrativePage = page.kind !== "final"
  const activeArtwork =
    page.art
      ? preloadedArtwork?.[pageIndex] ?? page.art
      : null

  useEffect(() => {
    let active = true

    Promise.all(onboardingArtwork.map(({ source }) => Image.loadAsync(source)))
      .then((loadedArtwork) => {
        if (!active) return

        const artworkByPage = onboardingArtwork.reduce<Record<number, ImageRef>>(
          (result, artwork, index) => {
            result[artwork.pageIndex] = loadedArtwork[index]
            return result
          },
          {},
        )
        setPreloadedArtwork(artworkByPage)
      })
      .catch(() => {
        if (active) setArtworkLoadFailed(true)
      })

    return () => {
      active = false
    }
  }, [])

  function handleScreenPress(pageX: number) {
    if (Date.now() < suppressScreenPressUntil.current) return

    setAppleError(null)

    if (pageX < width / 2) {
      setPageIndex((current) => Math.max(0, current - 1))
      return
    }

    setPageIndex((current) => Math.min(pages.length - 1, current + 1))
  }

  function handleAccessibilityAction(actionName: string) {
    if (actionName === "decrement") {
      setPageIndex((current) => Math.max(0, current - 1))
    }

    if (actionName === "increment") {
      setPageIndex((current) => Math.min(pages.length - 1, current + 1))
    }
  }

  async function finishIntro() {
    await markFirstDownloadIntroComplete()
    DeviceEventEmitter.emit(FIRST_DOWNLOAD_INTRO_COMPLETE_EVENT)
  }

  async function completeIntro(route: "/(auth)/signup" | "/(auth)/login") {
    await finishIntro()
    router.replace(route)
  }

  async function completeAppleIntro() {
    await finishIntro()
    router.replace("/")
  }

  if (!preloadedArtwork && !artworkLoadFailed) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.brandIvory }}
      >
        <ActivityIndicator color={colors.forest} />
      </View>
    )
  }

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.brandIvory, overflow: "hidden" }}
    >
      {activeArtwork ? (
        <Image
          key={pageIndex}
          source={activeArtwork}
          contentFit={page.artFit ?? "cover"}
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
          style={[
            styles.backgroundArt,
            page.artTop ? { top: page.artTop } : null,
            page.artScale ? { transform: [{ scale: page.artScale }] } : null,
          ]}
          accessible={false}
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <SafeAreaView className="flex-1">
        <Pressable
          accessible={isNarrativePage}
          accessibilityRole={isNarrativePage ? "adjustable" : undefined}
          accessibilityLabel={isNarrativePage ? `${page.title} ${page.body}` : undefined}
          accessibilityHint={
            isNarrativePage ? "Use the adjustable actions to move between pages." : undefined
          }
          accessibilityValue={
            isNarrativePage
              ? { min: 1, max: pages.length, now: pageIndex + 1, text: `Page ${pageIndex + 1} of ${pages.length}` }
              : undefined
          }
          accessibilityActions={
            isNarrativePage
              ? [
                  { name: "decrement", label: "Previous page" },
                  { name: "increment", label: "Next page" },
                ]
              : undefined
          }
          onAccessibilityAction={(event) =>
            handleAccessibilityAction(event.nativeEvent.actionName)
          }
          className="flex-1 px-5 pb-2 pt-1 focus:outline-none"
          onPress={(event) => handleScreenPress(event.nativeEvent.pageX)}
        >
          <ProgressHeader index={pageIndex} />

          {page.kind === "final" ? (
            <FinalContent
              compact={compact}
              page={page}
              appleError={appleError}
              onAppleError={setAppleError}
              onAppleSignedIn={completeAppleIntro}
              onActionPressIn={() => {
                suppressScreenPressUntil.current = Date.now() + 750
              }}
              onSignup={() => void completeIntro("/(auth)/signup")}
              onLogin={() => void completeIntro("/(auth)/login")}
            />
          ) : page.kind === "timeline" ? (
            <TimelineContent page={page} compact={compact} />
          ) : (
            <StoryCopy page={page} compact={compact} />
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  )
}
