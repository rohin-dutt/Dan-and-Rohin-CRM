import { useState, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native"
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/Card"
import { LoadingState } from "@/components/LoadingState"
import { Button } from "@/components/Button"
import {
  formatDate,
  getNextDueDays,
  pluralize,
  getFollowUpState,
} from "@roots/shared"
import type { Person, Interaction, Tag } from "@/types"
import { useSafeAreaInsets } from "react-native-safe-area-context"

function nextActionText(person: Person): string {
  const days = getNextDueDays(person)
  if (days === null) return "Log the first interaction"
  if (days < 0) return `Reach out now, overdue by ${pluralize(Math.abs(days), "day")}`
  if (days === 0) return "Reach out today"
  return `Reach out in ${pluralize(days, "day")}`
}

function TagPill({ tag }: { tag: Tag }) {
  return (
    <View style={{
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: tag.color + "33",
      borderWidth: 1,
      borderColor: tag.color,
      marginRight: 6,
      marginBottom: 6,
    }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: tag.color }}>{tag.name}</Text>
    </View>
  )
}

function followUpStateLabel(interaction: Interaction): string {
  const state = getFollowUpState(interaction)
  const date = interaction.follow_up_date
  const snoozedUntil = interaction.follow_up_snoozed_until
  if (state === "overdue") return `Overdue since ${formatDate(date)}`
  if (state === "due_today") return "Due today"
  if (state === "due") return `Due on ${formatDate(date)}`
  if (state === "snoozed") return `Snoozed until ${formatDate(snoozedUntil)}`
  return ""
}

