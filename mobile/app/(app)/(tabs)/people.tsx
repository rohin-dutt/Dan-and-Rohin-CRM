import { useCallback, useMemo, useState } from "react"
import {
  ActionSheetIOS,
  FlatList,
  Modal,
  Pressable,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Screen } from "@/components/Screen"
import { BrandHeader, EmptyPanel, PersonAvatar, SearchBox, SoftCard, StatusDot } from "@/components/RootsUI"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import type { Interaction, Person, PersonTag, Tag } from "@/types"
import { colors, fonts } from "@/constants/theme"
import { formatDate, getNextDueDays, getRelationshipStatus } from "@roots/shared"

type SortKey = "last_contacted" | "name" | "most_contacted" | "recently_added"
type CategoryFilter = "All" | "Friends" | "Family" | "Professional"

const CATEGORIES: Array<{ label: CategoryFilter; icon: keyof typeof Ionicons.glyphMap }> = [
  { label: "All", icon: "apps-outline" },
  { label: "Friends", icon: "people-outline" },
  { label: "Family", icon: "home-outline" },
  { label: "Professional", icon: "briefcase-outline" },
]

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "last_contacted", label: "Last Contacted" },
  { key: "name", label: "Name A–Z" },
  { key: "most_contacted", label: "Most Contacted" },
  { key: "recently_added", label: "Recently Added" },
]

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "overdue", label: "Overdue" },
  { key: "due_this_week", label: "Due This Week" },
  { key: "coming_up", label: "Coming Up" },
  { key: "not_contacted", label: "Not Yet Contacted" },
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

