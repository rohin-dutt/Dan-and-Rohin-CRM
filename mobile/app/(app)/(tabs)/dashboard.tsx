import { useCallback, useMemo, useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { Screen } from "@/components/Screen"
import { EmptyPanel, IconTile, PersonAvatar, SectionTitle, SoftCard, StatusDot } from "@/components/RootsUI"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import type { Interaction, Person, Settings } from "@/types"
import { colors, fonts } from "@/constants/theme"
import {
  categorizePeople,
  getBirthdayReminders,
  getMostContacted,
  getNextDueDays,
  getOnTimeRate,
  getTotalContacts,
  getTotalInteractions,
} from "@roots/shared"

function getGreeting(firstName: string): string {
  const hour = new Date().getHours()
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  return `${time}, ${firstName}`
}

function getFirstNameFromMetadata(metadata: Record<string, unknown> | null | undefined): string {
  const fullName =
    typeof metadata?.full_name === "string" ? metadata.full_name
      : typeof metadata?.name === "string" ? metadata.name
        : typeof metadata?.display_name === "string" ? metadata.display_name
          : ""
  return fullName.trim().split(/\s+/)[0] || "there"
}

function daysSince(value: string | null) {
  if (!value) return null
  const then = new Date(value)
  if (Number.isNaN(then.getTime())) return null
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000))
}

function formatLastTalked(value: string | null) {
  const days = daysSince(value)
  if (days == null) return "No interaction yet"
  if (days === 0) return "Last talked today"
  return `Last talked ${days} ${days === 1 ? "day" : "days"} ago`
}

function formatBirthdayDate(value: string | null) {
  if (!value) return ""
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)
}

function statusDotForPerson(person: Person): "red" | "amber" | "green" | "gray" {
  const days = getNextDueDays(person)
  if (days == null) return "gray"
  if (days <= 0) return "red"
  if (days <= 7) return "amber"
  return "green"
}

function personImageUrl(person: Person) {
  const maybePerson = person as Person & { photo_url?: string | null; avatar_url?: string | null; image_url?: string | null }
  return maybePerson.photo_url ?? maybePerson.avatar_url ?? maybePerson.image_url ?? null
}

