import { forwardRef, useImperativeHandle } from "react"
import { ScrollView, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import type { RootsMapLocationGroup, RootsMapRegion, RootsMapSurfaceHandle } from "./RootsMapSurface"

type RootsMapSurfaceProps = {
  groups: RootsMapLocationGroup[]
  initialRegion: RootsMapRegion
  selectedGroupKey: string | null
  onSelectGroup: (key: string) => void
  onClearSelection: () => void
  onOpenLocation: (location: string) => void
}

const RootsMapSurface = forwardRef<RootsMapSurfaceHandle, RootsMapSurfaceProps>(
  ({ groups, selectedGroupKey, onSelectGroup, onClearSelection, onOpenLocation }, ref) => {
    useImperativeHandle(ref, () => ({
      animateToRegion() {
        onClearSelection()
      },
    }))

    return (
      <View className="flex-1 bg-mint px-5 pt-5" accessibilityLabel="Saved Roots locations">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
              Saved places
            </Text>
            <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
              Web preview uses a list while the phone app keeps the native map.
            </Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
            <Ionicons name="map-outline" size={22} color={colors.forest} />
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
          {groups.map((group) => {
            const selected = selectedGroupKey === group.key
            return (
              <TouchableOpacity
                key={group.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`View all people in ${group.location}`}
                onPress={() => {
                  onSelectGroup(group.key)
                  onOpenLocation(group.location)
                }}
                className="mb-3 flex-row items-center rounded-2xl border bg-white p-4"
                style={{ borderColor: selected ? colors.forest : "#E7E0D4" }}
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: selected ? colors.amber : colors.forest }}
                >
                  <Text style={{ fontFamily: fonts.bold }} className="text-sm text-white">
                    {group.people.length}
                  </Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-sm" numberOfLines={1}>
                    {group.location}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-xs">
                    {group.people.length} {group.people.length === 1 ? "person" : "people"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    )
  },
)

RootsMapSurface.displayName = "RootsMapSurface"

export default RootsMapSurface
