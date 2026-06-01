import { View, ActivityIndicator } from "react-native"

export function LoadingState() {
  return (
    <View style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F0EBE1",
    }}>
      <ActivityIndicator color="#7C9A7E" size="large" />
    </View>
  )
}
