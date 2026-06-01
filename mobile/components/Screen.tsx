import { ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export function Screen({
  children,
  scroll = true,
  padding = true,
}: {
  children: React.ReactNode
  scroll?: boolean
  padding?: boolean
}) {
  const insets = useSafeAreaInsets()
  const style = {
    flex: 1,
    backgroundColor: "#F0EBE1",
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingHorizontal: padding ? 24 : 0,
  }
  if (scroll) {
    return (
      <ScrollView style={style} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    )
  }
  return <View style={style}>{children}</View>
}
