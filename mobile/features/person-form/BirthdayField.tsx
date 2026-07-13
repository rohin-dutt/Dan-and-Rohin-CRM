import { useState } from "react"
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import { formatFullDate } from "@roots/shared"
import { YEARLESS_BIRTHDAY_YEAR } from "@/lib/format-dates"

// Dates stored with the placeholder year mean "year unknown" and render as
// month + day only.
function birthdayLabel(date: Date): string {
  if (date.getFullYear() === YEARLESS_BIRTHDAY_YEAR) {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  }
  return formatFullDate(date)
}

// Birthday field shared by add/edit person forms. Opens a modal spinner
// picker that only commits the date when the user confirms, so scrolling
// the wheels never closes the picker.
export function BirthdayField({
  date,
  onChange,
}: {
  date: Date | null
  onChange: (date: Date | null) => void
}) {
  const [pickerVisible, setPickerVisible] = useState(false)
  const [draftDate, setDraftDate] = useState<Date>(date ?? new Date(1990, 0, 1))
  const [draftNoYear, setDraftNoYear] = useState(false)

  function openPicker() {
    setDraftDate(date ?? new Date(1990, 0, 1))
    setDraftNoYear(date?.getFullYear() === YEARLESS_BIRTHDAY_YEAR)
    setPickerVisible(true)
  }

  function toggleNoYear() {
    setDraftNoYear((current) => {
      const next = !current
      setDraftDate(
        (draft) =>
          new Date(next ? YEARLESS_BIRTHDAY_YEAR : 1990, draft.getMonth(), draft.getDate()),
      )
      return next
    })
  }

  function confirmDraft() {
    onChange(
      draftNoYear
        ? new Date(YEARLESS_BIRTHDAY_YEAR, draftDate.getMonth(), draftDate.getDate())
        : draftDate,
    )
    setPickerVisible(false)
  }

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
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Change birthday"
            onPress={openPicker}
            style={{ flex: 1 }}
          >
            <Text style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 14 }}>
              {birthdayLabel(date)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear birthday"
            onPress={() => {
              onChange(null)
              setPickerVisible(false)
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
          onPress={openPicker}
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 44,
            borderWidth: 1,
            borderColor: "#E7E5E4",
            borderRadius: 12,
            paddingHorizontal: 12,
            backgroundColor: "white",
          }}
        >
          <Ionicons name="calendar-outline" size={18} color="#8F96A3" style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: fonts.body, color: "#8F96A3", fontSize: 14 }}>Select birthday</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 24 }}
          onPress={() => setPickerVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss birthday picker"
        >
          <Pressable
            style={{
              backgroundColor: "white",
              borderRadius: 20,
              paddingTop: 16,
              paddingBottom: 12,
              overflow: "hidden",
            }}
          >
            <Text
              style={{ fontFamily: fonts.bold, color: colors.warmBlack, fontSize: 16, textAlign: "center" }}
            >
              Select birthday
            </Text>
            <DateTimePicker
              value={draftDate}
              mode="date"
              display="spinner"
              themeVariant="light"
              textColor={colors.ink}
              onChange={(_, picked) => {
                if (picked) setDraftDate(picked)
              }}
              minimumDate={new Date(YEARLESS_BIRTHDAY_YEAR, 0, 1)}
              maximumDate={new Date()}
            />
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: draftNoYear }}
              accessibilityLabel="I don't know the year"
              onPress={toggleNoYear}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingBottom: 12,
              }}
            >
              <Ionicons
                name={draftNoYear ? "checkbox-outline" : "square-outline"}
                size={20}
                color={colors.forest}
              />
              <Text
                style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 14, marginLeft: 8 }}
              >
                I don't know the year
              </Text>
            </TouchableOpacity>
            <View
              style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderTopColor: "#F5F4F2",
                paddingTop: 10,
                paddingHorizontal: 16,
                gap: 10,
              }}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel birthday selection"
                onPress={() => setPickerVisible(false)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E7E5E4",
                  backgroundColor: "white",
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: colors.muted, fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Confirm birthday"
                onPress={confirmDraft}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.forest,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: "white", fontSize: 15 }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}
