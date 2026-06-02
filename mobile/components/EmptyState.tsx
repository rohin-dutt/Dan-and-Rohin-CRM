import { Text, TouchableOpacity, View } from "react-native"

type EmptyStateProps = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-lg font-semibold text-warm-black text-center mb-2">{title}</Text>
      {description && (
        <Text className="text-sm text-gray-500 text-center mb-6">{description}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="bg-sage px-6 py-3 rounded-xl"
        >
          <Text className="text-white text-sm font-semibold">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}
