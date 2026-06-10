import { useState } from "react"
import { Switch, Text, TextInput, TouchableOpacity, View } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import {
  createMomentDraft,
  formatFullDate,
  parseLocalDateString,
  removeMomentDraft,
  toLocalDateString,
  updateMomentDraft,
  type ImportantMomentDraft,
} from "@roots/shared"

// Add/edit list of important-moment drafts. Parent owns the draft array;
// the expanded date-picker row is local UI state.
export function MomentDraftsEditor({
  moments,
  onChange,
}: {
  moments: ImportantMomentDraft[]
  onChange: (moments: ImportantMomentDraft[]) => void
}) {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)

  return (
    <View className="mb-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="text-sm">
          Important moments
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add important moment"
          onPress={() => onChange([...moments, createMomentDraft()])}
        >
          <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
            Add
          </Text>
        </TouchableOpacity>
      </View>
      {moments.length === 0 ? (
        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-xs leading-4">
          Add dates like an anniversary or graduation.
        </Text>
      ) : (
        moments.map((moment, index) => (
          <View key={index} className="mb-3 rounded-xl border border-stone-200 bg-white p-3">
            <View className="flex-row items-center justify-between">
              <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} className="text-sm">
                Moment {index + 1}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Remove important moment"
                onPress={() => {
                  setPickerIndex(null)
                  onChange(removeMomentDraft(moments, index))
                }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
            <TextInput
              accessibilityLabel="Moment label"
              value={moment.label}
              onChangeText={(text) => onChange(updateMomentDraft(moments, index, { label: text }))}
              placeholder="Anniversary, graduation..."
              placeholderTextColor="#8F96A3"
              className="mt-2 rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
              style={{ fontFamily: fonts.body, color: colors.ink }}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Select moment date"
              onPress={() => setPickerIndex((current) => (current === index ? null : index))}
              className="mt-2 flex-row items-center rounded-xl border bg-white px-3 py-2.5"
              style={{ borderColor: pickerIndex === index ? colors.forest : "#E7E5E4" }}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={moment.date ? colors.forest : "#8F96A3"}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{ fontFamily: fonts.body, color: moment.date ? colors.ink : "#8F96A3", fontSize: 14, flex: 1 }}
              >
                {parseLocalDateString(moment.date)
                  ? formatFullDate(parseLocalDateString(moment.date)!)
                  : "Select date"}
              </Text>
              <Ionicons name={pickerIndex === index ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
            </TouchableOpacity>
            {pickerIndex === index ? (
              <View className="mt-2 overflow-hidden rounded-xl border bg-white" style={{ borderColor: colors.forest }}>
                <DateTimePicker
                  value={parseLocalDateString(moment.date) ?? new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(_, picked) => {
                    if (picked) onChange(updateMomentDraft(moments, index, { date: toLocalDateString(picked) }))
                  }}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Done selecting moment date"
                  onPress={() => setPickerIndex(null)}
                  style={{ alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 12 }}
                >
                  <Text style={{ fontFamily: fonts.bold, color: colors.forest, fontSize: 15 }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <View className="mt-2 flex-row items-center justify-between">
              <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="text-sm">
                Repeat yearly
              </Text>
              <Switch
                value={moment.recurs_yearly}
                onValueChange={(value) => onChange(updateMomentDraft(moments, index, { recurs_yearly: value }))}
                trackColor={{ false: colors.border, true: colors.sage }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        ))
      )}
    </View>
  )
}