function matchesStatusFilter(person: Person, filter: string | null): boolean {
  if (!filter) return true
  const days = getNextDueDays(person)
  if (filter === "overdue") return days != null && days <= 0
  if (filter === "due_this_week") return days != null && days >= 1 && days <= 7
  if (filter === "coming_up") return days != null && days >= 8
  if (filter === "not_contacted") return person.last_contacted_at == null
  return true
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
  const params = useLocalSearchParams<{ status?: string; location?: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [personTags, setPersonTags] = useState<PersonTag[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("last_contacted")
  const [category, setCategory] = useState<CategoryFilter>("All")
  const [activeFilter, setActiveFilter] = useState<string | null>(
    typeof params.status === "string" ? params.status : null,
  )
  const [locationFilter, setLocationFilter] = useState(
    typeof params.location === "string" ? params.location : "",
  )
  const [filterSheetVisible, setFilterSheetVisible] = useState(false)

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
      if (!matchesStatusFilter(person, activeFilter)) return false
      if (locationFilter.trim() && !normalize(person.location).includes(normalize(locationFilter))) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      if (sort === "most_contacted") {
        return (interactionCounts.get(b.id) ?? 0) - (interactionCounts.get(a.id) ?? 0)
      }
      if (sort === "recently_added") {
        if (!a.created_at && !b.created_at) return 0
        if (!a.created_at) return 1
        if (!b.created_at) return -1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (!a.last_contacted_at && !b.last_contacted_at) return a.name.localeCompare(b.name)
      if (!a.last_contacted_at) return 1
      if (!b.last_contacted_at) return -1
      return new Date(b.last_contacted_at).getTime() - new Date(a.last_contacted_at).getTime()
    })
  }, [activeFilter, category, interactionCounts, locationFilter, people, search, sort])

  const hasActiveFilter = !!(activeFilter || locationFilter.trim())
  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? "Last Contacted"

  function openSortSheet() {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", ...SORT_OPTIONS.map((o) => o.label)],
        cancelButtonIndex: 0,
      },
      (buttonIndex) => {
        if (buttonIndex > 0) {
          const option = SORT_OPTIONS[buttonIndex - 1]
          if (option) setSort(option.key)
        }
      },
    )
  }

  async function shareApp() {
    try {
      await Share.share({
        message:
          "Hey! I've been using Roots to stay close to the people who matter most to me. Thought you might like it — check it out at tryrootsapp.com",
      })
    } catch {
      // user dismissed share sheet
    }
  }

  if (loading) return <LoadingState />

  return (
    <Screen scrollable={false}>
      <BrandHeader
        title="Your People"
        titleIcon="heart-outline"
        subtitle="The people who matter most."
      />

      <TouchableOpacity
        onPress={shareApp}
        accessibilityRole="button"
        accessibilityLabel="Invite a friend"
        activeOpacity={0.76}
        className="mx-5 mb-3 flex-row items-center rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
      >
        <Ionicons name="share-outline" size={18} color={colors.forest} />
        <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="ml-2 flex-1 text-sm">
          Invite a friend
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </TouchableOpacity>

      <View className="px-5">
        {error ? <ErrorBanner message={error} /> : null}
        <SearchBox className="h-11">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search people"
            placeholderTextColor="#777A83"
            className="ml-3 flex-1 text-sm text-warm-black"
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
            onPress={() => setFilterSheetVisible(true)}
            className={`min-h-11 flex-row items-center rounded-full border px-4 ${
              hasActiveFilter ? "border-forest bg-forest" : "border-stone-200 bg-white"
            }`}
          >
            <Ionicons name="filter-outline" size={17} color={hasActiveFilter ? "#FFFFFF" : colors.ink} />
            <Text style={{ fontFamily: fonts.medium }} className={`ml-2 text-sm ${hasActiveFilter ? "text-white" : "text-warm-black"}`}>
              {hasActiveFilter ? "Filtered" : "More"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Change sort order"
            onPress={openSortSheet}
            className="min-h-10 flex-row items-center"
          >
            <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="text-base">
              Sort: {currentSortLabel}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.ink} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            onPress={() => setFilterSheetVisible(true)}
            className="min-h-10 flex-row items-center"
          >
            <Ionicons name="options-outline" size={20} color={hasActiveFilter ? colors.forest : colors.ink} />
            <Text
              style={{ fontFamily: fonts.body, color: hasActiveFilter ? colors.forest : colors.ink }}
              className="ml-2 text-base"
            >
              {hasActiveFilter ? "Filtered" : "Filters"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {sorted.length === 0 ? (
        <EmptyPanel
          title={search || category !== "All" || hasActiveFilter ? "No results" : "No people yet"}
          body={
            search || category !== "All" || hasActiveFilter
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

      <FilterSheet
        visible={filterSheetVisible}
        activeFilter={activeFilter}
        locationFilter={locationFilter}
        onSelectFilter={setActiveFilter}
        onLocationChange={setLocationFilter}
        onClose={() => setFilterSheetVisible(false)}
      />
    </Screen>
  )
}

function FilterSheet({
  visible,
  activeFilter,
  locationFilter,
  onSelectFilter,
  onLocationChange,
  onClose,
}: {
  visible: boolean
  activeFilter: string | null
  locationFilter: string
  onSelectFilter: (filter: string | null) => void
  onLocationChange: (text: string) => void
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/40"
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss filter sheet"
      >
        <Pressable
          className="rounded-t-[30px] bg-white px-6 pt-5"
          style={{ paddingBottom: Math.max(insets.bottom + 20, 36) }}
          onStartShouldSetResponder={() => true}
        >
          <View className="mb-5 items-center">
            <View className="h-1.5 w-20 rounded-full bg-stone-200" />
          </View>
          <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="mb-4 text-xl">
            Filter
          </Text>

          {STATUS_FILTERS.map((option) => (
            <TouchableOpacity
              key={option.key}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={() => onSelectFilter(activeFilter === option.key ? null : option.key)}
              className={`mb-2 min-h-11 flex-row items-center justify-between rounded-xl border px-4 ${
                activeFilter === option.key ? "border-forest bg-forest" : "border-stone-200 bg-white"
              }`}
            >
              <Text
                style={{ fontFamily: fonts.medium }}
                className={`text-sm ${activeFilter === option.key ? "text-white" : "text-warm-black"}`}
              >
                {option.label}
              </Text>
              {activeFilter === option.key ? (
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              ) : null}
            </TouchableOpacity>
          ))}

          <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="mb-2 mt-4 text-sm">
            Filter by location
          </Text>
          <View className="h-11 flex-row items-center rounded-xl border border-stone-200 bg-white px-3">
            <Ionicons name="location-outline" size={16} color="#60646D" />
            <TextInput
              value={locationFilter}
              onChangeText={onLocationChange}
              placeholder="City, country…"
              placeholderTextColor="#777A83"
              className="ml-2 flex-1 text-sm"
              style={{ fontFamily: fonts.body, color: colors.ink }}
            />
            {locationFilter ? (
              <TouchableOpacity onPress={() => onLocationChange("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View className="mt-5 flex-row gap-3">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear filters"
              onPress={() => {
                onSelectFilter(null)
                onLocationChange("")
              }}
              className="min-h-11 flex-1 items-center justify-center rounded-xl border border-stone-200"
            >
              <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="text-sm">
                Clear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Apply filters"
              onPress={onClose}
              className="min-h-11 flex-1 items-center justify-center rounded-xl bg-forest"
            >
              <Text style={{ fontFamily: fonts.bold }} className="text-sm text-white">
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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
        ...(person.relationship_type ? [{ id: "relationship", name: person.relationship_type, color: colors.mint, user_id: person.user_id, created_at: person.created_at }] : []),
        ...(person.role ? [{ id: "role", name: person.role, color: "#F2EEFA", user_id: person.user_id, created_at: person.created_at }] : []),
      ].slice(0, 3)

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.76} accessibilityRole="button" accessibilityLabel={`Open ${person.name}`}>
      <SoftCard className="mb-3 p-4">
        <View className="flex-row">
          <View className="mr-3 pt-4">
            <StatusDot status={statusDotForPerson(person)} />
          </View>
          <PersonAvatar name={person.name} imageUrl={personImageUrl(person)} size={44} />
          <View className="ml-4 flex-1">
            <View className="flex-row items-start justify-between">
              <View className="max-w-[64%]">
                <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} className="text-lg">
                  {person.name}
                </Text>
                {[person.relationship_type, person.company].filter(Boolean).join(" · ") ? (
                  <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1} className="mt-1 text-sm">
                    {[person.relationship_type, person.company].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
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
