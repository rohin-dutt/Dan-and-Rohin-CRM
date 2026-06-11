import { useMemo } from "react"
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { BottomSheetModal } from "@/components/BottomSheetModal"
import { colors, fonts } from "@/constants/theme"
import { normalize, STATUS_FILTERS } from "./filters"
import type { Person } from "@/types"

export function FilterSheet({
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
