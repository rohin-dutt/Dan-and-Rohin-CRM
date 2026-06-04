import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

type ScreenProps = {
  children: React.ReactNode
  scrollable?: boolean
}

export function Screen({ children, scrollable = true }: ScreenProps) {
  if (!scrollable) {
    return (
      <SafeAreaView className="flex-1 bg-cream">
        <View className="flex-1">{children}</View>
      </SafeAreaView>
    )
  }
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
