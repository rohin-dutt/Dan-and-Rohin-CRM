import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { colors } from "@/constants/theme"

type ScreenProps = {
  children: React.ReactNode
  scrollable?: boolean
}

export function Screen({ children, scrollable = true }: ScreenProps) {
  if (!scrollable) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.ivory }}>
        <View className="flex-1">{children}</View>
      </SafeAreaView>
    )
  }
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.ivory }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 118 }}
        keyboardShouldPersistTaps="handled"
      >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
