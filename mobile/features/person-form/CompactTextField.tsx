import { Text, TextInput, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"

export function CompactTextField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
  autoCapitalize,
  maxLength,
  required,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  multiline?: boolean
  keyboardType?: "default" | "email-address" | "phone-pad" | "numbers-and-punctuation"
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
  maxLength?: number
  required?: boolean
}) {
  return (
    <View className="mb-3">
      <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
        {label}
        {required ? <Text style={{ color: "#B91C1C" }}> *</Text> : null}
      </Text>
      <View
        className={`flex-row rounded-xl border border-stone-200 bg-white ${multiline ? "items-start" : "items-center"}`}
      >
        <View
          className={`items-center justify-center border-r border-stone-200 ${multiline ? "mt-2" : ""}`}
          style={{ width: 44, height: multiline ? 40 : 44 }}
        >
          <Ionicons name={icon} size={20} color={colors.forest} />
        </View>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8F96A3"
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          className="flex-1 px-3 text-sm"
          style={{
            minHeight: multiline ? 80 : 44,
            paddingVertical: multiline ? 12 : 0,
            fontFamily: fonts.body,
            color: colors.ink,
            textAlignVertical: multiline ? "top" : "center",
          }}
          returnKeyType={multiline ? "default" : "next"}
        />
      </View>
    </View>
  )
}
