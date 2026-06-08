import { useCallback, useMemo, useState } from "react"
import { FlatList, Text, TouchableOpacity, View } from "react-native"
import { useFocusEffect, useRouter } from "expo-router"
import MapView, { Marker, type Region } from "react-native-maps"
import { Screen } from "@/components/Screen"
import { Card } from "@/components/Card"
import { EmptyState } from "@/components/EmptyState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { LoadingState } from "@/components/LoadingState"
import { supabase } from "@/lib/supabase"
import { formatDate } from "@roots/shared"

type MapPerson = {
  id: string
  name: string
  company: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  last_contacted_at: string | null
}

type LocationGroup = {
  key: string
  latitude: number
  longitude: number
  location: string | null
  people: MapPerson[]
}

function buildGroups(people: MapPerson[]): LocationGroup[] {
  const groups = new Map<string, LocationGroup>()

  for (const person of people) {
    if (person.latitude == null || person.longitude == null) continue
    const latitude = Number(person.latitude)
    const longitude = Number(person.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue

    const key = `${Math.round(latitude * 1000)},${Math.round(longitude * 1000)}`
    const group = groups.get(key)
    if (group) {
      group.people.push(person)
    } else {
      groups.set(key, {
        key,
        latitude,
        longitude,
        location: person.location,
        people: [person],
      })
    }
  }

  return [...groups.values()].sort((a, b) => a.people[0].name.localeCompare(b.people[0].name))
}

function getInitialRegion(groups: LocationGroup[]): Region {
  if (groups.length === 0) {
    return {
      latitude: 39.8283,
      longitude: -98.5795,
      latitudeDelta: 50,
      longitudeDelta: 50,
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
    latitudeDelta: Math.max(0.08, (maxLat - minLat) * 1.8 || 8),
    longitudeDelta: Math.max(0.08, (maxLng - minLng) * 1.8 || 8),
  }
}

export default function RootsMapScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [people, setPeople] = useState<MapPerson[]>([])
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

  const groups = useMemo(() => buildGroups(people), [people])
  const selectedGroup = groups.find((group) => group.key === selectedGroupKey) ?? groups[0] ?? null
  const withLocationText = people.filter((person) => person.location?.trim())

  if (loading) return <LoadingState />

  if (people.length === 0) {
    return (
      <Screen>
        <View className="px-5 pt-6">
          <Text className="text-2xl font-bold text-warm-black">Your Roots</Text>
        </View>
        <EmptyState
          title="No people yet"
          description="Add people with locations to see where your relationships live."
          actionLabel="Add someone"
          onAction={() => router.push("/people/new")}
        />
      </Screen>
    )
  }

  return (
    <Screen scrollable={false}>
      <View className="px-5 pt-6 pb-3">
        <Text className="text-2xl font-bold text-warm-black">Your Roots</Text>
        <Text className="mt-1 text-sm text-gray-500">
          A simple view of where your people are, using locations you already saved.
        </Text>
      </View>

      {error && (
        <View className="px-5">
          <ErrorBanner message={error} />
        </View>
      )}

      {groups.length > 0 ? (
        <FlatList
          ListHeaderComponent={
            <View className="px-5 pb-3">
              <View className="h-72 overflow-hidden rounded-2xl border border-gray-100 bg-white">
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={getInitialRegion(groups)}
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                >
                  {groups.map((group) => (
                    <Marker
                      key={group.key}
                      coordinate={{ latitude: group.latitude, longitude: group.longitude }}
                      title={
                        group.people.length === 1
                          ? group.people[0].name
                          : `${group.people.length} people`
                      }
                      description={group.location ?? "Saved location"}
                      onPress={() => setSelectedGroupKey(group.key)}
                    />
                  ))}
                </MapView>
              </View>

              {selectedGroup && (
                <Card className="mt-3">
                  <Text className="text-sm font-semibold text-warm-black">
                    {selectedGroup.location ?? "Saved location"}
                  </Text>
                  <Text className="mt-0.5 text-xs text-gray-500">
                    {selectedGroup.people.length} {selectedGroup.people.length === 1 ? "person" : "people"}
                  </Text>
                  {selectedGroup.people.map((person) => (
                    <TouchableOpacity
                      key={person.id}
                      onPress={() => router.push(`/people/${person.id}`)}
                      className="mt-3 border-t border-gray-100 pt-3"
                    >
                      <Text className="text-sm font-semibold text-warm-black">{person.name}</Text>
                      <Text className="mt-0.5 text-xs text-gray-500">
                        Last: {formatDate(person.last_contacted_at)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Card>
              )}

              <Text className="mt-5 text-sm font-semibold text-warm-black">
                Location list
              </Text>
            </View>
          }
          data={people}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/people/${item.id}`)}
              className="px-5"
              activeOpacity={0.75}
            >
              <Card className="mb-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-sm font-semibold text-warm-black">{item.name}</Text>
                    <Text className="mt-0.5 text-xs text-gray-500">
                      {item.location?.trim() || "No saved location"}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-400">{formatDate(item.last_contacted_at)}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View className="flex-1">
          <View className="px-5">
            <Card>
              <Text className="text-sm font-semibold text-warm-black">Map unavailable</Text>
              <Text className="mt-1 text-xs leading-5 text-gray-500">
                None of your people have saved latitude and longitude yet. Roots will not geocode
                private contact locations without an approved pattern.
              </Text>
            </Card>
          </View>
          {withLocationText.length > 0 ? (
            <FlatList
              data={withLocationText}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => router.push(`/people/${item.id}`)} activeOpacity={0.75}>
                  <Card className="mb-3">
                    <Text className="text-sm font-semibold text-warm-black">{item.name}</Text>
                    <Text className="mt-1 text-xs text-gray-500">{item.location}</Text>
                  </Card>
                </TouchableOpacity>
              )}
            />
          ) : (
            <EmptyState
              title="No saved locations"
              description="Add locations on people profiles to build your roots map."
            />
          )}
        </View>
      )}
    </Screen>
  )
}
