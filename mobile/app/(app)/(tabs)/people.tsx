import { useCallback, useState } from "react"
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter, useFocusEffect } from "expo-router"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { EmptyState } from "@/components/EmptyState"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { PillButton } from "@/components/PillButton"
import { supabase } from "@/lib/supabase"
import type { Person } from "@/types"
import { getRelationshipStatus, formatDate } from "@roots/shared"

type SortKey = "last_contacted" | "most_contacted" | "date_added" | "name"
type StatusFilter = "all" | "overdue" | "due_this_week" | "coming_up" | "neglected"

const STATUS_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
  overdue: { label: "Overdue", bgClass: "bg-red-50", textClass: "text-red-600" },
  due_this_week: { label: "Due This Week", bgClass: "bg-amber-50", textClass: "text-amber-700" },
  recent: { label: "Recent", bgClass: "bg-green-50", textClass: "text-green-700" },
  neglected: { label: "Not yet contacted", bgClass: "bg-gray-100", textClass: "text-gray-600" },
  coming_up: { label: "Coming Up", bgClass: "bg-blue-50", textClass: "text-blue-600" },
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "last_contacted", label: "Last contacted" },
  { key: "most_contacted", label: "Most contacted" },
  { key: "date_added", label: "Date added" },
  { key: "name", label: "A–Z" },
]

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due_this_week", label: "Due This Week" },
  { key: "coming_up", label: "Coming Up" },
  { key: "neglected", label: "Not yet contacted" },
]

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.coming_up
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${cfg.bgClass}`}>
      <Text className={`text-xs font-medium ${cfg.textClass}`}>{cfg.label}</Text>
    </View>
  )
}

export default function PeopleScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [interactionCounts, setInteractionCounts] = useState<Map<string, number>>(new Map())
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("last_contacted")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const load = useCallback(async () => {
    try {
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const { data, error: err } = await supabase
        .from("people")
        .select("*")
        .eq("user_id", session.user.id)

      if (err) throw err
      const loaded = data ?? []
      setPeople(loaded)

      if (loaded.length > 0 && sort === "most_contacted") {
        const { data: interactions } = await supabase
          .from("interactions")
          .select("person_id")
          .in("person_id", loaded.map((p) => p.id))
        const counts = new Map<string, number>()
        for (const i of interactions ?? []) {
          counts.set(i.person_id, (counts.get(i.person_id) ?? 0) + 1)
        }
        setInteractionCounts(counts)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load people")
    } finally {
      setLoading(false)
    }
  }, [sort])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load]),
  )

  if (loading) return <LoadingState />

  const filtered = people.filter((p) => {
    if (statusFilter !== "all") {
      const status = getRelationshipStatus(p)
      if (status !== statusFilter) return false
    }
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.company ?? "").toLowerCase().includes(q) ||
      (p.role ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.notes ?? "").toLowerCase().includes(q) ||
      (p.location ?? "").toLowerCase().includes(q)
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name)
    if (sort === "date_added") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (sort === "most_contacted") {
      return (interactionCounts.get(b.id) ?? 0) - (interactionCounts.get(a.id) ?? 0)
    }
    // last_contacted: least recently contacted first (needs attention)
    if (!a.last_contacted_at && !b.last_contacted_at) return 0
    if (!a.last_contacted_at) return -1
    if (!b.last_contacted_at) return 1
    return new Date(a.last_contacted_at).getTime() - new Date(b.last_contacted_at).getTime()
  })

  const noFiltersActive = statusFilter === "all" && !search.trim()

  return (
    <Screen scrollable={false}>
      <View className="px-5 pt-6 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-warm-black">Your people</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => router.push("/people/import-contacts")}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2"
            >
              <Text className="text-sage text-sm font-semibold">Import</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/people/new")}
              className="bg-sage rounded-xl px-4 py-2"
            >
              <Text className="text-white text-sm font-semibold">Add someone</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error && <ErrorBanner message={error} />}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, company, role, email, notes, or tags..."
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white mb-3 text-warm-black"
          placeholderTextColor="#9CA3AF"
        />

        {/* Status filters */}
        <View className="flex-row flex-wrap gap-2 mb-2">
          {STATUS_FILTERS.map(({ key, label }) => (
            <PillButton
              key={key}
              label={label}
              selected={statusFilter === key}
              onPress={() => setStatusFilter(key)}
            />
          ))}
        </View>

        {/* Sort options */}
        <View className="flex-row flex-wrap gap-2 mb-3">
          {SORT_OPTIONS.map(({ key, label }) => (
            <PillButton
              key={key}
              label={label}
              selected={sort === key}
              onPress={() => setSort(key)}
            />
          ))}
        </View>
      </View>

      {sorted.length === 0 ? (
        <EmptyState
          title={noFiltersActive ? "No one here yet." : "No people match your filters."}
          description={
            noFiltersActive
              ? "Add someone you want to stay close to."
              : "Try a broader search or clear the active filters."
          }
          actionLabel={noFiltersActive ? "Add your first person" : "Clear filters"}
          onAction={
            noFiltersActive
              ? () => router.push("/people/new")
              : () => {
                  setStatusFilter("all")
                  setSearch("")
                }
          }
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const status = getRelationshipStatus(item)
            return (
              <TouchableOpacity
                onPress={() => router.push(`/people/${item.id}`)}
                activeOpacity={0.7}
              >
                <Card className="mb-3">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-3">
                      <Text className="text-sm font-semibold text-warm-black">{item.name}</Text>
                      {(item.role != null || item.company != null) && (
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {[item.role, item.company].filter(Boolean).join(" at ")}
                        </Text>
                      )}
                      <Text className="text-xs text-gray-400 mt-1">
                        Last talked: {formatDate(item.last_contacted_at)}
                      </Text>
                    </View>
                    <StatusBadge status={status} />
                  </View>
                  <View className="flex-row gap-2 mt-3">
                    <TouchableOpacity
                      onPress={() => router.push(`/people/${item.id}`)}
                      className="bg-white border border-gray-200 rounded-xl px-3 py-1.5"
                    >
                      <Text className="text-xs font-medium text-warm-black">Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => router.push(`/people/${item.id}/log`)}
                      className="bg-sage rounded-xl px-3 py-1.5"
                    >
                      <Text className="text-xs font-medium text-white">Log chat</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </Screen>
  )
}
