import { useCallback, useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { EmptyState } from "@/components/EmptyState"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import type { Person, Interaction, Settings } from "@/types"
import {
  categorizePeople,
  getBirthdayReminders,
  getMostContacted,
  getNeedsAttention,
  getNextDueDays,
  getOnTimeRate,
  getTotalContacts,
  getTotalInteractions,
  pluralize,
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
      const loaded = peopleRes.data ?? []
      setPeople(loaded)
      setSettings(settingsRes.data ?? null)

      if (loaded.length > 0) {
        const { data: ints } = await supabase
          .from("interactions")
          .select("*")
          .in(
            "person_id",
            loaded.map((p) => p.id),
          )
        setInteractions(ints ?? [])
      } else {
        setInteractions([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard")
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

  if (loading) return <LoadingState />

  if (people.length === 0) {
    return (
      <Screen>
        <View className="px-5 pt-6 pb-2">
          <Text className="text-2xl font-bold text-warm-black">{getGreeting(firstName)}</Text>
          <Text className="mt-2 text-sm text-gray-500">
            Keep close to the people who matter most.
          </Text>
        </View>
        {error && (
          <View className="px-5">
            <ErrorBanner message={error} />
          </View>
        )}
        <EmptyState
          title="No people yet"
          description="Add someone you want to stay in touch with to get started."
          actionLabel="Add someone"
          onAction={() => router.push("/people/new")}
        />
      </Screen>
    )
  }

  const { overdue, dueThisWeek, comingUp } = categorizePeople(people, new Date(), interactions)
  const birthdays = getBirthdayReminders(people, new Date(), 7)
  const reachOut = [...overdue, ...dueThisWeek].slice(0, 5)
  const streak = settings?.current_streak ?? 0
  const onTimeRate = getOnTimeRate(people)
  const mostContacted = getMostContacted(people, interactions)
  const needsAttention = getNeedsAttention(people)

  return (
    <Screen>
      <View className="px-5 pt-6 pb-2">
        <Text className="text-2xl font-bold text-warm-black">{getGreeting(firstName)}</Text>
        <Text className="mt-2 text-sm text-gray-500">
          Keep close to the people who matter most.
        </Text>
        {streak > 0 && (
          <View className="mt-3 self-start bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
            <Text className="text-xs font-semibold text-terracotta">Streak: {streak} days</Text>
          </View>
        )}
      </View>

      <View className="px-5 mt-4">
        {error && <ErrorBanner message={error} />}

        <View className="flex-row gap-3 mb-6">
          <DashboardStatButton
            label="Overdue"
            count={overdue.length}
            countClassName="text-terracotta"
            accessibilityLabel="Show overdue people"
            onPress={() => router.push("/people?status=overdue")}
          />
          <DashboardStatButton
            label="Due this week"
            count={dueThisWeek.length}
            countClassName="text-sage"
            accessibilityLabel="Show people due this week"
            onPress={() => router.push("/people?status=due_this_week")}
          />
          <DashboardStatButton
            label="Coming up"
            count={comingUp.length}
            countClassName="text-warm-black"
            accessibilityLabel="Show people coming up"
            onPress={() => router.push("/people?status=coming_up")}
          />
        </View>

        {reachOut.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-warm-black mb-3">Reach out</Text>
            {reachOut.map((person) => {
              const days = getNextDueDays(person)
              const isOverdue = days !== null && days < 0
              return (
                <TouchableOpacity
                  key={person.id}
                  onPress={() => router.push(`/people/${person.id}`)}
                  activeOpacity={0.7}
                >
                  <Card className="mb-2">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-3">
                        <Text className="text-sm font-semibold text-warm-black">{person.name}</Text>
                        {person.company != null && (
                          <Text className="text-xs text-gray-500 mt-0.5">{person.company}</Text>
                        )}
                      </View>
                      <View
                        className={`rounded-full px-2.5 py-1 ${
                          isOverdue ? "bg-red-50" : "bg-amber-50"
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            isOverdue ? "text-red-600" : "text-amber-700"
                          }`}
                        >
                          {isOverdue
                            ? `${pluralize(Math.abs(days!), "day")} overdue`
                            : `Due in ${pluralize(days!, "day")}`}
                        </Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <View className="mb-6">
          <Text className="text-base font-semibold text-warm-black mb-3">
            Upcoming birthdays
          </Text>
          {birthdays.length === 0 ? (
            <Card>
              <Text className="text-sm text-gray-500">No upcoming birthdays this week.</Text>
            </Card>
          ) : (
            birthdays.map(({ person, daysUntil }) => (
              <TouchableOpacity
                key={person.id}
                onPress={() => router.push(`/people/${person.id}`)}
                activeOpacity={0.7}
              >
                <Card className="mb-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-warm-black">{person.name}</Text>
                    <Text className="text-xs text-gray-500">
                      {daysUntil === 0 ? "Today" : `In ${pluralize(daysUntil, "day")}`}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View className="mb-8">
          <Text className="text-base font-semibold text-warm-black mb-3">Your Roots</Text>
          <View className="flex-row flex-wrap gap-3">
            <RootStat label="Total contacts" value={String(getTotalContacts(people))} />
            <RootStat label="Interactions logged" value={String(getTotalInteractions(interactions))} />
            <RootStat label="On-time rate" value={onTimeRate === null ? "-" : `${onTimeRate}%`} />
            <RootStat label="Most contacted" value={mostContacted?.name ?? "-"} />
            <RootStat label="Needs attention" value={needsAttention?.name ?? "-"} />
          </View>
        </View>
      </View>
    </Screen>
  )
}

function DashboardStatButton({
  label,
  count,
  countClassName,
  accessibilityLabel,
  onPress,
}: {
  label: string
  count: number
  countClassName: string
  accessibilityLabel: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm items-center"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text className={`text-2xl font-bold ${countClassName}`}>{count}</Text>
      <Text className="text-xs text-gray-500 mt-0.5 text-center">{label}</Text>
    </TouchableOpacity>
  )
}

function RootStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[30%] flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm">
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="mt-1 text-base font-semibold text-warm-black" numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}
