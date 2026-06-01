import { TouchableOpacity, Text, ActivityIndicator } from "react-native"

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
}: {
  title: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: "primary" | "secondary"
}) {
  const isPrimary = variant === "primary"
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        height: 48,
        borderRadius: 8,
        backgroundColor: isPrimary ? "#7C9A7E" : "transparent",
        borderWidth: isPrimary ? 0 : 1,
        borderColor: "#E5E0D8",
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled || loading ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#fff" : "#7C9A7E"} />
      ) : (
        <Text style={{ color: isPrimary ? "#fff" : "#1C1917", fontSize: 15, fontWeight: "600" }}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  )
}
