import { useState, useCallback } from "react"
import { View, Text, TouchableOpacity } from "react-native"
import { useFocusEffect } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { LoadingState } from "@/components/LoadingState"
import { EmptyState } from "@/components/EmptyState"
import {
  categorizePeople,
  getBirthdayReminders,
  formatDate,
} from "@roots/shared"
import type { Person, Interaction, Settings } from "@/types"

function getGreeting(firstName: string): string {
  const hour = new Date().getHours()
  const timeGreet =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  return firstName ? `${timeGreet}, ${firstName}` : timeGreet
}

function StatusBadge({ status }: { status: string }) {
  const isOverdue = status === "overdue"
  return (
    <View style={{
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: isOverdue ? "#FEE2E2" : "#FEF3C7",
    }}>
      <Text style={{
        fontSize: 11,
        fontWeight: "600",
        color: isOverdue ? "#DC2626" : "#D97706",
      }}>
        {isOverdue ? "Overdue" : "Due Soon"}
      </Text>
    </View>
  )
}

function StatCard({
  label,
  count,
  tintColor,
}: {
  label: string
  count: number
  tintColor: string
}) {
  return (
    <Card style={{ flex: 1, alignItems: "center", paddingVertical: 14, backgroundColor: tintColor }}>
      <Text style={{ fontSize: 28, fontWeight: "700", color: "#1C1917" }}>{count}</Text>
      <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2, textAlign: "center" }}>{label}</Text>
    </Card>
  )
}

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState("")
  const [streak, setStreak] = useState(0)
  const [overdue, setOverdue] = useState<Person[]>([])
  const [dueThisWeek, setDueThisWeek] = useState<Person[]>([])
  const [comingUp, setComingUp] = useState<Person[]>([])
  const [reachOut, setReachOut] = useState<Person[]>([])
  const [birthdays, setBirthdays] = useState<{ person: Person; daysUntil: number }[]>([])
  const [totalPeople, setTotalPeople] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const userId = session.user.id
      const meta = session.user.user_metadata as { first_name?: string; name?: string } | null
      const first = meta?.first_name ?? meta?.name?.split(" ")[0] ?? ""
      setFirstName(first)

      const [peopleRes, interactionsRes, settingsRes] = await Promise.all([
        supabase.from("people").select("*").eq("user_id", userId),
        supabase
          .from("interactions")
          .select("*")
          .eq("follow_up_needed", true)
          .neq("follow_up_status", "done"),
        supabase.from("settings").select("current_streak").eq("user_id", userId).single(),
      ])

      const people: Person[] = peopleRes.data ?? []
      const interactions: Interaction[] = interactionsRes.data ?? []
      const settings = settingsRes.data as Settings | null

      setTotalPeople(people.length)
      setStreak(settings?.current_streak ?? 0)

      const categories = categorizePeople(people, new Date(), interactions)
      setOverdue(categories.overdue)
      setDueThisWeek(categories.dueThisWeek)
      setComingUp(categories.comingUp)
      setReachOut([...categories.overdue, ...categories.dueThisWeek])

      const upcoming = getBirthdayReminders(people, new Date(), 30)
      setBirthdays(upcoming)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [fetchData])
  )

  if (loading) return <LoadingState />

  if (totalPeople === 0) {
    return (
      <Screen scroll={false}>
        <EmptyState
          title="Welcome to Roots"
          body="Add your first person to get started."
          actionLabel="Add someone"
          onAction={() => {
            // navigation wired in Phase 7
          }}
        />
      </Screen>
    )
  }

  const isSparse = totalPeople <= 3 && overdue.length === 0 && dueThisWeek.length === 0

  return (
    <Screen scroll>
      {/* Header */}
      <View style={{ marginBottom: 20, marginTop: 8 }}>
        <Text style={{ fontSize: 26, fontWeight: "700", color: "#1C1917", fontFamily: "Georgia" }}>
          Home
        </Text>
        <Text style={{ fontSize: 15, color: "#6B7280", marginTop: 2 }}>
          {getGreeting(firstName)}
        </Text>
        {streak > 0 && (
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 8,
            alignSelf: "flex-start",
            backgroundColor: "#FEF3C7",
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 4,
          }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#D97706" }}>
              🔥 {streak} day streak
            </Text>
          </View>
        )}
      </View>

      {/* Sparse banner */}
      {isSparse && (
        <View style={{
          backgroundColor: "#F0FDF4",
          borderRadius: 10,
          padding: 14,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: "#BBF7D0",
        }}>
          <Text style={{ fontSize: 13, color: "#15803D", lineHeight: 18 }}>
            Great start — Roots gets more useful as you add people. 🌱
          </Text>
        </View>
      )}

      {/* Stat cards */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
        <StatCard label="Overdue" count={overdue.length} tintColor="#FEF2F2" />
        <StatCard label="Due This Week" count={dueThisWeek.length} tintColor="#FFFBEB" />
        <StatCard label="Coming Up" count={comingUp.length} tintColor="#F0F9FF" />
      </View>

      {/* Reach out section */}
      {reachOut.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#1C1917", marginBottom: 12 }}>
            Reach out
          </Text>
          <View style={{ gap: 10 }}>
            {reachOut.map((person) => {
              const isOverdue = overdue.some((p) => p.id === person.id)
              return (
                <Card key={person.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#1C1917" }}>
                      {person.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                      Last talked: {formatDate(person.last_contacted_at)}
                    </Text>
                  </View>
                  <StatusBadge status={isOverdue ? "overdue" : "due_this_week"} />
                </Card>
              )
            })}
          </View>
        </View>
      )}

      {/* Birthdays section */}
      {birthdays.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#1C1917", marginBottom: 12 }}>
            Upcoming birthdays
          </Text>
          <View style={{ gap: 10 }}>
            {birthdays.map(({ person, daysUntil }) => (
              <Card key={person.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#1C1917" }}>
                  {person.name}
                </Text>
                <Text style={{ fontSize: 13, color: "#6B7280" }}>
                  {daysUntil === 0 ? "Today 🎂" : `in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`}
                </Text>
              </Card>
            ))}
          </View>
        </View>
      )}
    </Screen>
  )
}
