import { useEffect, useState } from "react"
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
import intentionsArt from "../assets/onboarding/onboarding-02-intentions.png"
import contextArt from "../assets/onboarding/onboarding-03-context.png"
import simpleArt from "../assets/onboarding/onboarding-04-simple.png"
import rootedArt from "../assets/onboarding/onboarding-05-rooted.png"

type IntroPage = {
  title: string
  body: string
  art: number
  kind: "story" | "final"
  artTop?: `${number}%`
}

const onboardingArtwork = [peopleArt, intentionsArt, contextArt, simpleArt, rootedArt]
const SHOW_APPLE_SIGN_IN_ON_ONBOARDING = false

const pages: IntroPage[] = [
  {
    title: "We all have people in our lives who matter more than we show.",
    body: "The friend you could talk to for hours. The colleague who always had your back. The person you still think about, even though it's been a while.",
    art: peopleArt,
    kind: "story",
  },
  {
    title: "The intention to reach out is almost never the problem.",
    body: "We mean to call. We think about people. Then life gets busy, and somehow months turn into years.",
    art: intentionsArt,
    kind: "story",
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
    artTop: "9%",
  },
  {
    title: "Stay close to the people that matter most.",
    body: "No networking. No pipeline. No productivity system. Just a quiet nudge to reach out.",
    art: rootedArt,
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

function FinalContent({
  compact,
  page,
  appleError,
  onAppleError,
  onAppleSignedIn,
  onLogin,
  onSignup,
}: {
  compact: boolean
  page: IntroPage
  appleError: string | null
  onAppleError: (message: string | null) => void
  onAppleSignedIn: () => void | Promise<void>
  onLogin: () => void
  onSignup: () => void
}) {
  return (
    <View className="flex-1 items-center">
      <View className={compact ? "items-center pt-0" : "items-center pt-1"}>
        <LogoMark size={compact ? 46 : 54} />
        <Text
          style={{ color: colors.forest, fontFamily: fonts.heading }}
          className="-mt-1 text-[34px] leading-[35px]"
        >
          roots
        </Text>
        <View className="mt-1.5 h-px w-9" style={{ backgroundColor: colors.sage }} />

        <Text
          style={{
            color: colors.forest,
            fontFamily: fonts.heading,
            fontSize: compact ? 24 : 27,
            lineHeight: compact ? 27 : 31,
          }}
          className="mt-3 px-2 text-center"
        >
          {page.title}
        </Text>
        <Text
          style={{
            color: colors.ink,
            fontFamily: fonts.body,
            fontSize: compact ? 11 : 13,
            lineHeight: compact ? 16 : 19,
          }}
          className="mt-2 px-3 text-center"
        >
          {page.body}
        </Text>
      </View>

      <View className="mt-auto w-full gap-2.5" onTouchEnd={(event) => event.stopPropagation()}>
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

      <View className="mt-1.5 flex-row items-center px-4 pb-0.5">
        <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
        <Text
          style={{ color: colors.muted, fontFamily: fonts.body }}
          className="ml-2 flex-1 text-center text-[10px] leading-4"
        >
          Your relationship information is never shared with other Roots users.
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
  const [preloadedArtwork, setPreloadedArtwork] = useState<ImageRef[] | null>(null)
  const [artworkLoadFailed, setArtworkLoadFailed] = useState(false)
  const page = pages[pageIndex]
  const compact = height < 760

  useEffect(() => {
    let active = true

    Promise.all(onboardingArtwork.map((source) => Image.loadAsync(source)))
      .then((loadedArtwork) => {
        if (active) setPreloadedArtwork(loadedArtwork)
      })
      .catch(() => {
        if (active) setArtworkLoadFailed(true)
      })

    return () => {
      active = false
    }
  }, [])

  function handleScreenPress(pageX: number) {
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
      <Image
        key={pageIndex}
        source={preloadedArtwork?.[pageIndex] ?? page.art}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
        style={[styles.backgroundArt, page.artTop ? { top: page.artTop } : null]}
        accessible={false}
        accessibilityIgnoresInvertColors
      />
      <SafeAreaView className="flex-1">
        <Pressable
          accessible={page.kind === "story"}
          accessibilityRole={page.kind === "story" ? "adjustable" : undefined}
          accessibilityLabel={page.kind === "story" ? `${page.title} ${page.body}` : undefined}
          accessibilityHint={
            page.kind === "story" ? "Use the adjustable actions to move between pages." : undefined
          }
          accessibilityValue={
            page.kind === "story"
              ? { min: 1, max: pages.length, now: pageIndex + 1, text: `Page ${pageIndex + 1} of ${pages.length}` }
              : undefined
          }
          accessibilityActions={
            page.kind === "story"
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
              onSignup={() => void completeIntro("/(auth)/signup")}
              onLogin={() => void completeIntro("/(auth)/login")}
            />
          ) : (
            <StoryCopy page={page} compact={compact} />
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  )
}
