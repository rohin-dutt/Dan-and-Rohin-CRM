import { useState } from "react"
import { Platform, Text, TouchableOpacity, View } from "react-native"
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker"

type DatePickerProps = {
  label: string
  value: string
  onChange: (dateStr: string) => void
}

export function DatePicker({ label, value, onChange }: DatePickerProps) {
  const [show, setShow] = useState(false)

  const parsed = value ? new Date(value + "T00:00:00") : new Date()

  function handleChange(_event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShow(false)
    if (selected) {
      const y = selected.getFullYear()
      const m = String(selected.getMonth() + 1).padStart(2, "0")
      const d = String(selected.getDate()).padStart(2, "0")
      onChange(`${y}-${m}-${d}`)
    }
  }

  const displayText = value || "Select date"

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-warm-black mb-1">{label}</Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        className="border border-gray-200 rounded-xl px-3 py-2.5 bg-white"
      >
        <Text className={value ? "text-sm text-warm-black" : "text-sm text-gray-400"}>
          {displayText}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          value={parsed}
          onChange={handleChange}
          onTouchCancel={() => setShow(false)}
        />
      )}
      {Platform.OS === "ios" && show && (
        <TouchableOpacity
          onPress={() => setShow(false)}
          className="mt-2 items-end"
        >
          <Text className="text-sage text-sm font-semibold">Done</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
