import { ActivityIndicator, Text, TouchableOpacity } from "react-native"
import { colors } from "@/constants/theme"

type ButtonProps = {
  title: string
  onPress: () => void
  loading?: boolean
  variant?: "primary" | "secondary"
  disabled?: boolean
}

export function Button({ title, onPress, loading, variant = "primary", disabled }: ButtonProps) {
  const isPrimary = variant === "primary"
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      className={`w-full min-h-11 rounded-xl py-3.5 items-center justify-center ${
        isPrimary ? "bg-sage" : "bg-white border border-gray-200"
      } ${disabled || loading ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#fff" : colors.sage} />
      ) : (
        <Text
          className={`text-sm font-semibold ${isPrimary ? "text-white" : "text-warm-black"}`}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}
