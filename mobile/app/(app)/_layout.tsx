import { Stack } from "expo-router"
import { CrmDataProvider } from "@/features/crm-data/CrmDataProvider"

export default function AppLayout() {
  return (
    <CrmDataProvider>
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
      </Stack>
    </CrmDataProvider>
  )
}
