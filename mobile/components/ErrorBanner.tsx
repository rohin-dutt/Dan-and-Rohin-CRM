import { Text, View } from "react-native"

type ErrorBannerProps = {
  message: string
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
      <Text className="text-sm text-red-700">{message}</Text>
    </View>
  )
}
