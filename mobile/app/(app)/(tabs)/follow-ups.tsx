import { useState, useCallback } from "react"
import { View, Text, TouchableOpacity, Alert, SectionList } from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { LoadingState } from "@/components/LoadingState"
import { formatDate, getFollowUpState } from "@roots/shared"
import type { Interaction } from "@/types"

type FollowUpInteraction = Interaction & {
  people: { id: string; name: string } | null
}

type SectionData = {
  title: string
  titleColor: string
  data: FollowUpInteraction[]
}

const SECTION_COLORS: Record<string, string> = {
  Overdue: "#DC2626",
  "Due today": "#DC2626",
  "Due soon": "#D97706",
  "Coming up": "#0284C7",
  Snoozed: "#9CA3AF",
}

const STATUS_BG: Record<string, { bg: string; text: string }> = {
  Overdue: { bg: "#FEE2E2", text: "#DC2626" },
  "Due today": { bg: "#FEE2E2", text: "#DC2626" },
  "Due soon": { bg: "#FEF3C7", text: "#D97706" },
  "Coming up": { bg: "#E0F2FE", text: "#0284C7" },
  Snoozed: { bg: "#F3F4F6", text: "#6B7280" },
}

function groupInteractions(interactions: FollowUpInteraction[]): SectionData[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysOut = new Date(today)
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)

  const overdue: FollowUpInteraction[] = []
  const dueToday: FollowUpInteraction[] = []
  const dueSoon: FollowUpInteraction[] = []
  const comingUp: FollowUpInteraction[] = []
  const snoozed: FollowUpInteraction[] = []

  for (const item of interactions) {
    const state = getFollowUpState(item, today)
    if (state === "overdue") overdue.push(item)
    else if (state === "due_today") dueToday.push(item)
    else if (state === "snoozed") snoozed.push(item)
    else {
      const dueDate = item.follow_up_date ? new Date(item.follow_up_date) : null
      if (dueDate && dueDate <= sevenDaysOut) dueSoon.push(item)
      else comingUp.push(item)
    }
  }

  const sections: SectionData[] = []
  if (overdue.length > 0)
    sections.push({ title: "Overdue", titleColor: SECTION_COLORS.Overdue, data: overdue })
  if (dueToday.length > 0)
    sections.push({ title: "Due today", titleColor: SECTION_COLORS["Due today"], data: dueToday })
  if (dueSoon.length > 0)
    sections.push({ title: "Due soon", titleColor: SECTION_COLORS["Due soon"], data: dueSoon })
  if (comingUp.length > 0)
    sections.push({ title: "Coming up", titleColor: SECTION_COLORS["Coming up"], data: comingUp })
  if (snoozed.length > 0)
    sections.push({ title: "Snoozed", titleColor: SECTION_COLORS.Snoozed, data: snoozed })

  return sections
}

export default function FollowUpsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<SectionData[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("interactions")
        .select("*, people(id, name)")
        .eq("follow_up_needed", true)
        .neq("follow_up_status", "done")
        .order("follow_up_date", { ascending: true })

      const items = (data ?? []) as FollowUpInteraction[]
      setSections(groupInteractions(items))
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [fetchData])
  )

  async function handleMarkDone(interaction: FollowUpInteraction) {
    await supabase
      .from("interactions")
      .update({ follow_up_status: "done" })
      .eq("id", interaction.id)
    Alert.alert("Done", "Follow-up marked as done.")
    fetchData()
  }

  if (loading) return <LoadingState />

  const isEmpty = sections.length === 0

  return (
    <Screen scroll={false} padding={false}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 26, fontWeight: "700", color: "#1C1917", fontFamily: "Georgia" }}>
          Follow-ups
        </Text>
      </View>

      {isEmpty ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🌱</Text>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#1C1917", textAlign: "center", marginBottom: 6 }}>
            You're all caught up
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center" }}>
            No open follow-ups right now.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={{
              fontSize: 13,
              fontWeight: "700",
              color: section.titleColor,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginTop: 20,
              marginBottom: 8,
            }}>
              {section.title}
            </Text>
          )}
          renderItem={({ item, section }) => {
            const colors = STATUS_BG[section.title] ?? STATUS_BG["Coming up"]
            const personName = item.people?.name ?? "Unknown person"
            const dueDateLabel = item.follow_up_date
              ? formatDate(item.follow_up_date)
              : "No date"
            const isActive =
              item.follow_up_needed && item.follow_up_status !== "done" && item.follow_up_status !== "snoozed"

            return (
              <Card style={{ marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={() => router.push(`/people/${item.people?.id ?? ""}`)}
                  activeOpacity={0.7}
                  disabled={!item.people?.id}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#1C1917" }}>{personName}</Text>
                    <View style={{
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      backgroundColor: colors.bg,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.text }}>
                        {section.title}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    {item.type} · {formatDate(item.date)}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
                    Follow-up: {dueDateLabel}
                  </Text>
                </TouchableOpacity>
                {isActive && (
                  <TouchableOpacity
                    onPress={() => handleMarkDone(item)}
                    style={{
                      marginTop: 10,
                      borderRadius: 6,
                      paddingVertical: 7,
                      backgroundColor: "#DCFCE7",
                      borderWidth: 1,
                      borderColor: "#86EFAC",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#16A34A" }}>Mark done</Text>
                  </TouchableOpacity>
                )}
              </Card>
            )
          }}
        />
      )}
    </Screen>
  )
}
