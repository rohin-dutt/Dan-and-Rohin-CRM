import { useCallback, useMemo, useState } from "react"
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { Screen } from "@/components/Screen"
import { BrandHeader, EmptyPanel, PersonAvatar, SearchBox, SoftCard, StatusDot } from "@/components/RootsUI"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import type { Interaction, Person, PersonTag, Tag } from "@/types"
import { colors, fonts } from "@/constants/theme"
import { formatDate, getNextDueDays, getRelationshipStatus } from "@roots/shared"

type SortKey = "last_contacted" | "name"
type CategoryFilter = "All" | "Friends" | "Family" | "Professional"

const CATEGORIES: Array<{ label: CategoryFilter; icon: keyof typeof Ionicons.glyphMap }> = [
  { label: "All", icon: "apps-outline" },
  { label: "Friends", icon: "people-outline" },
  { label: "Family", icon: "home-outline" },
  { label: "Professional", icon: "briefcase-outline" },
]

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function matchesSearch(person: Person, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true
  return [person.name, person.company, person.role, person.location, person.relationship_type]
    .some((value) => normalize(value).includes(query))
}

function matchesCategory(person: Person, category: CategoryFilter) {
  if (category === "All") return true
  if (category === "Friends") return normalize(person.relationship_type).includes("friend")
  if (category === "Family") return normalize(person.relationship_type).includes("family")
  return ["professional", "work", "colleague", "business"].some((term) =>
    normalize(`${person.relationship_type ?? ""} ${person.company ?? ""} ${person.role ?? ""}`).includes(term),
  )
}

function statusDotForPerson(person: Person): "red" | "amber" | "green" | "gray" {
  const status = getRelationshipStatus(person)
  if (status === "overdue") return "red"
  if (status === "due_this_week") return "amber"
  if (status === "recent") return "green"
  return "gray"
}

function statusLabel(person: Person) {
  const days = getNextDueDays(person)
  if (days == null || days > 7) return "Active"
  if (days <= 0) return "Due today"
  return `Due in ${days} ${days === 1 ? "day" : "days"}`
}

function statusTone(person: Person) {
  const days = getNextDueDays(person)
  if (days == null || days > 7) return { bg: colors.mint, text: colors.forest }
  return { bg: "#FFF3DE", text: "#98520B" }
}

function personImageUrl(person: Person) {
  const maybePerson = person as Person & { photo_url?: string | null; avatar_url?: string | null; image_url?: string | null }
  return maybePerson.photo_url ?? maybePerson.avatar_url ?? maybePerson.image_url ?? null
}

