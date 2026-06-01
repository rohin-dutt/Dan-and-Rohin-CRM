import { View, ViewProps } from "react-native"

export function Card({
  children,
  style,
  ...props
}: ViewProps) {
  return (
    <View
      style={[{
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E0D8",
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      }, style]}
      {...props}
    >
      {children}
    </View>
  )
}
