import { Tabs } from "expo-router"
import { useState } from "react"
import { Ionicons } from "@expo/vector-icons"
import { View } from "react-native"
import { QuickAddMenu } from "@/components/QuickAddMenu"
import { colors } from "@/constants/theme"

export default function TabsLayout() {
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  return (
    <View style={{ flex: 1, backgroundColor: colors.ivory }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            minHeight: 92,
            paddingTop: 12,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: "rgba(232, 227, 217, 0.9)",
            backgroundColor: "rgba(252, 251, 247, 0.96)",
            shadowColor: "#000000",
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: -6 },
            elevation: 16,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
            marginTop: 1,
          },
          tabBarActiveTintColor: colors.forest,
          tabBarInactiveTintColor: colors.muted,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color} size={size + 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="people"
          options={{
            title: "People",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" color={color} size={size + 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="follow-ups"
          listeners={{
            tabPress: (event) => {
              event.preventDefault()
              setQuickAddOpen(true)
            },
          }}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => (
              <View className="h-14 w-14 items-center justify-center rounded-full bg-forest shadow-lg">
                <Ionicons name="add" color="#FFFFFF" size={34} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="roots-map"
          options={{
            title: "Your Roots",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map-outline" color={color} size={size + 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" color={color} size={size + 2} />
            ),
          }}
        />
      </Tabs>
      <QuickAddMenu visible={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </View>
  )
}
