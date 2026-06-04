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

type SortKey = "last_contacted" | "name" | "recently_added"

const STATUS_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
  overdue: { label: "Overdue", bgClass: "bg-red-50", textClass: "text-red-600" },
  due_this_week: { label: "Due soon", bgClass: "bg-amber-50", textClass: "text-amber-700" },
  recent: { label: "Recent", bgClass: "bg-green-50", textClass: "text-green-700" },
  neglected: { label: "Neglected", bgClass: "bg-gray-100", textClass: "text-gray-600" },
  coming_up: { label: "Coming up", bgClass: "bg-blue-50", textClass: "text-blue-600" },
}

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
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("last_contacted")

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
      setPeople(data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load people")
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

  const filtered = people.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      (p.company ?? "").toLowerCase().includes(q) ||
      (p.location ?? "").toLowerCase().includes(q)
    )
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name)
    if (sort === "recently_added") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (!a.last_contacted_at && !b.last_contacted_at) return 0
    if (!a.last_contacted_at) return 1
    if (!b.last_contacted_at) return -1
    return new Date(b.last_contacted_at).getTime() - new Date(a.last_contacted_at).getTime()
  })

  return (
    <Screen scrollable={false}>
      <View className="px-5 pt-6 pb-2">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-warm-black">
            Your people{people.length > 0 ? ` (${people.length})` : ""}
          </Text>
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
              <Text className="text-white text-sm font-semibold">+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error && <ErrorBanner message={error} />}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, company, or location…"
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white mb-3 text-warm-black"
          placeholderTextColor="#9CA3AF"
        />

        <View className="flex-row flex-wrap gap-2 mb-3">
          <PillButton
            label="Last contacted"
            selected={sort === "last_contacted"}
            onPress={() => setSort("last_contacted")}
          />
          <PillButton
            label="Name A-Z"
            selected={sort === "name"}
            onPress={() => setSort("name")}
          />
          <PillButton
            label="Recently added"
            selected={sort === "recently_added"}
            onPress={() => setSort("recently_added")}
          />
        </View>
      </View>

      {sorted.length === 0 ? (
        <EmptyState
          title={search.trim() ? "No results" : "No people yet"}
          description={
            search.trim()
              ? "Try a different search."
              : "Add someone you want to stay in touch with."
          }
          actionLabel={!search.trim() ? "Add someone" : undefined}
          onAction={!search.trim() ? () => router.push("/people/new") : undefined}
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
                          {[item.role, item.company].filter(Boolean).join(" · ")}
                        </Text>
                      )}
                      <Text className="text-xs text-gray-400 mt-1">
                        Last: {formatDate(item.last_contacted_at)}
                      </Text>
                    </View>
                    <StatusBadge status={status} />
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
