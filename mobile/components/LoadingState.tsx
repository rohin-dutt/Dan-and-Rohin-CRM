import { ActivityIndicator, View } from "react-native"
import { colors } from "@/constants/theme"

export function LoadingState() {
  return (
    <View className="flex-1 bg-cream items-center justify-center">
      <ActivityIndicator size="large" color={colors.sage} />
    </View>
  )
}