export default function DashboardScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [firstName, setFirstName] = useState("there")

  const load = useCallback(async () => {
    try {
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const userId = session.user.id
      setFirstName(getFirstNameFromMetadata(session.user.user_metadata))

      const [peopleRes, settingsRes] = await Promise.all([
        supabase.from("people").select("*").eq("user_id", userId),
        supabase.from("settings").select("*").eq("user_id", userId).single(),
      ])

      if (peopleRes.error) throw peopleRes.error
      const loadedPeople = peopleRes.data ?? []
      setPeople(loadedPeople)
      setSettings(settingsRes.data ?? null)

      if (loadedPeople.length > 0) {
        const { data: loadedInteractions, error: interactionsError } = await supabase
          .from("interactions")
          .select("*")
          .in(
            "person_id",
            loadedPeople.map((person) => person.id),
          )
          .order("date", { ascending: false })
        if (interactionsError) throw interactionsError
        setInteractions(loadedInteractions ?? [])
      } else {
        setInteractions([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard.")
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load]),
  )

  const dashboard = useMemo(() => {
    const { overdue, dueThisWeek, comingUp } = categorizePeople(people, new Date(), interactions)
    const dueToday = people.filter((person) => {
      const days = getNextDueDays(person)
      return days != null && days <= 0
    })
    const followUps = [...dueToday, ...overdue, ...dueThisWeek]
      .filter((person, index, list) => list.findIndex((candidate) => candidate.id === person.id) === index)
      .slice(0, 3)
    const recentNotes = interactions
      .filter((interaction) => interaction.notes?.trim())
      .slice(0, 2)
      .map((interaction) => ({
        interaction,
        person: people.find((person) => person.id === interaction.person_id) ?? null,
      }))

    return {
      dueToday,
      dueThisWeek,
      comingUp,
      followUps,
      birthdays: getBirthdayReminders(people, new Date(), 30).slice(0, 3),
      recentNotes,
      onTimeRate: getOnTimeRate(people),
      mostContacted: getMostContacted(people, interactions),
    }
  }, [interactions, people])

  if (loading) return <LoadingState />

  return (
    <Screen>
      <View className="px-5 pt-5 pb-2">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text
                style={{ fontFamily: fonts.heading, color: colors.forest }}
                className="text-[46px] leading-[52px]"
              >
                Roots
              </Text>
              <View className="ml-2 mt-2">
                <Ionicons name="leaf-outline" size={35} color={colors.sage} />
              </View>
            </View>
            <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="mt-1 text-[17px]">
              {getGreeting(firstName)}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Roots overview"
            onPress={() => router.push("/roots-map")}
            className="mt-2 h-14 w-14 items-center justify-center rounded-full border border-stone-200 bg-white shadow-sm"
          >
            <Ionicons name="leaf" size={25} color={colors.forest} />
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View className="px-5">
          <ErrorBanner message={error} />
        </View>
      ) : null}

      {people.length === 0 ? (
        <EmptyPanel
          title="No people yet"
          body="Add someone you want to stay in touch with to start building your relationship dashboard."
        />
      ) : (
        <>
          <View className="mt-5 flex-row gap-3 px-5">
            <MetricCard icon="checkmark-circle" value={dashboard.dueToday.length} label="due today" />
            <MetricCard icon="time" value={dashboard.dueThisWeek.length} label="due this week" tone="amber" />
            <MetricCard icon="calendar-outline" value={dashboard.comingUp.length} label="coming up" tone="blue" />
          </View>

          <SoftCard className="mx-5 mt-5 p-5">
            <SectionTitle
              title="People to follow up with"
              actionLabel="View all"
              onAction={() => router.push("/people")}
            />
            {dashboard.followUps.length === 0 ? (
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">
                No follow-ups need attention right now.
              </Text>
            ) : (
              dashboard.followUps.map((person, index) => (
                <View key={person.id}>
                  {index > 0 ? <View className="my-4 h-px bg-stone-200" /> : null}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${person.name}`}
                    onPress={() => router.push(`/people/${person.id}`)}
                    activeOpacity={0.76}
                    className="flex-row items-center"
                  >
                    <View className="mr-3 items-center">
                      <StatusDot status={statusDotForPerson(person)} />
                    </View>
                    <PersonAvatar name={person.name} imageUrl={personImageUrl(person)} size={62} />
                    <View className="ml-4 flex-1">
                      <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-lg">
                        {person.name}
                      </Text>
                      <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="mt-0.5 text-sm">
                        {person.relationship_type ?? person.company ?? "Relationship"}
                      </Text>
                      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                        {formatLastTalked(person.last_contacted_at)}
                      </Text>
                    </View>
                    <View className="mr-3 max-w-[34%] rounded-xl bg-mint px-4 py-3">
                      <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="text-sm leading-5">
                        {person.notes?.trim() || "Check in and see how things are going."}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </SoftCard>

          <View className="mt-5 flex-row gap-4 px-5">
            <SoftCard className="flex-1 p-4">
              <SectionTitle title="Upcoming birthdays" actionLabel="View all" onAction={() => router.push("/people")} />
              {dashboard.birthdays.length === 0 ? (
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">
                  No birthdays in the next month.
                </Text>
              ) : (
                dashboard.birthdays.map(({ person, daysUntil }, index) => (
                  <TouchableOpacity
                    key={person.id}
                    onPress={() => router.push(`/people/${person.id}`)}
                    className={`flex-row items-center ${index > 0 ? "mt-5" : ""}`}
                  >
                    <IconTile
                      icon="calendar-outline"
                      color={index === 0 ? colors.danger : index === 1 ? colors.purple : colors.amber}
                      background={index === 0 ? "#FDECE8" : index === 1 ? "#F2EEFA" : "#FFF3DE"}
                      size={52}
                    />
                    <View className="ml-3 flex-1">
                      <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} className="text-base">
                        {person.name}
                      </Text>
                      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                        {daysUntil === 0 ? "Today" : `In ${daysUntil} days`} · {formatBirthdayDate(person.birthday)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </SoftCard>

            <SoftCard className="flex-1 p-4">
              <SectionTitle title="Recent notes" actionLabel="View all" onAction={() => router.push("/people")} />
              {dashboard.recentNotes.length === 0 ? (
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">
                  Notes you log will appear here.
                </Text>
              ) : (
                dashboard.recentNotes.map(({ interaction, person }, index) => (
                  <View key={interaction.id} className={index > 0 ? "mt-5 border-t border-stone-200 pt-5" : ""}>
                    <TouchableOpacity
                      onPress={() => person && router.push(`/people/${person.id}`)}
                      activeOpacity={0.76}
                      className="flex-row"
                    >
                      <IconTile icon="document-text-outline" color={index === 0 ? colors.forest : colors.amber} background={index === 0 ? colors.mint : "#FFF3DE"} size={52} />
                      <View className="ml-3 flex-1">
                        <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} className="text-base">
                          {person ? `Note with ${person.name}` : "Recent note"}
                        </Text>
                        <Text style={{ fontFamily: fonts.body, color: colors.muted }} numberOfLines={2} className="mt-1 text-sm leading-5">
                          {interaction.notes}
                        </Text>
                        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm">
                          {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${interaction.date}T12:00:00`))}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </SoftCard>
          </View>

          <SoftCard className="mx-5 mt-5 p-5">
            <SectionTitle title="Your summary" />
            <View className="flex-row items-start">
              <SummaryStat icon="people" value={String(getTotalContacts(people))} label="Total contacts" />
              <SummaryDivider />
              <SummaryStat icon="chatbubble" value={String(getTotalInteractions(interactions))} label="Interactions logged" />
              <SummaryDivider />
              <SummaryStat icon="golf" value={dashboard.onTimeRate == null ? "-" : `${dashboard.onTimeRate}%`} label="On-time outreach" />
              <SummaryDivider />
              <SummaryStat
                icon="star"
                value={dashboard.mostContacted?.name.split(/\s+/).slice(0, 2).join(" ") ?? "-"}
                label="Most contacted"
              />
            </View>
            {settings?.current_streak ? (
              <Text style={{ fontFamily: fonts.medium, color: colors.amber }} className="mt-5 text-sm">
                {settings.current_streak} day streak
              </Text>
            ) : null}
          </SoftCard>
        </>
      )}
    </Screen>
  )
}

function MetricCard({
  icon,
  value,
  label,
  tone = "green",
}: {
  icon: keyof typeof Ionicons.glyphMap
  value: number
  label: string
  tone?: "green" | "amber" | "blue"
}) {
  const toneColors = {
    green: { bg: colors.mint, icon: colors.forest },
    amber: { bg: "#FFF3DE", icon: colors.amber },
    blue: { bg: "#EAF1FC", icon: colors.blue },
  }[tone]

  return (
    <SoftCard className="min-h-24 flex-1 flex-row items-center justify-center px-3">
      <View className="mr-3 h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: toneColors.bg }}>
        <Ionicons name={icon} size={28} color={toneColors.icon} />
      </View>
      <View>
        <Text style={{ fontFamily: fonts.bold, color: colors.forest }} className="text-3xl leading-8">
          {value}
        </Text>
        <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="mt-1 text-sm">
          {label}
        </Text>
      </View>
    </SoftCard>
  )
}

function SummaryStat({
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
      <Ionicons name={icon} size={27} color={colors.forest} />
      <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} adjustsFontSizeToFit className="mt-3 text-2xl">
        {value}
      </Text>
      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-center text-xs leading-4">
        {label}
      </Text>
    </View>
  )
}

function SummaryDivider() {
  return <View className="h-16 w-px bg-stone-200" />
}
