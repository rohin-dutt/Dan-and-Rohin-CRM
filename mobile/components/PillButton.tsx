import { Text, TouchableOpacity } from "react-native"

type PillButtonProps = {
  label: string
  selected: boolean
  onPress: () => void
}

export function PillButton({ label, selected, onPress }: PillButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-full border px-4 py-1.5 ${
        selected
          ? "bg-forest border-forest"
          : "bg-white border-gray-200"
      }`}
    >
      <Text
        className={`text-sm font-medium ${selected ? "text-white" : "text-warm-black"}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}
