import { useEffect, useState } from "react"
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { colors, fonts } from "@/constants/theme"

// Centered modal date picker (same pattern as the birthday picker): edits a
// draft date and only commits it when the user taps Done, so scrolling the
// wheels never closes the picker. Tapping the backdrop dismisses only this
// modal, never the sheet or screen underneath it.
export function DatePickerModal({
  visible,
  title,
  date,
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
}: {
  visible: boolean
  title: string
  date: Date | null
  minimumDate?: Date
  maximumDate?: Date
  onConfirm: (date: Date) => void
  onCancel: () => void
}) {
  const [draftDate, setDraftDate] = useState<Date>(date ?? new Date())

  useEffect(() => {
    if (visible) setDraftDate(date ?? new Date())
  }, [visible, date])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={{ flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 24 }}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${title.toLowerCase()} picker`}
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
            {title}
          </Text>
          <DateTimePicker
            value={draftDate}
            mode="date"
            display="spinner"
            onChange={(_, picked) => {
              if (picked) setDraftDate(picked)
            }}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
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
              accessibilityLabel={`Cancel ${title.toLowerCase()}`}
              onPress={onCancel}
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
              accessibilityLabel={`Confirm ${title.toLowerCase()}`}
              onPress={() => onConfirm(draftDate)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: colors.forest,
              }}
            >
              <Text style={{ fontFamily: fonts.semibold, color: "white", fontSize: 15 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
