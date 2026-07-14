import { forwardRef, useImperativeHandle, useRef } from "react"
import { Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import MapView, { Callout, Marker } from "react-native-maps"
import { colors, fonts } from "@/constants/theme"

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
        mapType="mutedStandard"
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
