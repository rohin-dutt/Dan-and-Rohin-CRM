import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DeviceEventEmitter,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { Screen } from "@/components/Screen"
import { BrandHeader, EmptyPanel, PersonAvatar, SearchBox, SoftCard, StatusDot } from "@/components/RootsUI"
import { BottomSheetModal } from "@/components/BottomSheetModal"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { loadImportantMomentsForUser } from "@/lib/important-moments"
import type { ImportantMoment, Interaction, Person, PersonTag, Tag } from "@/types"
import { colors, fonts } from "@/constants/theme"
import { getNextDueDays, getRelationshipStatus, getUpcomingMoments, isTouchPoint } from "@roots/shared"

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
  { key: "name", label: "Sort by First Name" },
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

function parseMultiParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : value ?? ""
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function matchesSearch(person: Person, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true
  return normalize(person.name).includes(query)
}

function matchesCategory(person: Person, category: CategoryFilter) {
  if (category === "All") return true
  if (category === "Friends") return normalize(person.relationship_type).includes("friend")
  if (category === "Family") return normalize(person.relationship_type).includes("family")
  return ["professional", "work", "colleague", "business"].some((term) =>
    normalize(`${person.relationship_type ?? ""} ${person.company ?? ""} ${person.role ?? ""}`).includes(term),
  )
}

