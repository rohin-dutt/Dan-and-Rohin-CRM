import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { View } from "react-native"
import { QuickAddMenu } from "@/components/QuickAddMenu"
import { colors } from "@/constants/theme"

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.cream },
          tabBarActiveTintColor: colors.sage,
          tabBarInactiveTintColor: colors.muted,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="people"
          options={{
            title: "People",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen name="follow-ups" options={{ href: null }} />
        <Tabs.Screen
          name="roots-map"
          options={{
            title: "Your Roots",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
      <QuickAddMenu />
    </View>
  )
}
