import { useCallback, useMemo, useRef, useState } from "react"
import { Animated, PanResponder, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import { Screen } from "@/components/Screen"
import { BrandHeader, EmptyPanel, PersonAvatar, SearchBox, SoftCard } from "@/components/RootsUI"
import { ErrorBanner } from "@/components/ErrorBanner"
import { LoadingState } from "@/components/LoadingState"
import RootsMapSurface, { type RootsMapRegion, type RootsMapSurfaceHandle } from "@/components/RootsMapSurface"
import { supabase } from "@/lib/supabase"
import { geocodePlace, geocodingAvailable, type MapboxFeature } from "@/lib/mapbox"
import { colors, fonts } from "@/constants/theme"

type MapPerson = {
  id: string
  name: string
  company: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  last_contacted_at: string | null
  photo_url?: string | null
  avatar_url?: string | null
  image_url?: string | null
}

type LocationGroup = {
  key: string
  latitude: number
  longitude: number
  location: string
  people: MapPerson[]
}

const SHEET_EXPANDED_HEIGHT = 390
const SHEET_COLLAPSED_HEIGHT = 116
const SHEET_TRAVEL = SHEET_EXPANDED_HEIGHT - SHEET_COLLAPSED_HEIGHT

function clampSheetOffset(value: number) {
  return Math.min(SHEET_TRAVEL, Math.max(0, value))
}

function locationKey(person: MapPerson) {
  const latitude = Number(person.latitude)
  const longitude = Number(person.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return `${Math.round(latitude * 1000)},${Math.round(longitude * 1000)}`
}

function buildGroups(people: MapPerson[]): LocationGroup[] {
  const groups = new Map<string, LocationGroup>()

  for (const person of people) {
    const key = locationKey(person)
    if (!key || person.latitude == null || person.longitude == null) continue
    const existing = groups.get(key)
    if (existing) {
      existing.people.push(person)
      continue
    }
    groups.set(key, {
      key,
      latitude: Number(person.latitude),
      longitude: Number(person.longitude),
      location: person.location?.trim() || "Saved location",
      people: [person],
    })
  }

  return [...groups.values()].sort((a, b) => b.people.length - a.people.length)
}

function computeFitRegion(groups: LocationGroup[]): RootsMapRegion | null {
  if (groups.length === 0) return null
  if (groups.length === 1) {
    return {
      latitude: groups[0].latitude,
      longitude: groups[0].longitude,
      latitudeDelta: 5,
      longitudeDelta: 5,
    }
  }
  const lats = groups.map((g) => g.latitude)
  const lngs = groups.map((g) => g.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latDelta = Math.max((maxLat - minLat) * 1.4, 2)
  const lngDelta = Math.max((maxLng - minLng) * 1.4, 2)
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  }
}

function getDefaultRegion(): RootsMapRegion {
  return {
    latitude: 20,
    longitude: 0,
    latitudeDelta: 100,
    longitudeDelta: 140,
  }
}

export default function RootsMapScreen() {
  const router = useRouter()
  const mapRef = useRef<RootsMapSurfaceHandle>(null)
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sheetTranslateY = useRef(new Animated.Value(SHEET_TRAVEL)).current
  const sheetCurrentOffsetRef = useRef(SHEET_TRAVEL)
  const sheetDragStartOffsetRef = useRef(SHEET_TRAVEL)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<MapPerson[]>([])
  const [query, setQuery] = useState("")
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<MapboxFeature[]>([])
  const [mapInitialRegion, setMapInitialRegion] = useState<RootsMapRegion>(getDefaultRegion())

  const load = useCallback(async () => {
    try {
      setError(null)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return

      const { data, error: peopleError } = await supabase
        .from("people")
        .select("id, name, company, location, latitude, longitude, last_contacted_at")
        .eq("user_id", session.user.id)
        .order("name", { ascending: true })

      if (peopleError) throw peopleError
      const loaded = data ?? []
      setPeople(loaded)

      const initialGroups = buildGroups(loaded)
      const fitRegion = computeFitRegion(initialGroups)
      if (fitRegion) setMapInitialRegion(fitRegion)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your roots.")
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

  const filteredPeople = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return people
    return people.filter((person) =>
      [person.name, person.company, person.location]
        .some((value) => value?.toLowerCase().includes(normalized)),
    )
  }, [people, query])

  const allGroups = useMemo(() => buildGroups(people), [people])
  const groups = useMemo(() => buildGroups(filteredPeople), [filteredPeople])
  const needsMappedLocation = useMemo(
    () =>
      filteredPeople.filter((person) => {
        const hasLocation = Boolean(person.location?.trim())
        const hasCoordinates = Number.isFinite(Number(person.latitude)) && Number.isFinite(Number(person.longitude))
        return hasLocation && !hasCoordinates
      }),
    [filteredPeople],
  )
  const animateSheet = useCallback(
    (expanded: boolean) => {
      const nextOffset = expanded ? 0 : SHEET_TRAVEL
      setSheetExpanded(expanded)
      sheetCurrentOffsetRef.current = nextOffset
      sheetDragStartOffsetRef.current = nextOffset
      Animated.spring(sheetTranslateY, {
        toValue: nextOffset,
        useNativeDriver: true,
        damping: 24,
        stiffness: 220,
        mass: 0.9,
      }).start()
    },
    [sheetTranslateY],
  )
  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () => {
        sheetTranslateY.stopAnimation((value) => {
          const offset = clampSheetOffset(value)
          sheetCurrentOffsetRef.current = offset
          sheetDragStartOffsetRef.current = offset
        })
      },
      onPanResponderMove: (_, gesture) => {
        const nextOffset = clampSheetOffset(sheetDragStartOffsetRef.current + gesture.dy)
        sheetCurrentOffsetRef.current = nextOffset
        sheetTranslateY.setValue(nextOffset)
      },
      onPanResponderRelease: (_, gesture) => {
        const releasedOffset = sheetCurrentOffsetRef.current
        const shouldExpand =
          gesture.vy < -0.45 || (gesture.vy <= 0.45 && releasedOffset < SHEET_TRAVEL / 2)
        animateSheet(shouldExpand)
      },
      onPanResponderTerminate: () => {
        animateSheet(sheetCurrentOffsetRef.current < SHEET_TRAVEL / 2)
      },
    }),
  ).current

  function handleQueryChange(text: string) {
    setQuery(text)
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current)
    if (!text.trim() || !geocodingAvailable) {
      setGeocodeSuggestions([])
      return
    }
    geocodeTimerRef.current = setTimeout(() => {
      void geocodePlace(text).then((results) => {
        setGeocodeSuggestions(results.slice(0, 5))
      })
    }, 400)
  }

  function handleGeocodeSuggestionSelect(feature: MapboxFeature) {
    mapRef.current?.animateToRegion(
      {
        latitude: feature.center[1],
        longitude: feature.center[0],
        latitudeDelta: 5,
        longitudeDelta: 5,
      },
      500,
    )
    setGeocodeSuggestions([])
    setQuery("")
  }

  if (loading) return <LoadingState />

  if (people.length === 0) {
    return (
      <Screen>
        <BrandHeader
          title="Your Roots"
          subtitle="People and places that are part of your story."
        />
        <EmptyPanel
          title="No people yet"
          body="Add people with saved locations to see where your relationships live."
        />
      </Screen>
    )
  }

  return (
    <Screen scrollable={false}>
      <View className="pb-3">
        <BrandHeader
          title="Your Roots"
          subtitle="People and places that are part of your story."
        />
        <View className="px-5">
          {error ? <ErrorBanner message={error} /> : null}
          <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="mb-2 text-sm">
            {people.length} {people.length === 1 ? "person" : "people"} across {allGroups.length}{" "}
            {allGroups.length === 1 ? "location" : "locations"}
          </Text>
          <SearchBox className="h-11">
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Search locations"
              placeholderTextColor="#777A83"
              className="ml-3 flex-1 text-sm text-warm-black"
              style={{ fontFamily: fonts.body }}
              accessibilityLabel="Search locations"
            />
            {query ? (
              <TouchableOpacity
                onPress={() => {
                  setQuery("")
                  setGeocodeSuggestions([])
                }}
                className="mr-2"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            ) : null}
          </SearchBox>
          {!geocodingAvailable ? (
            <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-xs">
              Location search is unavailable until EXPO_PUBLIC_MAPBOX_TOKEN is configured.
            </Text>
          ) : null}
          {geocodeSuggestions.length > 0 ? (
            <View className="mt-1 rounded-xl border border-stone-200 bg-white shadow-lg" style={{ zIndex: 20 }}>
              {geocodeSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={suggestion.place_name}
                  onPress={() => handleGeocodeSuggestionSelect(suggestion)}
                  className={`px-4 py-3 ${index < geocodeSuggestions.length - 1 ? "border-b border-stone-100" : ""}`}
                >
                  <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1}>
                    {suggestion.place_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {groups.length > 0 ? (
        <View className="flex-1">
          <RootsMapSurface
            ref={mapRef}
            initialRegion={mapInitialRegion}
            groups={groups}
            selectedGroupKey={selectedGroupKey}
            onSelectGroup={setSelectedGroupKey}
            onClearSelection={() => setSelectedGroupKey(null)}
            onOpenLocation={(location) => router.push(`/people?location=${encodeURIComponent(location)}`)}
          />

          <Animated.View
            className="absolute bottom-0 left-0 right-0 rounded-t-[28px] border border-stone-200 bg-white px-5 pt-2 shadow-xl"
            style={{
              height: SHEET_EXPANDED_HEIGHT,
              zIndex: 10,
              transform: [{ translateY: sheetTranslateY }],
            }}
          >
            <View {...sheetPanResponder.panHandlers}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ expanded: sheetExpanded }}
                accessibilityLabel={sheetExpanded ? "Collapse locations" : "Expand locations"}
                onPress={() => animateSheet(!sheetExpanded)}
                activeOpacity={0.82}
              >
              <View className="mb-3 items-center">
                <View className="h-1.5 w-12 rounded-full bg-stone-200" />
              </View>
              <View className="flex-row items-center justify-between">
                <View>
                  <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
                    Locations
                  </Text>
                  <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                    {filteredPeople.length} {filteredPeople.length === 1 ? "person" : "people"} across {groups.length} {groups.length === 1 ? "city" : "cities"}
                  </Text>
                </View>
                <Ionicons name={sheetExpanded ? "chevron-down" : "chevron-up"} size={22} color={colors.muted} />
              </View>
              </TouchableOpacity>
            </View>
            {sheetExpanded ? (
              <ScrollView className="mt-3" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
                {needsMappedLocation.length > 0 ? (
                  <View className="mb-4 rounded-2xl bg-amber-50 p-3">
                    <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-sm">
                      Needs mapped location
                    </Text>
                    <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-xs">
                      {needsMappedLocation.length} {needsMappedLocation.length === 1 ? "person has" : "people have"} a location without coordinates.
                    </Text>
                    {needsMappedLocation.slice(0, 3).map((person) => (
                      <TouchableOpacity
                        key={person.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit mapped location for ${person.name}`}
                        onPress={() => router.push(`/people/${person.id}/edit`)}
                        className="mt-3 flex-row items-center"
                      >
                        <Ionicons name="location-outline" size={16} color={colors.amber} />
                        <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="ml-2 flex-1 text-sm" numberOfLines={1}>
                          {person.name} - {person.location}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                {groups.map((group) => (
                  <TouchableOpacity
                    key={group.key}
                    accessibilityRole="button"
                    accessibilityLabel={`View all people in ${group.location}`}
                    onPress={() => router.push(`/people?location=${encodeURIComponent(group.location)}`)}
                    className="flex-row items-center border-b border-stone-100 py-3"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-mint">
                      <Ionicons name="location-outline" size={20} color={colors.forest} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-sm" numberOfLines={1}>
                        {group.location}
                      </Text>
                      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-xs">
                        {group.people.length} {group.people.length === 1 ? "person" : "people"}
                      </Text>
                    </View>
                    <View className="mr-3 flex-row -space-x-2">
                      {group.people.slice(0, 4).map((person) => (
                        <PersonAvatar key={person.id} name={person.name} size={26} imageUrl={person.photo_url ?? person.avatar_url ?? person.image_url ?? null} />
                      ))}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null}
          </Animated.View>
        </View>
      ) : (
        <View className="flex-1 px-5">
          <SoftCard className="p-5">
            <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
              Map unavailable
            </Text>
            <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm leading-5">
              None of the matching people have saved latitude and longitude. Add a location with geocoding enabled to place people on the map.
            </Text>
          </SoftCard>
          {needsMappedLocation.length > 0 ? (
            <SoftCard className="mt-4 p-5">
              <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
                Needs mapped location
              </Text>
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm leading-5">
                These people have a location string but no saved coordinates.
              </Text>
              {needsMappedLocation.map((person) => (
                <TouchableOpacity
                  key={person.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit mapped location for ${person.name}`}
                  onPress={() => router.push(`/people/${person.id}/edit`)}
                  className="mt-4 flex-row items-center"
                >
                  <Ionicons name="location-outline" size={18} color={colors.amber} />
                  <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="ml-2 flex-1 text-sm" numberOfLines={1}>
                    {person.name} - {person.location}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </TouchableOpacity>
              ))}
            </SoftCard>
          ) : null}
        </View>
      )}
    </Screen>
  )
}
