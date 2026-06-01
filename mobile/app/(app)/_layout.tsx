import { Tabs } from "expo-router"

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="dashboard" options={{ title: "Home" }} />
      <Tabs.Screen name="people" options={{ title: "People" }} />
      <Tabs.Screen name="follow-ups" options={{ title: "Follow Ups" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  )
}
