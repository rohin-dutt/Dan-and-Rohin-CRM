import { Stack } from "expo-router"

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="onboarding"
        options={{
          presentation: "fullScreenModal",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="people/[id]" />
      <Stack.Screen name="people/new" />
      <Stack.Screen name="people/import-contacts" />
      <Stack.Screen name="people/[id]/edit" />
      <Stack.Screen name="people/[id]/log" />
    </Stack>
  )
}
