import { useCallback, useMemo, useRef, useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import MapView, { Marker } from "react-native-maps"
import { Screen } from "@/components/Screen"
import { BrandHeader, EmptyPanel, SearchBox, SoftCard } from "@/components/RootsUI"
import { ErrorBanner } from "@/components/ErrorBanner"
import { LoadingState } from "@/components/LoadingState"
import { supabase } from "@/lib/supabase"
import { geocodePlace, type MapboxFeature } from "@/lib/mapbox"
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

type MapRegion = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
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

function computeFitRegion(groups: LocationGroup[]): MapRegion | null {
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

function getDefaultRegion(): MapRegion {
  return {
    latitude: 20,
    longitude: 0,
    latitudeDelta: 100,
    longitudeDelta: 140,
  }
}

export default function RootsMapScreen() {
  const router = useRouter()
  const mapRef = useRef<MapView>(null)
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<MapPerson[]>([])
  const [query, setQuery] = useState("")
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<MapboxFeature[]>([])
  const [mapInitialRegion, setMapInitialRegion] = useState<MapRegion>(getDefaultRegion())

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

  const groups = useMemo(() => buildGroups(filteredPeople), [filteredPeople])
  const selectedGroup = groups.find((group) => group.key === selectedGroupKey) ?? null

  function handleQueryChange(text: string) {
    setQuery(text)
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current)
    if (!text.trim()) {
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
          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mb-2 text-sm">
            {filteredPeople.length} {filteredPeople.length === 1 ? "person" : "people"} across{" "}
            {groups.length} {groups.length === 1 ? "location" : "locations"}
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
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={mapInitialRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            accessibilityLabel="Map of saved Roots locations"
            onPress={() => setSelectedGroupKey(null)}
          >
            {groups.map((group) => (
              <Marker
                key={group.key}
                coordinate={{ latitude: group.latitude, longitude: group.longitude }}
                tracksViewChanges={false}
                onPress={() => setSelectedGroupKey(group.key)}
              >
                <View
                  pointerEvents="none"
                  className="h-10 w-10 items-center justify-center rounded-full border-[3px] border-white shadow-lg"
                  style={{ backgroundColor: selectedGroupKey === group.key ? colors.amber : colors.forest }}
                >
                  <Text style={{ fontFamily: fonts.bold }} className="text-sm text-white">
                    {group.people.length}
                  </Text>
                </View>
              </Marker>
            ))}
          </MapView>

          {selectedGroup ? (
            <View
              className="absolute bottom-6 left-5 right-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-xl"
              style={{ zIndex: 10 }}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base" numberOfLines={1}>
                    {selectedGroup.location}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                    {selectedGroup.people.length} {selectedGroup.people.length === 1 ? "person" : "people"}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss callout"
                  onPress={() => setSelectedGroupKey(null)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-stone-100"
                >
                  <Ionicons name="close" size={16} color={colors.ink} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`View all people in ${selectedGroup.location}`}
                onPress={() => {
                  setSelectedGroupKey(null)
                  router.push(`/people?location=${encodeURIComponent(selectedGroup.location)}`)
                }}
                className="mt-3 min-h-10 items-center justify-center rounded-xl bg-forest"
              >
                <Text style={{ fontFamily: fonts.bold }} className="text-sm text-white">
                  View all
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
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
        </View>
      )}
    </Screen>
  )
}
