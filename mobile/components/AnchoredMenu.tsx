import { useRef, useState } from "react"
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"

// Measures an anchor view and toggles a floating menu below it.
export function useAnchoredMenu() {
  const anchorRef = useRef<View>(null)
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  function toggle() {
    if (visible) {
      setVisible(false)
      return
    }
    anchorRef.current?.measure((_, __, ___, height, pageX, pageY) => {
      setPosition({ x: pageX, y: pageY + height })
      setVisible(true)
    })
  }

  return { anchorRef, visible, position, toggle, close: () => setVisible(false) }
}

export function AnchoredMenu<T extends string | number>({
  visible,
  position,
  options,
  selectedKey,
  onSelect,
  onClose,
}: {
  visible: boolean
  position: { x: number; y: number }
  options: ReadonlyArray<{ key: T; label: string }>
  selectedKey: T | null
  onSelect: (key: T) => void
  onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <Pressable
          style={{
            position: "absolute",
            top: position.y + 4,
            left: position.x,
            backgroundColor: "white",
            borderRadius: 12,
            minWidth: 200,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 8,
            overflow: "hidden",
          }}
        >
          {options.map((option, index) => (
            <TouchableOpacity
              key={String(option.key)}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              onPress={() => {
                onSelect(option.key)
                onClose()
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 13,
                borderBottomWidth: index < options.length - 1 ? 1 : 0,
                borderBottomColor: "#F5F4F2",
              }}
            >
              <Text style={{ fontFamily: fonts.medium, color: colors.forest, fontSize: 14 }}>
                {option.label}
              </Text>
              {selectedKey === option.key ? (
                <Ionicons name="checkmark" size={16} color={colors.forest} />
              ) : null}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
