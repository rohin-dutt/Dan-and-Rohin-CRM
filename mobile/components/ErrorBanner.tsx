import { View, Text } from "react-native"

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return (
    <View
      style={{
        backgroundColor: "#FEF2F2",
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#FECACA",
      }}
    >
      <Text style={{ color: "#DC2626", fontSize: 14 }}>{message}</Text>
    </View>
  )
}
