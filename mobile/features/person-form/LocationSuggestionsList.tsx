import { Text, TouchableOpacity, View } from "react-native"
import { colors, fonts } from "@/constants/theme"
import type { MapboxFeature } from "@/lib/mapbox"

export function LocationSuggestionsList({
  suggestions,
  onSelect,
}: {
  suggestions: MapboxFeature[]
  onSelect: (feature: MapboxFeature) => void
}) {
  if (suggestions.length === 0) return null

  return (
    <View className="mt-1.5 rounded-xl border border-stone-200 bg-white" style={{ zIndex: 20 }}>
      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={`${suggestion.place_name}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={suggestion.place_name}
          onPress={() => onSelect(suggestion)}
          className={`px-4 py-3 ${index < suggestions.length - 1 ? "border-b border-stone-100" : ""}`}
        >
          <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1} className="text-sm">
            {suggestion.place_name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}