export default function PeopleScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ status?: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [personTags, setPersonTags] = useState<PersonTag[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("last_contacted")
  const [category, setCategory] = useState<CategoryFilter>("All")
  const [statusFiltering, setStatusFiltering] = useState(false)

  const statusParam = typeof params.status === "string" ? params.status : null

  const load = useCallback(async () => {
    try {
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const [peopleRes, tagsRes, personTagsRes] = await Promise.all([
        supabase.from("people").select("*").eq("user_id", session.user.id),
        supabase.from("tags").select("*").eq("user_id", session.user.id).order("name", { ascending: true }),
        supabase.from("person_tags").select("person_id, tag_id"),
      ])

      if (peopleRes.error) throw peopleRes.error
      if (tagsRes.error) throw tagsRes.error
      if (personTagsRes.error) throw personTagsRes.error

      const loadedPeople = peopleRes.data ?? []
      setPeople(loadedPeople)
      setTags(tagsRes.data ?? [])
      setPersonTags(personTagsRes.data ?? [])

      if (loadedPeople.length) {
        const { data: loadedInteractions, error: interactionError } = await supabase
          .from("interactions")
          .select("*")
          .in(
            "person_id",
            loadedPeople.map((person) => person.id),
          )
        if (interactionError) throw interactionError
        setInteractions(loadedInteractions ?? [])
      } else {
        setInteractions([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load people.")
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

  const tagMap = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags])

  const tagsByPerson = useMemo(() => {
    const grouped = new Map<string, Tag[]>()
    for (const link of personTags) {
      const tag = tagMap.get(link.tag_id)
      if (!tag) continue
      grouped.set(link.person_id, [...(grouped.get(link.person_id) ?? []), tag])
    }
    return grouped
  }, [personTags, tagMap])

  const interactionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const interaction of interactions) {
      counts.set(interaction.person_id, (counts.get(interaction.person_id) ?? 0) + 1)
    }
    return counts
  }, [interactions])

  const sorted = useMemo(() => {
    const filtered = people.filter((person) => {
      if (!matchesSearch(person, search)) return false
      if (!matchesCategory(person, category)) return false
      if (statusFiltering && statusParam && getRelationshipStatus(person) !== statusParam) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      if (!a.last_contacted_at && !b.last_contacted_at) return a.name.localeCompare(b.name)
      if (!a.last_contacted_at) return 1
      if (!b.last_contacted_at) return -1
      return new Date(b.last_contacted_at).getTime() - new Date(a.last_contacted_at).getTime()
    })
  }, [category, people, search, sort, statusFiltering, statusParam])

  if (loading) return <LoadingState />

  return (
    <Screen scrollable={false}>
      <BrandHeader
        title="People"
        subtitle="The people who matter most."
        actionIcon="add"
        actionLabel="Add person"
        onAction={() => router.push("/people/new")}
      />

      <View className="px-5">
        {error ? <ErrorBanner message={error} /> : null}
        <SearchBox className="h-16">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search people"
            placeholderTextColor="#777A83"
            className="ml-3 flex-1 text-[17px] text-warm-black"
            style={{ fontFamily: fonts.body }}
            accessibilityLabel="Search people"
          />
        </SearchBox>

        <View className="mt-4 flex-row gap-2">
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${item.label}`}
              onPress={() => setCategory(item.label)}
              className={`min-h-11 flex-row items-center rounded-full border px-4 ${
                category === item.label ? "border-forest bg-forest" : "border-stone-200 bg-white"
              }`}
            >
              {item.label === "All" ? null : (
                <Ionicons
                  name={item.icon}
                  size={17}
                  color={category === item.label ? "#FFFFFF" : colors.ink}
                />
              )}
              <Text
                style={{ fontFamily: fonts.medium }}
                className={`text-sm ${item.label === "All" ? "" : "ml-2"} ${
                  category === item.label ? "text-white" : "text-warm-black"
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="More filters"
            onPress={() => setStatusFiltering((value) => !value)}
            className={`min-h-11 flex-row items-center rounded-full border px-4 ${
              statusFiltering ? "border-forest bg-forest" : "border-stone-200 bg-white"
            }`}
          >
            <Ionicons name="filter-outline" size={17} color={statusFiltering ? "#FFFFFF" : colors.ink} />
            <Text style={{ fontFamily: fonts.medium }} className={`ml-2 text-sm ${statusFiltering ? "text-white" : "text-warm-black"}`}>
              More
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Toggle people sort"
            onPress={() => setSort((current) => current === "last_contacted" ? "name" : "last_contacted")}
            className="min-h-10 flex-row items-center"
          >
            <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="text-base">
              Sort by {sort === "last_contacted" ? "last contacted" : "name"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.ink} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Toggle status filters"
            onPress={() => setStatusFiltering((value) => !value)}
            className="min-h-10 flex-row items-center"
          >
            <Ionicons name="options-outline" size={20} color={colors.ink} />
            <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="ml-2 text-base">
              Filters
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {sorted.length === 0 ? (
        <EmptyPanel
          title={search || category !== "All" || statusFiltering ? "No results" : "No people yet"}
          body={search || category !== "All" || statusFiltering
            ? "Try a different search, category, or filter."
            : "Add someone you want to stay in touch with."
          }
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 130 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <PersonCard
              person={item}
              tags={tagsByPerson.get(item.id) ?? []}
              interactionCount={interactionCounts.get(item.id) ?? 0}
              onPress={() => router.push(`/people/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  )
}

function PersonCard({
  person,
  tags,
  interactionCount,
  onPress,
}: {
  person: Person
  tags: Tag[]
  interactionCount: number
  onPress: () => void
}) {
  const tone = statusTone(person)
  const visibleTags = tags.slice(0, 3)
  const fallbackTags = visibleTags.length
    ? visibleTags
    : [
      { id: "relationship", name: person.relationship_type ?? "Relationship", color: colors.mint, user_id: person.user_id, created_at: person.created_at },
      ...(person.role ? [{ id: "role", name: person.role, color: "#F2EEFA", user_id: person.user_id, created_at: person.created_at }] : []),
    ].slice(0, 3)

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.76} accessibilityRole="button" accessibilityLabel={`Open ${person.name}`}>
      <SoftCard className="mb-3 p-4">
        <View className="flex-row">
          <View className="mr-3 pt-8">
            <StatusDot status={statusDotForPerson(person)} />
          </View>
          <PersonAvatar name={person.name} imageUrl={personImageUrl(person)} size={68} />
          <View className="ml-4 flex-1">
            <View className="flex-row items-start justify-between">
              <View className="max-w-[64%]">
                <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} className="text-lg">
                  {person.name}
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1} className="mt-1 text-sm">
                  {[person.relationship_type, person.company].filter(Boolean).join(" · ") || "Relationship"}
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} numberOfLines={1} className="mt-1 text-sm">
                  Last talked {formatDate(person.last_contacted_at)}
                </Text>
              </View>
              <View className="rounded-xl px-3 py-2" style={{ backgroundColor: tone.bg }}>
                <Text style={{ fontFamily: fonts.medium, color: tone.text }} className="text-sm">
                  {statusLabel(person)}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <View className="mr-3 flex-1 flex-row flex-wrap gap-2">
                {fallbackTags.map((tag, index) => (
                  <View key={`${person.id}-${tag.id}-${index}`} className="flex-row items-center rounded-lg px-2 py-1" style={{ backgroundColor: index === 1 ? "#F2EEFA" : index === 2 ? "#FFF3DE" : colors.mint }}>
                    <Ionicons name={index === 0 ? "pricetag-outline" : index === 1 ? "bulb-outline" : "cafe-outline"} size={14} color={index === 1 ? colors.purple : colors.forest} />
                    <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1} className="ml-1 max-w-20 text-xs">
                      {tag.name}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={18} color={colors.ink} />
                <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="ml-1 text-sm">
                  {interactionCount}
                </Text>
                <Ionicons name="chevron-forward" size={21} color={colors.muted} />
              </View>
            </View>
          </View>
        </View>
      </SoftCard>
    </TouchableOpacity>
  )
}
