import { Stack } from "expo-router"

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="permission" />
      <Stack.Screen name="cadence-defaults" />
      <Stack.Screen name="select" />
      <Stack.Screen name="categorize" />
      <Stack.Screen name="celebrate" />
      <Stack.Screen name="manual" />
    </Stack>
  )
}
