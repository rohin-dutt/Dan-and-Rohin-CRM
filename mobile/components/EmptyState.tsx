import { View, Text, TouchableOpacity } from "react-native"

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    }}>
      <Text style={{
        fontSize: 17,
        fontWeight: "600",
        color: "#1C1917",
        textAlign: "center",
        marginBottom: 8,
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 24,
      }}>
        {body}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={{
            backgroundColor: "#7C9A7E",
            borderRadius: 8,
            paddingHorizontal: 20,
            paddingVertical: 12,
          }}
        >
          <Text style={{
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: "600",
          }}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
