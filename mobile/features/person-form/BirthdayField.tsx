import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import { formatBirthdayParts, isValidBirthdayParts, type BirthdayParts } from "@roots/shared"

function numericText(value: number | null): string {
  return value == null ? "" : String(value)
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isInteger(parsed) ? parsed : null
}

export function BirthdayField({
  value,
  onChange,
}: {
  value: BirthdayParts
  onChange: (value: BirthdayParts) => void
}) {
  const hasValue = value.month != null || value.day != null || value.year != null
  const valid = isValidBirthdayParts(value)

  function update(part: keyof BirthdayParts, rawValue: string) {
    onChange({ ...value, [part]: parseNumber(rawValue) })
  }

  return (
    <View className="mb-3">
      <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
        Birthday
      </Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="mb-1 text-xs">
            Month
          </Text>
          <TextInput
            accessibilityLabel="Birthday month"
            value={numericText(value.month)}
            onChangeText={(text) => update("month", text)}
            placeholder="MM"
            placeholderTextColor="#8F96A3"
            keyboardType="number-pad"
            maxLength={2}
            className="rounded-xl border border-stone-200 bg-white px-3 text-sm"
            style={{ height: 44, fontFamily: fonts.body, color: colors.ink }}
          />
        </View>
        <View className="flex-1">
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="mb-1 text-xs">
            Day
          </Text>
          <TextInput
            accessibilityLabel="Birthday day"
            value={numericText(value.day)}
            onChangeText={(text) => update("day", text)}
            placeholder="DD"
            placeholderTextColor="#8F96A3"
            keyboardType="number-pad"
            maxLength={2}
            className="rounded-xl border border-stone-200 bg-white px-3 text-sm"
            style={{ height: 44, fontFamily: fonts.body, color: colors.ink }}
          />
        </View>
        <View className="flex-[1.4]">
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="mb-1 text-xs">
            Year optional
          </Text>
          <TextInput
            accessibilityLabel="Birthday year optional"
            value={numericText(value.year)}
            onChangeText={(text) => update("year", text)}
            placeholder="YYYY"
            placeholderTextColor="#8F96A3"
            keyboardType="number-pad"
            maxLength={4}
            className="rounded-xl border border-stone-200 bg-white px-3 text-sm"
            style={{ height: 44, fontFamily: fonts.body, color: colors.ink }}
          />
        </View>
        {hasValue ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear birthday"
            onPress={() => onChange({ month: null, day: null, year: null })}
            className="mt-5 h-11 w-9 items-center justify-center"
          >
            <Ionicons name="close-circle" size={18} color={colors.forest} />
          </TouchableOpacity>
        ) : null}
      </View>
      {hasValue ? (
        <Text
          style={{ fontFamily: fonts.body, color: valid ? colors.muted : colors.error }}
          className="mt-1.5 text-xs"
        >
          {valid ? formatBirthdayParts(value) : "Enter a valid month and day."}
        </Text>
      ) : null}
    </View>
  )
}
