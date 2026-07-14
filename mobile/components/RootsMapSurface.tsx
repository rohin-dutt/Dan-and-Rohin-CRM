import { forwardRef, useImperativeHandle, useRef } from "react"
import { Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import MapView, { Callout, Marker } from "react-native-maps"
import { colors, fonts } from "@/constants/theme"

const ROOTS_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f5f0e8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a4035" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f0e8" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c8bfb0" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#8f7e6e" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#ede8dc" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#ddd8c4" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6b5e4e" }] },
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#c8d5b9" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#4a6741" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e0d8cc" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7a6e5e" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f5f0e8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e8e0d0" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d4c8b8" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9a8e7e" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#ddd4c4" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#ddd4c4" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#b8ccd4" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#5a7a8a" }] },
]

export type RootsMapPersonPreview = {
  id: string
  name: string
}

export type RootsMapLocationGroup = {
  key: string
  latitude: number
  longitude: number
  location: string
  people: RootsMapPersonPreview[]
}

export type RootsMapRegion = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export type RootsMapSurfaceHandle = {
  animateToRegion: (region: RootsMapRegion, duration?: number) => void
}

type RootsMapSurfaceProps = {
  groups: RootsMapLocationGroup[]
  initialRegion: RootsMapRegion
  selectedGroupKey: string | null
  onSelectGroup: (key: string) => void
  onClearSelection: () => void
  onOpenLocation: (location: string) => void
}

const RootsMapSurface = forwardRef<RootsMapSurfaceHandle, RootsMapSurfaceProps>(
  ({ groups, initialRegion, selectedGroupKey, onSelectGroup, onClearSelection, onOpenLocation }, ref) => {
    const mapRef = useRef<MapView>(null)

    useImperativeHandle(ref, () => ({
      animateToRegion(region, duration = 500) {
        mapRef.current?.animateToRegion(region, duration)
      },
    }))

    return (
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        customMapStyle={ROOTS_MAP_STYLE}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        accessibilityLabel="Map of saved Roots locations"
        onPress={(event) => {
          if ((event.nativeEvent as { action?: string }).action === "marker-press") return
          onClearSelection()
        }}
      >
        {groups.map((group) => (
          <Marker
            key={group.key}
            coordinate={{ latitude: group.latitude, longitude: group.longitude }}
            tracksViewChanges={false}
            onPress={() => onSelectGroup(group.key)}
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
            <Callout
              tooltip
              onPress={() => onOpenLocation(group.location)}
              accessibilityLabel={`View all people in ${group.location}`}
            >
              <View
                style={{
                  backgroundColor: "white",
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  minWidth: 180,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  elevation: 6,
                }}
              >
                <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 15 }} numberOfLines={1}>
                  {group.location}
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 13, marginTop: 2 }}>
                  {group.people.length} {group.people.length === 1 ? "person" : "people"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 10,
                    borderRadius: 10,
                    backgroundColor: colors.forest,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bold, color: "white", fontSize: 13 }}>View all</Text>
                  <Ionicons name="chevron-forward" size={14} color="white" style={{ marginLeft: 4 }} />
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    )
  },
)

RootsMapSurface.displayName = "RootsMapSurface"

export default RootsMapSurface