function matchesStatusFilter(person: Person, filters: string[]): boolean {
  if (filters.length === 0) return true
  const days = getNextDueDays(person)
  return filters.some((filter) => {
    if (filter === "overdue") return days != null && days <= 0
    if (filter === "due_this_week") return days != null && days >= 1 && days <= 7
    if (filter === "follow_up") return days != null && days <= 7
    if (filter === "coming_up") return days != null && days >= 8
    if (filter === "not_contacted") return person.last_contacted_at == null
    return false
  })
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

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatLastInteraction(dateStr: string | null | undefined): string {
  if (!dateStr) return "No interactions yet"
  const date = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`)
  const currentYear = new Date().getFullYear()
  const month = MONTH_SHORT[date.getMonth()]
  const day = date.getDate()
  if (date.getFullYear() === currentYear) {
    return `Last interaction ${month} ${day}`
  }
  return `Last interaction ${month} ${day}, ${date.getFullYear()}`
}

export default function PeopleScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ status?: string | string[]; location?: string | string[]; moments?: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [personTags, setPersonTags] = useState<PersonTag[]>([])
  const [importantMoments, setImportantMoments] = useState<ImportantMoment[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("last_contacted")
  const [category, setCategory] = useState<CategoryFilter>("All")
  const [statusFilters, setStatusFilters] = useState<string[]>(parseMultiParam(params.status))
  const [tagFilters, setTagFilters] = useState<string[]>([])
  const [locationFilters, setLocationFilters] = useState<string[]>(parseMultiParam(params.location))
  const [locationSearch, setLocationSearch] = useState("")
  const [filterSheetVisible, setFilterSheetVisible] = useState(false)
  const [sortDropdownVisible, setSortDropdownVisible] = useState(false)
  const [sortDropdownPos, setSortDropdownPos] = useState({ x: 0, y: 0 })
  const sortButtonRef = useRef<View>(null)

  const statusParam = Array.isArray(params.status) ? params.status.join(",") : (params.status ?? "")

  useEffect(() => {
    setStatusFilters(parseMultiParam(statusParam))
  }, [statusParam])

  useEffect(() => {
    setLocationFilters(parseMultiParam(params.location))
  }, [params.location])

  const load = useCallback(async () => {
    try {
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const [peopleRes, tagsRes, personTagsRes, loadedMoments] = await Promise.all([
        supabase.from("people").select("*").eq("user_id", session.user.id),
        supabase.from("tags").select("*").eq("user_id", session.user.id).order("name", { ascending: true }),
        supabase.from("person_tags").select("person_id, tag_id"),
        loadImportantMomentsForUser(session.user.id),
      ])

      if (peopleRes.error) throw peopleRes.error
      if (tagsRes.error) throw tagsRes.error
      if (personTagsRes.error) throw personTagsRes.error

      const loadedPeople = peopleRes.data ?? []
      setPeople(loadedPeople)
      setTags(tagsRes.data ?? [])
      setPersonTags(personTagsRes.data ?? [])
      setImportantMoments(loadedMoments)

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

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("interactionAdded", load)
    return () => sub.remove()
  }, [load])

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
      if (!isTouchPoint(interaction)) continue
      counts.set(interaction.person_id, (counts.get(interaction.person_id) ?? 0) + 1)
    }
    return counts
  }, [interactions])

  const latestTouchByPerson = useMemo(() => {
    const latest = new Map<string, Interaction>()
    for (const interaction of interactions) {
      if (!isTouchPoint(interaction)) continue
      const current = latest.get(interaction.person_id)
      if (!current) {
        latest.set(interaction.person_id, interaction)
        continue
      }
      const interactionDateTime = new Date(`${interaction.date}T12:00:00`).getTime()
      const currentDateTime = new Date(`${current.date}T12:00:00`).getTime()
      if (
        interactionDateTime > currentDateTime ||
        (interactionDateTime === currentDateTime &&
          new Date(interaction.created_at).getTime() > new Date(current.created_at).getTime())
      ) {
        latest.set(interaction.person_id, interaction)
      }
    }
    return latest
  }, [interactions])

  const upcomingMomentPersonIds = useMemo(
    () => new Set(getUpcomingMoments(people, importantMoments, new Date(), 14).map((moment) => moment.person.id)),
    [importantMoments, people],
  )

  const sorted = useMemo(() => {
    const filtered = people.filter((person) => {
      if (!matchesSearch(person, search)) return false
      if (!matchesCategory(person, category)) return false
      if (!matchesStatusFilter(person, statusFilters)) return false
      if (params.moments === "upcoming" && !upcomingMomentPersonIds.has(person.id)) return false
      if (tagFilters.length > 0) {
        const assignedTagIds = new Set((tagsByPerson.get(person.id) ?? []).map((tag) => tag.id))
        if (!tagFilters.some((tagId) => assignedTagIds.has(tagId))) return false
      }
      if (locationFilters.length > 0 && !locationFilters.some((loc) => normalize(person.location) === normalize(loc))) return false
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
      const aLatest = latestTouchByPerson.get(a.id)
      const bLatest = latestTouchByPerson.get(b.id)
      if (!aLatest && !bLatest) return a.name.localeCompare(b.name)
      if (!aLatest) return 1
      if (!bLatest) return -1
      const bDateTime = new Date(`${bLatest.date}T12:00:00`).getTime()
      const aDateTime = new Date(`${aLatest.date}T12:00:00`).getTime()
      if (bDateTime !== aDateTime) return bDateTime - aDateTime
      return new Date(bLatest.created_at).getTime() - new Date(aLatest.created_at).getTime()
    })
  }, [category, interactionCounts, latestTouchByPerson, locationFilters, params.moments, people, search, sort, statusFilters, tagFilters, tagsByPerson, upcomingMomentPersonIds])

  const hasActiveFilter = statusFilters.length > 0 || tagFilters.length > 0 || locationFilters.length > 0 || params.moments === "upcoming"
  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? "Last Contacted"

  function handleSortPress() {
    if (sortDropdownVisible) {
      setSortDropdownVisible(false)
      return
    }
    sortButtonRef.current?.measure((_, __, ___, height, pageX, pageY) => {
      setSortDropdownPos({ x: pageX, y: pageY + height })
      setSortDropdownVisible(true)
    })
  }

  if (loading) return <LoadingState />

  return (
    <Screen scrollable={false}>
      <BrandHeader
        title="Your People"
        titleIcon="heart-outline"
        subtitle="The people who matter most."
      />

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
          <View ref={sortButtonRef}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Change sort order"
              onPress={handleSortPress}
              className="min-h-10 flex-row items-center"
            >
              <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="text-base">
                Sort: {currentSortLabel}
              </Text>
              <Ionicons name={sortDropdownVisible ? "chevron-up" : "chevron-down"} size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

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
              onPress={() => router.push(`/people/${item.id}`)}
            />
          )}
        />
      )}

      <FilterSheet
        visible={filterSheetVisible}
        statusFilters={statusFilters}
        locationFilters={locationFilters}
        locationSearch={locationSearch}
        people={people}
        onToggleStatus={(filter) =>
          setStatusFilters((current) =>
            current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
          )
        }
        onToggleLocation={(location) =>
          setLocationFilters((current) =>
            current.some((item) => normalize(item) === normalize(location))
              ? []
              : [location],
          )
        }
        onLocationSearchChange={setLocationSearch}
        onClear={() => {
          setStatusFilters([])
          setTagFilters([])
          setLocationFilters([])
          setLocationSearch("")
          if (params.moments === "upcoming") router.replace("/people")
        }}
        onClose={() => setFilterSheetVisible(false)}
      />

      <Modal
        visible={sortDropdownVisible}
        transparent
        animationType="none"
        onRequestClose={() => setSortDropdownVisible(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setSortDropdownVisible(false)}>
          <Pressable
            style={{
              position: "absolute",
              top: sortDropdownPos.y + 4,
              left: sortDropdownPos.x,
              backgroundColor: "white",
              borderRadius: 12,
              minWidth: 200,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 8,
              overflow: "hidden",
            }}
          >
            {SORT_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.key}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                onPress={() => {
                  setSort(option.key)
                  setSortDropdownVisible(false)
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderBottomWidth: index < SORT_OPTIONS.length - 1 ? 1 : 0,
                  borderBottomColor: "#F5F4F2",
                }}
              >
                <Text style={{ fontFamily: fonts.medium, color: colors.forest, fontSize: 14 }}>
                  {option.label}
                </Text>
                {sort === option.key ? <Ionicons name="checkmark" size={16} color={colors.forest} /> : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}

function FilterSheet({
  visible,
  statusFilters,
  locationFilters,
  locationSearch,
  people,
  onToggleStatus,
  onToggleLocation,
  onLocationSearchChange,
  onClear,
  onClose,
}: {
  visible: boolean
  statusFilters: string[]
  locationFilters: string[]
  locationSearch: string
  people: Person[]
  onToggleStatus: (filter: string) => void
  onToggleLocation: (location: string) => void
  onLocationSearchChange: (text: string) => void
  onClear: () => void
  onClose: () => void
}) {
  const availableLocations = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const person of people) {
      const loc = person.location?.trim()
      if (loc && !seen.has(loc.toLowerCase())) {
        seen.add(loc.toLowerCase())
        result.push(loc)
      }
    }
    return result.sort()
  }, [people])

  const filteredLocations = useMemo(() => {
    if (!locationSearch.trim()) return []
    const normalized = locationSearch.trim().toLowerCase()
    return availableLocations.filter((loc) => loc.toLowerCase().includes(normalized))
  }, [availableLocations, locationSearch])

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      accessibilityLabel="Dismiss filter sheet"
      sheetStyle={{ maxHeight: "52%" }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}
      >
        <View className="mb-4 items-center">
          <View className="h-1.5 w-20 rounded-full bg-stone-200" />
        </View>

        <View className="mb-4 flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear filters"
            onPress={onClear}
          >
            <Text style={{ fontFamily: fonts.medium, color: colors.error, fontSize: 14 }}>Clear all</Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 20 }}>Filter</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Apply filters"
            onPress={onClose}
          >
            <Text style={{ fontFamily: fonts.medium, color: colors.forest, fontSize: 14 }}>Apply filters</Text>
          </TouchableOpacity>
        </View>

        {STATUS_FILTERS.map((option) => (
          <TouchableOpacity
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected: statusFilters.includes(option.key) }}
            accessibilityLabel={option.label}
            onPress={() => onToggleStatus(option.key)}
            className={`mb-2 min-h-11 flex-row items-center justify-between rounded-xl border px-4 ${
              statusFilters.includes(option.key) ? "border-forest bg-forest" : "border-stone-200 bg-white"
            }`}
          >
            <Text
              style={{ fontFamily: fonts.medium }}
              className={`text-sm ${statusFilters.includes(option.key) ? "text-white" : "text-warm-black"}`}
            >
              {option.label}
            </Text>
            {statusFilters.includes(option.key) ? (
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
            value={locationSearch}
            onChangeText={onLocationSearchChange}
            placeholder="City, country…"
            placeholderTextColor="#777A83"
            className="ml-2 flex-1 text-sm"
            style={{ fontFamily: fonts.body, color: colors.ink }}
          />
          {locationSearch ? (
            <TouchableOpacity onPress={() => onLocationSearchChange("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {filteredLocations.length > 0 ? (
          <View className="mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white">
            {filteredLocations.map((loc, index) => (
              <TouchableOpacity
                key={loc}
                accessibilityRole="button"
                accessibilityState={{ selected: locationFilters.some((item) => normalize(item) === normalize(loc)) }}
                accessibilityLabel={loc}
                onPress={() => onToggleLocation(loc)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: locationFilters.some((item) => normalize(item) === normalize(loc)) ? colors.mint : "white",
                  borderBottomWidth: index < filteredLocations.length - 1 ? 1 : 0,
                  borderBottomColor: "#F5F5F4",
                }}
              >
                <Text style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 14 }} numberOfLines={1}>
                  {loc}
                </Text>
                {locationFilters.some((item) => normalize(item) === normalize(loc)) ? (
                  <Ionicons name="checkmark" size={16} color={colors.forest} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : locationSearch.trim() ? (
          <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 13 }} className="mt-2">
            No saved locations match "{locationSearch}"
          </Text>
        ) : null}
      </ScrollView>
    </BottomSheetModal>
  )
}

function PersonCard({
  person,
  tags,
  onPress,
}: {
  person: Person
  tags: Tag[]
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
                  {formatLastInteraction(person.last_contacted_at)}
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
                  <View key={`${person.id}-${tag.id}-${index}`} className="rounded-lg px-2 py-1" style={{ backgroundColor: index === 1 ? "#F2EEFA" : index === 2 ? "#FFF3DE" : colors.mint }}>
                    <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1} className="max-w-20 text-xs">
                      {tag.name}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="flex-row items-center">
                <Ionicons name="chevron-forward" size={21} color={colors.muted} />
              </View>
            </View>
          </View>
        </View>
      </SoftCard>
    </TouchableOpacity>
  )
}
