import { Platform, Text, TextInput, TouchableOpacity, View } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import { formatFullDate } from "@roots/shared"

// Tap-to-expand inline spinner date picker used by interaction logging and
// onboarding forms.
export function InlineDateField({
  label,
  date,
  placeholder,
  open,
  onToggle,
  onChange,
  onDone,
  minimumDate,
  maximumDate,
}: {
  label?: string
  date: Date | null
  placeholder: string
  open: boolean
  onToggle: () => void
  onChange: (date: Date) => void
  onDone: () => void
  minimumDate?: Date
  maximumDate?: Date
}) {
  const accessibilityName = (label ?? placeholder).toLowerCase()
  const inputDateValue = date ? date.toISOString().slice(0, 10) : ""

  function handleWebDateChange(value: string) {
    if (!value) return
    const [year, month, day] = value.split("-").map(Number)
    if (!year || !month || !day) return
    onChange(new Date(year, month - 1, day))
  }

  return (
    <View className={label ? "mb-4" : undefined}>
      {label ? (
        <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="mb-2 text-sm">
          {label}
        </Text>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Select ${accessibilityName}`}
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 44,
          borderWidth: 1,
          borderColor: open ? colors.forest : "#E7E5E4",
          borderRadius: 12,
          paddingHorizontal: 14,
          backgroundColor: "white",
        }}
      >
        <Ionicons
          name="calendar-outline"
          size={16}
          color={date ? colors.forest : "#9CA3AF"}
          style={{ marginRight: 8 }}
        />
        <Text style={{ fontFamily: fonts.body, color: date ? colors.ink : "#9CA3AF", fontSize: 14, flex: 1 }}>
          {date ? formatFullDate(date) : placeholder}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
      </TouchableOpacity>
      {open ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.forest,
            borderRadius: 12,
            backgroundColor: "white",
            overflow: "hidden",
            marginTop: 6,
          }}
        >
          {Platform.OS === "web" ? (
            <TextInput
              accessibilityLabel={`Choose ${accessibilityName}`}
              value={inputDateValue}
              onChangeText={handleWebDateChange}
              placeholder="YYYY-MM-DD"
              className="px-4 py-3 text-base text-warm-black"
            />
          ) : (
            <DateTimePicker
              value={date ?? new Date()}
              mode="date"
              display="spinner"
              onChange={(_, picked) => {
                if (picked) onChange(picked)
              }}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Done selecting ${accessibilityName}`}
            onPress={onDone}
            style={{ alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 12 }}
          >
            <Text style={{ fontFamily: fonts.bold, color: colors.forest, fontSize: 15 }}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}
