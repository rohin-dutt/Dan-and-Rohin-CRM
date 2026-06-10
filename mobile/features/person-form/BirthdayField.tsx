import { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import { formatFullDate } from "@roots/shared"

// Birthday chip + expandable spinner picker shared by add/edit person forms.
export function BirthdayField({
  date,
  onChange,
}: {
  date: Date | null
  onChange: (date: Date | null) => void
}) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <View className="mb-3">
      <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
        Birthday
      </Text>
      {date ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.mint,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
          }}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.forest} style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 14, flex: 1 }}>
            {formatFullDate(date)}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear birthday"
            onPress={() => {
              onChange(null)
              setShowPicker(false)
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.forest} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Select birthday"
          onPress={() => setShowPicker((value) => !value)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 44,
            borderWidth: 1,
            borderColor: showPicker ? colors.forest : "#E7E5E4",
            borderRadius: 12,
            paddingHorizontal: 12,
            backgroundColor: "white",
          }}
        >
          <Ionicons name="calendar-outline" size={18} color="#8F96A3" style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: fonts.body, color: "#8F96A3", fontSize: 14 }}>Select birthday</Text>
        </TouchableOpacity>
      )}
      {showPicker && !date ? (
        <View
          style={{
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: colors.forest,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            backgroundColor: "white",
            overflow: "hidden",
          }}
        >
          <DateTimePicker
            value={date ?? new Date(1990, 0, 1)}
            mode="date"
            display="spinner"
            onChange={(_, picked) => {
              if (picked) onChange(picked)
            }}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Done selecting birthday"
            onPress={() => setShowPicker(false)}
            style={{ alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 12 }}
          >
            <Text style={{ fontFamily: fonts.bold, color: colors.forest, fontSize: 15 }}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}
