import { useCallback, useState } from "react"
import { SectionList, Text, TouchableOpacity, View } from "react-native"
import { useFocusEffect } from "expo-router"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { EmptyState } from "@/components/EmptyState"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import type { Interaction } from "@/types"
import { getFollowUpQueue, formatDate } from "@roots/shared"

type FollowUpItem = Interaction & { personName: string }
type Section = { title: string; data: FollowUpItem[] }

const SECTION_BADGE: Record<string, { bgClass: string; textClass: string }> = {
  Overdue: { bgClass: "bg-red-50", textClass: "text-red-600" },
  "Due today": { bgClass: "bg-amber-50", textClass: "text-amber-700" },
  "Due soon": { bgClass: "bg-blue-50", textClass: "text-blue-600" },
  "Coming up": { bgClass: "bg-gray-100", textClass: "text-gray-600" },
  Snoozed: { bgClass: "bg-purple-50", textClass: "text-purple-600" },
}

export default function FollowUpsScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sections, setSections] = useState<Section[]>([])

  const load = useCallback(async () => {
    try {
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const { data: people } = await supabase
        .from("people")
        .select("id, name")
        .eq("user_id", session.user.id)

      if (!people?.length) {
        setSections([])
        return
      }

      const { data: interactions } = await supabase
        .from("interactions")
        .select("*")
        .in(
          "person_id",
          people.map((p) => p.id),
        )
        .eq("follow_up_needed", true)

      const peopleMap = new Map(people.map((p) => [p.id, p.name]))
      const items: FollowUpItem[] = (interactions ?? []).map((i) => ({
        ...i,
        personName: peopleMap.get(i.person_id) ?? "Unknown",
      }))

      const queue = getFollowUpQueue(items)
      const today = new Date()

      const dueSoon = (queue.due as FollowUpItem[]).filter((i) => {
        if (!i.follow_up_date) return true
        const diff = Math.ceil(
          (new Date(i.follow_up_date).getTime() - today.getTime()) / 86400000,
        )
        return diff <= 7
      })
      const comingUp = (queue.due as FollowUpItem[]).filter((i) => {
        if (!i.follow_up_date) return false
        const diff = Math.ceil(
          (new Date(i.follow_up_date).getTime() - today.getTime()) / 86400000,
        )
        return diff > 7
      })

      const built: Section[] = [
        { title: "Overdue", data: queue.overdue as FollowUpItem[] },
        { title: "Due today", data: queue.due_today as FollowUpItem[] },
        { title: "Due soon", data: dueSoon },
        { title: "Coming up", data: comingUp },
        { title: "Snoozed", data: queue.snoozed as FollowUpItem[] },
      ].filter((s) => s.data.length > 0)

      setSections(built)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load follow-ups")
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

  async function markDone(interactionId: string) {
    await supabase
      .from("interactions")
      .update({ follow_up_status: "done" })
      .eq("id", interactionId)
    load()
  }

  if (loading) return <LoadingState />

  const hasItems = sections.length > 0

  return (
    <Screen scrollable={false}>
      <View className="px-5 pt-6 pb-2">
        <Text className="text-2xl font-bold text-warm-black">Follow-ups</Text>
      </View>

      {error && (
        <View className="px-5">
          <ErrorBanner message={error} />
        </View>
      )}

      {!hasItems ? (
        <EmptyState
          title="You're all caught up 🌱"
          description="No open follow-ups right now."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => {
            const badge = SECTION_BADGE[section.title]
            return (
              <View className="mt-4 mb-2 flex-row items-center gap-2">
                <Text className="text-sm font-semibold text-warm-black">{section.title}</Text>
                {badge && (
                  <View className={`rounded-full px-2 py-0.5 ${badge.bgClass}`}>
                    <Text className={`text-xs font-medium ${badge.textClass}`}>
                      {section.data.length}
                    </Text>
                  </View>
                )}
              </View>
            )
          }}
          renderItem={({ item, section }) => {
            const isOverdue = section.title === "Overdue"
            return (
              <Card className="mb-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-sm font-semibold text-warm-black">
                      {item.personName}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">{item.type}</Text>
                    {item.follow_up_date != null && (
                      <Text
                        className={`text-xs mt-0.5 ${isOverdue ? "text-red-500" : "text-gray-400"}`}
                      >
                        {formatDate(item.follow_up_date)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => markDone(item.id)}
                    className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5"
                  >
                    <Text className="text-xs font-semibold text-green-700">Done</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )
          }}
        />
      )}
    </Screen>
  )
}
