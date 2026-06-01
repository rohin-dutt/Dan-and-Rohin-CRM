import { TouchableOpacity, Text } from "react-native"

export function PillButton({
  label,
  selected,
  onPress,
  selectedColor = "#7C9A7E",
}: {
  label: string
  selected: boolean
  onPress: () => void
  selectedColor?: string
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? selectedColor : "#E5E0D8",
        backgroundColor: selected ? selectedColor : "#FFFFFF",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{
        fontSize: 13,
        fontWeight: "500",
        color: selected ? "#FFFFFF" : "#1C1917",
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}