function InteractionRow({
  interaction,
  onMarkDone,
  onSnooze,
}: {
  interaction: Interaction
  onMarkDone: () => void
  onSnooze: () => void
}) {
  const state = getFollowUpState(interaction)
  const hasActiveFollowUp =
    interaction.follow_up_needed &&
    interaction.follow_up_status !== "done" &&
    interaction.follow_up_status !== "snoozed"
  const hasAnyFollowUp =
    interaction.follow_up_needed && interaction.follow_up_status !== "done"

  const stateColor =
    state === "overdue" || state === "due_today"
      ? { bg: "#FEE2E2", text: "#DC2626" }
      : state === "snoozed"
      ? { bg: "#F3F4F6", text: "#6B7280" }
      : { bg: "#FEF3C7", text: "#D97706" }

  return (
    <View style={{
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#E5E0D8",
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1C1917" }}>
          {interaction.type}
        </Text>
        <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{formatDate(interaction.date)}</Text>
      </View>
      {interaction.notes ? (
        <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }} numberOfLines={2}>
          {interaction.notes}
        </Text>
      ) : null}
      {hasAnyFollowUp && (
        <View style={{
          marginTop: 6,
          alignSelf: "flex-start",
          backgroundColor: stateColor.bg,
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: stateColor.text }}>
            {followUpStateLabel(interaction)}
          </Text>
        </View>
      )}
      {hasActiveFollowUp && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            onPress={onMarkDone}
            style={{
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: "#DCFCE7",
              borderWidth: 1,
              borderColor: "#86EFAC",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#16A34A" }}>Mark done</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSnooze}
            style={{
              borderRadius: 6,
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: "#F3F4F6",
              borderWidth: 1,
              borderColor: "#D1D5DB",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280" }}>Snooze 7 days</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [loading, setLoading] = useState(true)
  const [person, setPerson] = useState<Person | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [personRes, interactionsRes, personTagsRes] = await Promise.all([
        supabase.from("people").select("*").eq("id", id).single(),
        supabase
          .from("interactions")
          .select("*")
          .eq("person_id", id)
          .order("date", { ascending: false }),
        supabase
          .from("person_tags")
          .select("tag_id, tags(*)")
          .eq("person_id", id),
      ])

      if (personRes.error || !personRes.data) {
        setNotFound(true)
        return
      }

      setPerson(personRes.data as Person)
      setInteractions((interactionsRes.data as Interaction[]) ?? [])

      const tagData: Tag[] = (personTagsRes.data ?? [])
        .map((pt: { tags: unknown }) => pt.tags)
        .filter(Boolean) as Tag[]
      setTags(tagData)
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [fetchData])
  )

  async function handleMarkDone(interactionId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase
      .from("interactions")
      .update({ follow_up_status: "done" })
      .eq("id", interactionId)
    Alert.alert("Done", "Follow-up marked as done.")
    fetchData()
  }

  async function handleSnooze(interactionId: string) {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    const snoozedUntil = d.toISOString().slice(0, 10)
    await supabase
      .from("interactions")
      .update({ follow_up_status: "snoozed", follow_up_snoozed_until: snoozedUntil })
      .eq("id", interactionId)
    Alert.alert("Snoozed", `Follow-up snoozed until ${snoozedUntil}.`)
    fetchData()
  }

  async function handleDelete() {
    if (!person || !id) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase
      .from("people")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id)
    router.back()
  }

  function showMenu() {
    if (!person) return
    Alert.alert(person.name, undefined, [
      { text: "Edit", onPress: () => router.push(`/people/${id}/edit`) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            `Delete ${person.name}?`,
            "This will permanently delete this person and all their history.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: handleDelete },
            ]
          ),
      },
      { text: "Cancel", style: "cancel" },
    ])
  }

  if (loading) return <LoadingState />

  if (notFound || !person) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F0EBE1", paddingTop: insets.top, padding: 24 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, color: "#7C9A7E", fontWeight: "600" }}>← People</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, color: "#6B7280" }}>Person not found.</Text>
      </View>
    )
  }

  const lastInteraction = interactions[0] ?? null
  const activeFollowUps = interactions.filter(
    (i) => i.follow_up_needed && i.follow_up_status !== "done"
  )

  const detailFields: { label: string; value: string | null | undefined }[] = [
    { label: "Location", value: person.location },
    { label: "Birthday", value: person.birthday ? formatDate(person.birthday) : null },
    { label: "How we met", value: person.how_met },
    { label: "Email", value: person.email },
    { label: "Phone", value: person.phone },
    { label: "Relationship type", value: person.relationship_type },
  ].filter((f) => f.value)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F0EBE1" }}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
    >
      {/* Header row: back + menu */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, marginTop: 8 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 15, color: "#7C9A7E", fontWeight: "600" }}>← People</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={showMenu} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 22, color: "#6B7280", fontWeight: "600" }}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Name + subtitle */}
      <Text style={{ fontSize: 28, fontWeight: "700", color: "#1C1917", fontFamily: "Georgia", marginBottom: 4 }}>
        {person.name}
      </Text>
      {(person.role || person.company) && (
        <Text style={{ fontSize: 15, color: "#6B7280", marginBottom: 12 }}>
          {[person.role, person.company].filter(Boolean).join(" at ")}
        </Text>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
          {tags.map((tag) => <TagPill key={tag.id} tag={tag} />)}
        </View>
      )}

      {/* Stat cards */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        <Card style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Next step</Text>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#1C1917", textAlign: "center" }}>
            {nextActionText(person)}
          </Text>
        </Card>
        <Card style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Last chat</Text>
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#1C1917", textAlign: "center" }}>
            {lastInteraction
              ? `${lastInteraction.type} · ${formatDate(lastInteraction.date)}`
              : "None yet"}
          </Text>
        </Card>
        <Card style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
          <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>Follow-ups</Text>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#1C1917" }}>
            {activeFollowUps.length}
          </Text>
        </Card>
      </View>

      {/* View details toggle */}
      {detailFields.length > 0 && (
        <TouchableOpacity
          onPress={() => setDetailsExpanded((v) => !v)}
          style={{ marginBottom: 12 }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#7C9A7E" }}>
            {detailsExpanded ? "Hide details ↑" : "View details ↓"}
          </Text>
        </TouchableOpacity>
      )}
      {detailsExpanded && (
        <Card style={{ marginBottom: 16, gap: 10 }}>
          {detailFields.map(({ label, value }) => (
            <View key={label}>
              <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>{label.toUpperCase()}</Text>
              <Text style={{ fontSize: 14, color: "#1C1917", marginTop: 2 }}>{value}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Notes */}
      {person.notes ? (
        <Card style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280", marginBottom: 6 }}>
            NOTES
          </Text>
          <Text style={{ fontSize: 14, color: "#1C1917", lineHeight: 20 }}>{person.notes}</Text>
        </Card>
      ) : null}

      {/* Log a chat button */}
      <View style={{ marginBottom: 28 }}>
        <Button
          title="Log a chat"
          onPress={() => router.push(`/people/${id}/log`)}
        />
      </View>

      {/* Interaction history */}
      <Text style={{ fontSize: 17, fontWeight: "700", color: "#1C1917", marginBottom: 12 }}>
        Your history
      </Text>
      {interactions.length === 0 ? (
        <Text style={{ fontSize: 14, color: "#9CA3AF", fontStyle: "italic" }}>
          No history yet — log your first conversation
        </Text>
      ) : (
        <Card style={{ padding: 0, paddingHorizontal: 16 }}>
          {interactions.map((interaction) => (
            <InteractionRow
              key={interaction.id}
              interaction={interaction}
              onMarkDone={() => handleMarkDone(interaction.id)}
              onSnooze={() => handleSnooze(interaction.id)}
            />
          ))}
        </Card>
      )}
    </ScrollView>
  )
}
