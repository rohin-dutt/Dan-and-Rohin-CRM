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
  getNextDueDays,
  pluralize,
} from "@roots/shared"

function getGreeting(firstName: string): string {
  const hour = new Date().getHours()
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  return `${time}, ${firstName}`
}

function SparseDashboardBanner({ count }: { count: number }) {
  return (
    <View className="mb-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <Text className="text-sm font-semibold text-sage mb-1">Building your network</Text>
      <Text className="text-xs text-gray-500">
        You have {count} {count === 1 ? "person" : "people"} added. Keep going — the more you add,
        the better Roots works for you.
      </Text>
    </View>
  )
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
      const meta = session.user.user_metadata
      const fullName: string = meta?.full_name || meta?.name || ""
      const derived = fullName.split(" ")[0] || session.user.email?.split("@")[0] || "there"
      setFirstName(derived)

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
        </View>
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
  const birthdays = getBirthdayReminders(people)
  const reachOut = [...overdue, ...dueThisWeek].slice(0, 5)
  const streak = settings?.current_streak ?? 0

  return (
    <Screen>
      <View className="px-5 pt-6 pb-2">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-2xl font-bold text-warm-black">{getGreeting(firstName)}</Text>
          {streak > 0 && (
            <View className="bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
              <Text className="text-xs font-semibold text-terracotta">🔥 {streak} day streak</Text>
            </View>
          )}
        </View>
      </View>

      <View className="px-5 mt-4">
        {people.length >= 1 && people.length <= 3 && (
          <SparseDashboardBanner count={people.length} />
        )}

        {error && <ErrorBanner message={error} />}

        {/* Stat cards */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm items-center">
            <Text className="text-2xl font-bold text-terracotta">{overdue.length}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Overdue</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm items-center">
            <Text className="text-2xl font-bold text-sage">{dueThisWeek.length}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Due This Week</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm items-center">
            <Text className="text-2xl font-bold text-warm-black">{comingUp.length}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Coming Up</Text>
          </View>
        </View>

        {/* Reach out */}
        {reachOut.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-warm-black mb-3">Reach out ({reachOut.length})</Text>
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

        {/* Birthdays */}
        {birthdays.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold text-warm-black mb-3">
              Birthdays ({birthdays.length})
            </Text>
            {birthdays.map(({ person, daysUntil }) => (
              <TouchableOpacity
                key={person.id}
                onPress={() => router.push(`/people/${person.id}`)}
                activeOpacity={0.7}
              >
                <Card className="mb-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-warm-black">{person.name}</Text>
                    <Text className="text-xs text-gray-500">
                      {daysUntil === 0 ? "Today! 🎂" : `In ${pluralize(daysUntil, "day")}`}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Screen>
  )
}
