import { useState, useCallback } from "react"
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native"
import { useFocusEffect } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { LoadingState } from "@/components/LoadingState"
import { EmptyState } from "@/components/EmptyState"
import { getRelationshipStatus, formatDate } from "@roots/shared"
import type { Person } from "@/types"

const STATUS_LABELS: Record<string, string> = {
  overdue: "Overdue",
  due_this_week: "Due This Week",
  recent: "Recently Talked",
  neglected: "Neglected",
  coming_up: "Coming Up",
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  overdue: { bg: "#FEE2E2", text: "#DC2626" },
  due_this_week: { bg: "#FEF3C7", text: "#D97706" },
  recent: { bg: "#DCFCE7", text: "#16A34A" },
  neglected: { bg: "#F3F4F6", text: "#6B7280" },
  coming_up: { bg: "#E0F2FE", text: "#0284C7" },
}

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.coming_up
  const label = STATUS_LABELS[status] ?? status
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.text }}>{label}</Text>
    </View>
  )
}

function PersonCard({ person, onPress }: { person: Person; onPress: () => void }) {
  const status = getRelationshipStatus(person)
  const subtitle =
    person.role && person.company
      ? `${person.role} at ${person.company}`
      : person.role ?? person.company ?? "No details yet"

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1C1917" }}>{person.name}</Text>
            <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{subtitle}</Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
              Last talked: {formatDate(person.last_contacted_at)}
            </Text>
          </View>
          <StatusBadge status={status} />
        </View>
      </Card>
    </TouchableOpacity>
  )
}

export default function PeopleScreen() {
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState<Person[]>([])
  const [query, setQuery] = useState("")

  const fetchPeople = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", session.user.id)
        .order("name", { ascending: true })
      setPeople((data as Person[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchPeople()
    }, [fetchPeople])
  )

  const filtered = query.trim()
    ? people.filter((p) => {
        const q = query.toLowerCase()
        return (
          p.name.toLowerCase().includes(q) ||
          (p.company ?? "").toLowerCase().includes(q) ||
          (p.notes ?? "").toLowerCase().includes(q)
        )
      })
    : people

  if (loading) return <LoadingState />

  return (
    <Screen scroll={false} padding={false}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: "700", color: "#1C1917", fontFamily: "Georgia" }}>
              Your people
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
              {people.length} {people.length === 1 ? "person" : "people"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Alert.alert("Add someone", "Navigation coming in Phase 7")}
            style={{
              backgroundColor: "#7C9A7E",
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, company, or notes…"
          placeholderTextColor="#9CA3AF"
          style={{
            height: 40,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#E5E0D8",
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 12,
            fontSize: 14,
            color: "#1C1917",
            marginTop: 12,
          }}
        />
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          title={query ? "No results" : "No people yet"}
          body={query ? "Try a different search." : "Add your first person to get started."}
          actionLabel={!query ? "Add someone" : undefined}
          onAction={!query ? () => Alert.alert("Add someone", "Navigation coming in Phase 7") : undefined}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PersonCard
              person={item}
              onPress={() => {
                // navigation wired in Phase 7
              }}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        />
      )}
    </Screen>
  )
}
