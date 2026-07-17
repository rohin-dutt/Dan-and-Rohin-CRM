import { forwardRef } from "react"
import { Text, TextInput, type TextInputProps, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"

type CompactTextFieldProps = {
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
  returnKeyType?: TextInputProps["returnKeyType"]
  onSubmitEditing?: TextInputProps["onSubmitEditing"]
  submitBehavior?: TextInputProps["submitBehavior"]
  blurOnSubmit?: boolean
}

export const CompactTextField = forwardRef<TextInput, CompactTextFieldProps>(function CompactTextField(
  {
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
    returnKeyType,
    onSubmitEditing,
    submitBehavior,
    blurOnSubmit,
  },
  ref,
) {
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
          ref={ref}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8F96A3"
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          className="flex-1 px-3"
          style={{
            minHeight: multiline ? 80 : 44,
            fontSize: 14,
            paddingVertical: multiline ? 12 : 0,
            fontFamily: fonts.body,
            color: colors.ink,
            textAlignVertical: multiline ? "top" : "center",
          }}
          returnKeyType={returnKeyType ?? (multiline ? "default" : "done")}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          submitBehavior={
            submitBehavior ?? (multiline ? (blurOnSubmit ? "blurAndSubmit" : "newline") : "blurAndSubmit")
          }
        />
      </View>
    </View>
  )
})
