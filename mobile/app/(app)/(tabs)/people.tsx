import { useCallback, useMemo, useState } from "react"
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { EmptyState } from "@/components/EmptyState"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { PillButton } from "@/components/PillButton"
import { supabase } from "@/lib/supabase"
import type { Person } from "@/types"
import { getRelationshipStatus, formatDate } from "@roots/shared"
import { colors } from "@/constants/theme"

type SortKey = "last_contacted" | "name"
type RelationshipFilter = "Friend" | "Family" | "Professional"

const RELATIONSHIP_FILTERS: RelationshipFilter[] = ["Friend", "Family", "Professional"]

const STATUS_CONFIG: Record<string, { label: string; bgClass: string; textClass: string }> = {
  overdue: { label: "Overdue", bgClass: "bg-red-50", textClass: "text-red-600" },
  due_this_week: { label: "Due soon", bgClass: "bg-amber-50", textClass: "text-amber-700" },
  recent: { label: "Recent", bgClass: "bg-green-50", textClass: "text-green-700" },
  neglected: { label: "Needs attention", bgClass: "bg-gray-100", textClass: "text-gray-600" },
  coming_up: { label: "Coming up", bgClass: "bg-blue-50", textClass: "text-blue-600" },
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function fieldStartsWith(value: string | null | undefined, query: string) {
  const normalized = normalize(value)
  if (!normalized) return false
  return normalized
    .split(/\s+/)
    .some((token) => token.startsWith(query))
}

function matchesSearch(person: Person, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true
  const nameTokens = person.name.trim().split(/\s+/)
  const firstName = nameTokens[0] ?? ""
  const lastName = nameTokens.length > 1 ? nameTokens[nameTokens.length - 1] : ""

  return (
    fieldStartsWith(firstName, query) ||
    fieldStartsWith(lastName, query) ||
    fieldStartsWith(person.name, query) ||
    fieldStartsWith(person.company, query) ||
    fieldStartsWith(person.location, query)
  )
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
  const params = useLocalSearchParams<{ status?: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("last_contacted")
  const [relationshipFilter, setRelationshipFilter] = useState<RelationshipFilter | null>(null)
  const [inviteDismissed, setInviteDismissed] = useState(false)

  const statusFilter = typeof params.status === "string" ? params.status : null

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

  const sorted = useMemo(() => {
    const filtered = people.filter((person) => {
      if (!matchesSearch(person, search)) return false
      if (relationshipFilter && person.relationship_type !== relationshipFilter) return false
      if (statusFilter && getRelationshipStatus(person) !== statusFilter) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sort === "name") {
        const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        if (byName !== 0) return byName
        return a.id.localeCompare(b.id)
      }
      if (!a.last_contacted_at && !b.last_contacted_at) {
        const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        return byName !== 0 ? byName : a.id.localeCompare(b.id)
      }
      if (!a.last_contacted_at) return 1
      if (!b.last_contacted_at) return -1
      const byDate = new Date(b.last_contacted_at).getTime() - new Date(a.last_contacted_at).getTime()
      if (byDate !== 0) return byDate
      const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      return byName !== 0 ? byName : a.id.localeCompare(b.id)
    })
  }, [people, relationshipFilter, search, sort, statusFilter])

  if (loading) return <LoadingState />

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
              accessibilityRole="button"
              accessibilityLabel="Import contacts"
            >
              <Text className="text-sage text-sm font-semibold">Import</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/people/new")}
              className="bg-sage rounded-xl px-4 py-2"
              accessibilityRole="button"
              accessibilityLabel="Add person"
            >
              <Text className="text-white text-sm font-semibold">Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error && <ErrorBanner message={error} />}

        {!inviteDismissed && people.length >= 1 && (
          <View className="mb-3 flex-row items-start rounded-2xl border border-gray-100 bg-white px-3 py-3">
            <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-green-50">
              <Ionicons name="person-add-outline" size={17} color={colors.sage} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-semibold text-warm-black">Invite a friend</Text>
              <Text className="mt-0.5 text-xs text-gray-500">
                Roots is better with the people you care about close at hand.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setInviteDismissed(true)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss invite banner"
              className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-gray-50"
            >
              <Ionicons name="close" size={16} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by starting letters..."
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white mb-3 text-warm-black"
          placeholderTextColor="#9CA3AF"
          accessibilityLabel="Search people"
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
          {statusFilter && (
            <PillButton
              label={STATUS_CONFIG[statusFilter]?.label ?? "Filtered"}
              selected
              onPress={() => router.setParams({ status: undefined })}
            />
          )}
        </View>

        <View className="flex-row flex-wrap gap-2 mb-3">
          {RELATIONSHIP_FILTERS.map((filter) => (
            <PillButton
              key={filter}
              label={filter}
              selected={relationshipFilter === filter}
              onPress={() => setRelationshipFilter((current) => current === filter ? null : filter)}
            />
          ))}
        </View>
      </View>

      {sorted.length === 0 ? (
        <EmptyState
          title={search.trim() || relationshipFilter || statusFilter ? "No results" : "No people yet"}
          description={
            search.trim() || relationshipFilter || statusFilter
              ? "Try a different search or filter."
              : "Add someone you want to stay in touch with."
          }
          actionLabel={!search.trim() && !relationshipFilter && !statusFilter ? "Add someone" : undefined}
          onAction={!search.trim() && !relationshipFilter && !statusFilter ? () => router.push("/people/new") : undefined}
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
                          {[item.role, item.company].filter(Boolean).join(" - ")}
                        </Text>
                      )}
                      {item.relationship_type && (
                        <Text className="text-xs text-sage mt-1">{item.relationship_type}</Text>
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
