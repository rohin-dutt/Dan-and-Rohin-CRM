import { View, Text, TextInput, TextInputProps } from "react-native"

export function TextField({
  label,
  error,
  ...props
}: TextInputProps & {
  label: string
  error?: string
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: "500", color: "#1C1917", marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        style={{
          height: 44,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: error ? "#DC2626" : "#E5E0D8",
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 12,
          fontSize: 15,
          color: "#1C1917",
        }}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
      {error && (
        <Text style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}>{error}</Text>
      )}
    </View>
  )
}
