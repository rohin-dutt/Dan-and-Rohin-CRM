import { useCallback, useState } from "react"
import { Alert, Text, TouchableOpacity, View } from "react-native"
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { Button } from "@/components/Button"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import type { Person, Interaction, Tag } from "@/types"
import { formatDate, formatShortDate, getNextDueDays, getFollowUpState } from "@roots/shared"

type PersonTagRow = {
  tags: Tag | Tag[] | null
}

function getTagFromJoin(row: PersonTagRow): Tag | null {
  if (Array.isArray(row.tags)) return row.tags[0] ?? null
  return row.tags
}

export default function PersonDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [person, setPerson] = useState<Person | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [personRes, interactionsRes, tagsRes] = await Promise.all([
        supabase.from("people").select("*").eq("id", id).single(),
        supabase
          .from("interactions")
          .select("*")
          .eq("person_id", id)
          .order("date", { ascending: false }),
        supabase.from("person_tags").select("tag_id, tags(*)").eq("person_id", id),
      ])
      if (personRes.error) throw personRes.error
      setPerson(personRes.data)
      setInteractions(interactionsRes.data ?? [])
      setTags(
        ((tagsRes.data ?? []) as PersonTagRow[])
          .map(getTagFromJoin)
          .filter((tag): tag is Tag => tag != null),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load person")
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load]),
  )

  function showMenu() {
    Alert.alert(person?.name ?? "Options", undefined, [
      { text: "Edit", onPress: () => router.push(`/people/${id}/edit`) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete person", `Delete ${person?.name}? This cannot be undone.`, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                await supabase.from("people").delete().eq("id", id)
                router.back()
              },
            },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ])
  }

  async function markFollowUpDone(interactionId: string) {
    await supabase
      .from("interactions")
      .update({ follow_up_status: "done" })
      .eq("id", interactionId)
    load()
  }

  async function snoozeFollowUp(interactionId: string) {
    const snoozeDate = new Date()
    snoozeDate.setDate(snoozeDate.getDate() + 7)
    const snoozedUntil = snoozeDate.toISOString().split("T")[0]
    await supabase
      .from("interactions")
      .update({ follow_up_status: "snoozed", follow_up_snoozed_until: snoozedUntil })
      .eq("id", interactionId)
    load()
  }

  if (loading) return <LoadingState />

  if (!person) {
    return (
      <Screen>
        <ErrorBanner message={error ?? "Person not found"} />
      </Screen>
    )
  }

  const nextDueDays = getNextDueDays(person)
  const openFollowUps = interactions.filter(
    (i) => i.follow_up_needed && getFollowUpState(i) !== "done",
  )

  const detailFields = [
    person.email != null && { label: "Email", value: person.email },
    person.phone != null && { label: "Phone", value: person.phone },
    person.birthday != null && { label: "Birthday", value: formatDate(person.birthday) },
    person.how_met != null && { label: "How met", value: person.how_met },
    person.location != null && { label: "Location", value: person.location },
  ].filter((f): f is { label: string; value: string } => Boolean(f))

  return (
    <Screen>
      {/* Header row */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="py-1 pr-3">
          <Text className="text-sage text-sm font-semibold">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={showMenu} className="py-1 pl-3">
          <Text className="text-2xl text-warm-black leading-none">...</Text>
        </TouchableOpacity>
      </View>

      <View className="px-5 pb-8">
        {error != null && <ErrorBanner message={error} />}

        {/* Name + role/company */}
        <Text className="text-2xl font-bold text-warm-black mb-1">{person.name}</Text>
        {(person.role != null || person.company != null) && (
          <Text className="text-sm text-gray-500 mb-3">
            {[person.role, person.company].filter(Boolean).join(" - ")}
          </Text>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-4">
            {tags.map((tag) => (
              <View
                key={tag.id}
                className="rounded-full bg-green-50 border border-green-200 px-3 py-1"
              >
                <Text className="text-xs font-medium text-green-700">{tag.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Stat cards */}
        <View className="flex-row gap-3 mb-5">
          <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm items-center">
            <Text className="text-sm font-bold text-warm-black" numberOfLines={1}>
              {nextDueDays === null
                ? "-"
                : nextDueDays < 0
                  ? `${Math.abs(nextDueDays)}d ago`
                  : `In ${nextDueDays}d`}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">Next step</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm items-center">
            <Text className="text-sm font-bold text-warm-black" numberOfLines={1}>
              {formatShortDate(person.last_contacted_at)}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">Last chat</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl border border-gray-100 p-3 shadow-sm items-center">
            <Text className="text-sm font-bold text-warm-black">{openFollowUps.length}</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Follow-ups</Text>
          </View>
        </View>

        {/* Log a chat */}
        <Button
          title="Log a chat"
          onPress={() => router.push(`/people/${id}/log`)}
          variant="primary"
        />

        {/* Collapsible details */}
        {detailFields.length > 0 && (
          <>
            <TouchableOpacity
              onPress={() => setDetailsExpanded((v) => !v)}
              className="mt-5 mb-2 flex-row items-center justify-between"
            >
              <Text className="text-sm font-semibold text-warm-black">Details</Text>
              <Text className="text-xs text-gray-500">{detailsExpanded ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
            {detailsExpanded && (
              <Card className="mb-2">
                {detailFields.map((field, i) => (
                  <View key={field.label} className={i > 0 ? "mt-3 pt-3 border-t border-gray-100" : ""}>
                    <Text className="text-xs text-gray-400">{field.label}</Text>
                    <Text className="text-sm text-warm-black mt-0.5">{field.value}</Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {/* Notes */}
        {person.notes != null && (
          <View className="mt-4">
            <Text className="text-sm font-semibold text-warm-black mb-2">Notes</Text>
            <Card>
              <Text className="text-sm text-warm-black">{person.notes}</Text>
            </Card>
          </View>
        )}

        {/* Open follow-ups */}
        {openFollowUps.length > 0 && (
          <View className="mt-5">
            <Text className="text-sm font-semibold text-warm-black mb-2">Follow-ups</Text>
            {openFollowUps.map((fu) => (
              <Card key={fu.id} className="mb-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-sm font-medium text-warm-black">{fu.type}</Text>
                    {fu.follow_up_date != null && (
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {formatDate(fu.follow_up_date)}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => snoozeFollowUp(fu.id)}
                      className="bg-gray-100 rounded-lg px-2.5 py-1.5"
                    >
                      <Text className="text-xs text-gray-600">Snooze 7d</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => markFollowUpDone(fu.id)}
                      className="bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-green-700">Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Interaction history */}
        {interactions.length > 0 && (
          <View className="mt-5">
            <Text className="text-sm font-semibold text-warm-black mb-2">Your history</Text>
            {interactions.map((interaction) => (
              <Card key={interaction.id} className="mb-2">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-xs font-semibold text-sage">{interaction.type}</Text>
                  <Text className="text-xs text-gray-400">{formatDate(interaction.date)}</Text>
                  {interaction.follow_up_needed && interaction.follow_up_status !== "done" && (
                    <View className="rounded-full bg-amber-50 px-2 py-0.5">
                      <Text className="text-xs text-amber-700">Follow-up</Text>
                    </View>
                  )}
                </View>
                {interaction.notes != null && (
                  <Text className="text-sm text-warm-black">{interaction.notes}</Text>
                )}
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  )
}
