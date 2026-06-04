import { Text, TextInput, TextInputProps, View } from "react-native"

type TextFieldProps = TextInputProps & {
  label: string
  error?: string | null
}

export function TextField({ label, error, ...props }: TextFieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-warm-black mb-1">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        className={`border rounded-xl px-3 py-3 text-sm bg-white text-warm-black ${
          error ? "border-red-400" : "border-gray-200"
        }`}
        placeholderTextColor="#9CA3AF"
      />
      {error && <Text className="text-xs text-red-500 mt-1">{error}</Text>}
    </View>
  )
}
