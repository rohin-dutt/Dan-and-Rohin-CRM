import { useCallback, useMemo, useState } from "react"
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect, useRouter } from "expo-router"
import MapView, { Marker, type Region } from "react-native-maps"
import { Screen } from "@/components/Screen"
import { BrandHeader, EmptyPanel, IconTile, PersonAvatar, SearchBox, SoftCard } from "@/components/RootsUI"
import { ErrorBanner } from "@/components/ErrorBanner"
import { LoadingState } from "@/components/LoadingState"
import { supabase } from "@/lib/supabase"
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

function getInitialRegion(groups: LocationGroup[]): Region {
  if (groups.length === 0) {
    return {
      latitude: 39.8283,
      longitude: -98.5795,
      latitudeDelta: 36,
      longitudeDelta: 48,
    }
  }

  const latitudes = groups.map((group) => group.latitude)
  const longitudes = groups.map((group) => group.longitude)
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(1.2, (maxLat - minLat) * 1.7 || 4),
    longitudeDelta: Math.max(1.2, (maxLng - minLng) * 1.7 || 4),
  }
}

function personImageUrl(person: MapPerson) {
  return person.photo_url ?? person.avatar_url ?? person.image_url ?? null
}

export default function RootsMapScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<MapPerson[]>([])
  const [query, setQuery] = useState("")
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null)

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
      setPeople(data ?? [])
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
  const selectedGroup = groups.find((group) => group.key === selectedGroupKey) ?? groups[0] ?? null
  const peopleWithLocationText = filteredPeople.filter((person) => person.location?.trim())

  if (loading) return <LoadingState />

  if (people.length === 0) {
    return (
      <Screen>
        <BrandHeader
          title="Your Roots"
          subtitle="People and places that are part of your story."
          actionIcon="filter-outline"
          actionLabel="Filter locations"
          onAction={() => null}
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
          actionIcon="filter-outline"
          actionLabel="Filter locations"
          onAction={() => setQuery("")}
        />
        <View className="px-5">
          {error ? <ErrorBanner message={error} /> : null}
          <SearchBox className="h-16">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search locations"
              placeholderTextColor="#777A83"
              className="ml-3 flex-1 text-[17px] text-warm-black"
              style={{ fontFamily: fonts.body }}
              accessibilityLabel="Search locations"
            />
          </SearchBox>
        </View>
      </View>

      {groups.length > 0 ? (
        <View className="flex-1">
          <MapView
            style={{ flex: 1 }}
            initialRegion={getInitialRegion(groups)}
            showsUserLocation={false}
            showsMyLocationButton={false}
            accessibilityLabel="Map of saved Roots locations"
          >
            {groups.map((group) => (
              <Marker
                key={group.key}
                coordinate={{ latitude: group.latitude, longitude: group.longitude }}
                title={group.location}
                description={`${group.people.length} ${group.people.length === 1 ? "person" : "people"}`}
                onPress={() => setSelectedGroupKey(group.key)}
              >
                <View className="h-14 w-14 items-center justify-center rounded-full border-[5px] border-white bg-forest shadow-lg">
                  <Text style={{ fontFamily: fonts.bold }} className="text-lg text-white">
                    {group.people.length}
                  </Text>
                </View>
              </Marker>
            ))}
          </MapView>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Reset location search"
            onPress={() => setQuery("")}
            className="absolute right-5 top-[47%] h-14 w-14 items-center justify-center rounded-xl bg-white shadow-lg"
          >
            <Ionicons name="locate-outline" size={28} color={colors.ink} />
          </TouchableOpacity>

          <View className="absolute bottom-0 left-4 right-4 max-h-[50%] rounded-t-[26px] bg-white px-5 pt-3 shadow-xl">
            <View className="mb-4 items-center">
              <View className="h-1.5 w-20 rounded-full bg-stone-200" />
            </View>
            <Text style={{ fontFamily: fonts.heading, color: colors.forest }} className="text-[28px] leading-8">
              Locations
            </Text>
            <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-base">
              {filteredPeople.length} people across {groups.length} {groups.length === 1 ? "location" : "locations"}
            </Text>
            <FlatList
              data={groups}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ paddingTop: 18, paddingBottom: 122 }}
              renderItem={({ item, index }) => (
                <LocationRow
                  group={item}
                  isSelected={item.key === selectedGroup?.key}
                  showDivider={index < groups.length - 1}
                  onPress={() => setSelectedGroupKey(item.key)}
                  onOpen={() => router.push(`/people/${item.people[0].id}`)}
                />
              )}
            />
          </View>
        </View>
      ) : (
        <View className="flex-1 px-5">
          <SoftCard className="p-5">
            <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
              Map unavailable
            </Text>
            <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm leading-5">
              None of the matching people have saved latitude and longitude. Roots is not geocoding private
              contact locations automatically.
            </Text>
          </SoftCard>
          {peopleWithLocationText.length > 0 ? (
            <FlatList
              data={peopleWithLocationText}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 130 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => router.push(`/people/${item.id}`)} activeOpacity={0.76}>
                  <SoftCard className="mb-3 p-4">
                    <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
                      {item.name}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                      {item.location}
                    </Text>
                  </SoftCard>
                </TouchableOpacity>
              )}
            />
          ) : (
            <EmptyPanel
              title="No saved locations"
              body="Add a location on a person profile to start building your map."
            />
          )}
        </View>
      )}
    </Screen>
  )
}

function LocationRow({
  group,
  isSelected,
  showDivider,
  onPress,
  onOpen,
}: {
  group: LocationGroup
  isSelected: boolean
  showDivider: boolean
  onPress: () => void
  onOpen: () => void
}) {
  const visiblePeople = group.people.slice(0, 4)
  const extraCount = group.people.length - visiblePeople.length

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Select ${group.location}`}
      onPress={onPress}
      onLongPress={onOpen}
      activeOpacity={0.76}
    >
      <View className={`flex-row items-center py-3 ${showDivider ? "border-b border-stone-200" : ""}`}>
        <IconTile icon={isSelected ? "navigate-circle-outline" : "location-outline"} size={64} />
        <View className="ml-4 flex-1">
          <Text style={{ fontFamily: fonts.bold, color: colors.ink }} numberOfLines={1} className="text-lg">
            {group.location}
          </Text>
          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
            {group.people.length} {group.people.length === 1 ? "person" : "people"}
          </Text>
        </View>
        <View className="mr-2 flex-row items-center">
          {visiblePeople.map((person, index) => (
            <View key={person.id} style={{ marginLeft: index === 0 ? 0 : -9 }}>
              <PersonAvatar name={person.name} imageUrl={personImageUrl(person)} size={32} />
            </View>
          ))}
          {extraCount > 0 ? (
            <View className="-ml-2 h-9 w-9 items-center justify-center rounded-full bg-mint">
              <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="text-xs">
                +{extraCount}
              </Text>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={23} color={colors.muted} />
      </View>
    </TouchableOpacity>
  )
}
