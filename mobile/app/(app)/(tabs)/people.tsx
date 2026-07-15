import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DeviceEventEmitter, FlatList, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { Screen } from "@/components/Screen"
import { BrandHeader, EmptyPanel, SearchBox } from "@/components/RootsUI"
import { AnchoredMenu, useAnchoredMenu } from "@/components/AnchoredMenu"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { loadImportantMomentsForUser } from "@/lib/important-moments"
import type { ImportantMoment, Person, PersonTag, Tag } from "@/types"
import { colors, fonts } from "@/constants/theme"
import { getUpcomingMoments } from "@roots/shared"
import {
  buildInteractionCounts,
  buildLatestTouchByPerson,
  buildOpenFollowUpByPerson,
  filterAndSortPeople,
  INTERACTION_SUMMARY_COLUMNS,
  parseLocationParam,
  parseMultiParam,
  PEOPLE_CATEGORIES,
  SORT_OPTIONS,
  type CategoryFilter,
  type InteractionSummary,
  type SortKey,
} from "@/features/people-list/filters"
import { FilterSheet } from "@/features/people-list/FilterSheet"
import { PersonCard } from "@/features/people-list/PersonCard"

export default function PeopleScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ status?: string | string[]; location?: string | string[]; moments?: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [personTags, setPersonTags] = useState<PersonTag[]>([])
  const [importantMoments, setImportantMoments] = useState<ImportantMoment[]>([])
  const [interactions, setInteractions] = useState<InteractionSummary[]>([])
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortKey>("last_contacted")
  const [category, setCategory] = useState<CategoryFilter>("All")
  const [statusFilters, setStatusFilters] = useState<string[]>(parseMultiParam(params.status))
  const [tagFilters, setTagFilters] = useState<string[]>([])
  const [locationFilters, setLocationFilters] = useState<string[]>(parseLocationParam(params.location))
  const [locationSearch, setLocationSearch] = useState("")
  const [filterSheetVisible, setFilterSheetVisible] = useState(false)
  const sortMenu = useAnchoredMenu()
  const hasLoadedOnce = useRef(false)

  const statusParam = Array.isArray(params.status) ? params.status.join(",") : (params.status ?? "")
  // Locations may contain commas ("Paris, France"), so they must never go
  // through the comma-splitting multi-param parser.
  const locationParam = Array.isArray(params.location) ? params.location.join("||") : (params.location ?? "")

  useEffect(() => {
    setStatusFilters(parseMultiParam(statusParam))
  }, [statusParam])

  useEffect(() => {
    setLocationFilters(parseLocationParam(locationParam))
  }, [locationParam])

  const load = useCallback(async (silent?: boolean) => {
    try {
      if (!silent && !hasLoadedOnce.current) setLoading(true)
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
          .select(INTERACTION_SUMMARY_COLUMNS)
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
      hasLoadedOnce.current = true
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedOnce.current) load(true)
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

  const interactionCounts = useMemo(() => buildInteractionCounts(interactions), [interactions])

  const latestTouchByPerson = useMemo(() => buildLatestTouchByPerson(interactions), [interactions])

  const followUpByPerson = useMemo(() => buildOpenFollowUpByPerson(interactions), [interactions])

  const upcomingMomentPersonIds = useMemo(
    () => new Set(getUpcomingMoments(people, importantMoments, new Date(), 14).map((moment) => moment.person.id)),
    [importantMoments, people],
  )

  const sorted = useMemo(
    () =>
      filterAndSortPeople({
        people,
        search,
        category,
        statusFilters,
        tagFilters,
        locationFilters,
        momentsUpcomingOnly: params.moments === "upcoming",
        upcomingMomentPersonIds,
        tagsByPerson,
        sort,
        interactionCounts,
        latestTouchByPerson,
        followUpByPerson,
      }),
    [category, followUpByPerson, interactionCounts, latestTouchByPerson, locationFilters, params.moments, people, search, sort, statusFilters, tagFilters, tagsByPerson, upcomingMomentPersonIds],
  )

  const activeFilterCount =
    statusFilters.length + tagFilters.length + locationFilters.length + (params.moments === "upcoming" ? 1 : 0)
  const hasActiveFilter = activeFilterCount > 0
  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sort)?.label ?? "Last talked to"

  if (loading) return <LoadingState />

  return (
    <Screen scrollable={false}>
      <BrandHeader
        title="Your People"
        titleIcon="heart-outline"
        subtitle="The people who matter."
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
          {PEOPLE_CATEGORIES.map((item) => (
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
            accessibilityLabel={hasActiveFilter ? `More filters, ${activeFilterCount} active` : "More filters"}
            onPress={() => setFilterSheetVisible(true)}
            className={`min-h-11 flex-row items-center rounded-full border px-4 ${
              hasActiveFilter ? "border-forest bg-mint" : "border-stone-200 bg-white"
            }`}
          >
            <Ionicons name="filter-outline" size={17} color={hasActiveFilter ? colors.forest : colors.ink} />
            <Text
              style={{ fontFamily: fonts.medium, color: hasActiveFilter ? colors.forest : colors.ink }}
              className="ml-2 text-sm"
            >
              Filters
            </Text>
            {hasActiveFilter ? (
              <View
                className="ml-1.5 h-5 min-w-5 items-center justify-center rounded-full px-1"
                style={{ backgroundColor: colors.forest }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: "#FFFFFF" }} className="text-[11px]">
                  {activeFilterCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <View ref={sortMenu.anchorRef}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Change sort order"
              onPress={sortMenu.toggle}
              className="min-h-10 flex-row items-center"
            >
              <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="text-base">
                Sort: {currentSortLabel}
              </Text>
              <Ionicons name={sortMenu.visible ? "chevron-up" : "chevron-down"} size={18} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={hasActiveFilter ? `Open filters, ${activeFilterCount} active` : "Open filters"}
            onPress={() => setFilterSheetVisible(true)}
            className={`min-h-10 flex-row items-center ${hasActiveFilter ? "rounded-full bg-mint px-3" : ""}`}
          >
            <Ionicons name="options-outline" size={20} color={hasActiveFilter ? colors.forest : colors.ink} />
            <Text
              style={{ fontFamily: fonts.body, color: hasActiveFilter ? colors.forest : colors.ink }}
              className="ml-2 text-base"
            >
              Filters
            </Text>
            {hasActiveFilter ? (
              <View
                className="ml-1.5 h-5 min-w-5 items-center justify-center rounded-full px-1"
                style={{ backgroundColor: colors.forest }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: "#FFFFFF" }} className="text-[11px]">
                  {activeFilterCount}
                </Text>
              </View>
            ) : null}
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
              followUpDate={followUpByPerson.get(item.id) ?? null}
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
            current.some((item) => item.trim().toLowerCase() === location.trim().toLowerCase())
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
          if (statusParam || params.location || params.moments === "upcoming") router.replace("/people")
        }}
        onClose={() => setFilterSheetVisible(false)}
      />

      <AnchoredMenu
        visible={sortMenu.visible}
        position={sortMenu.position}
        options={SORT_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
        selectedKey={sort}
        onSelect={(key) => setSort(key)}
        onClose={sortMenu.close}
      />
    </Screen>
  )
}
