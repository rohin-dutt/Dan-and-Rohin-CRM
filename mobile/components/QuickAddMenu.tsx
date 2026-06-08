import { useState } from "react"
import { ActivityIndicator, Modal, Pressable, Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { colors } from "@/constants/theme"

type QuickAddMode = "note" | "chat"

type PersonOption = {
  id: string
  name: string
  company: string | null
}

export function QuickAddMenu() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [menuOpen, setMenuOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<QuickAddMode | null>(null)
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPersonPicker(mode: QuickAddMode) {
    setMenuOpen(false)
    setPickerMode(mode)
    setLoadingPeople(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("You must be signed in.")

      const { data, error: peopleError } = await supabase
        .from("people")
        .select("id, name, company")
        .eq("user_id", session.user.id)
        .order("name", { ascending: true })

      if (peopleError) throw peopleError
      setPeople(data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load people.")
      setPeople([])
    } finally {
      setLoadingPeople(false)
    }
  }

  function routeToPersonLog(personId: string) {
    const action = pickerMode === "note" ? "note" : "chat"
    setPickerMode(null)
    router.push(`/people/${personId}/log?action=${action}`)
  }

  return (
    <View pointerEvents="box-none" className="absolute inset-0">
      {menuOpen && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss quick add menu"
          onPress={() => setMenuOpen(false)}
          className="absolute inset-0"
        />
      )}

      <View
        className="absolute right-4 items-end"
        style={{ top: Math.max(insets.top + 8, 18) }}
        pointerEvents="box-none"
      >
        {menuOpen && (
          <View className="mb-2 w-44 rounded-2xl border border-gray-100 bg-white p-2 shadow-lg">
            <QuickAddAction
              icon="person-add-outline"
              label="Add person"
              onPress={() => {
                setMenuOpen(false)
                router.push("/people/new")
              }}
            />
            <QuickAddAction
              icon="document-text-outline"
              label="Add note"
              onPress={() => void openPersonPicker("note")}
            />
            <QuickAddAction
              icon="chatbubble-ellipses-outline"
              label="Log chat"
              onPress={() => void openPersonPicker("chat")}
            />
          </View>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={menuOpen ? "Close quick add menu" : "Open quick add menu"}
          accessibilityHint="Add a person, note, or chat"
          activeOpacity={0.82}
          onPress={() => setMenuOpen((value) => !value)}
          className="h-12 w-12 items-center justify-center rounded-full bg-sage shadow-lg"
        >
          <Ionicons name={menuOpen ? "close" : "add"} size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={pickerMode != null}
        onRequestClose={() => setPickerMode(null)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/25"
          onPress={() => setPickerMode(null)}
        >
          <Pressable className="rounded-t-3xl bg-cream px-5 pb-8 pt-5">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-base font-semibold text-warm-black">
                  Choose a person
                </Text>
                <Text className="mt-0.5 text-xs text-gray-500">
                  {pickerMode === "note" ? "Add a note to an existing person." : "Log a chat with someone."}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close person picker"
                onPress={() => setPickerMode(null)}
                className="h-9 w-9 items-center justify-center rounded-full bg-white"
              >
                <Ionicons name="close" size={18} color={colors.warmBlack} />
              </TouchableOpacity>
            </View>

            {loadingPeople ? (
              <View className="py-8">
                <ActivityIndicator color={colors.sage} />
              </View>
            ) : error ? (
              <Text className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">
                {error}
              </Text>
            ) : people.length === 0 ? (
              <View className="rounded-2xl border border-gray-100 bg-white p-4">
                <Text className="text-sm font-semibold text-warm-black">No people yet</Text>
                <Text className="mt-1 text-xs text-gray-500">
                  Add someone first, then you can log notes and chats.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setPickerMode(null)
                    router.push("/people/new")
                  }}
                  className="mt-4 min-h-11 items-center justify-center rounded-xl bg-sage"
                >
                  <Text className="text-sm font-semibold text-white">Add person</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="max-h-96">
                {people.slice(0, 8).map((person) => (
                  <TouchableOpacity
                    key={person.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${person.name}`}
                    onPress={() => routeToPersonLog(person.id)}
                    className="mb-2 rounded-2xl border border-gray-100 bg-white px-4 py-3"
                  >
                    <Text className="text-sm font-semibold text-warm-black">{person.name}</Text>
                    {person.company && (
                      <Text className="mt-0.5 text-xs text-gray-500">{person.company}</Text>
                    )}
                  </TouchableOpacity>
                ))}
                {people.length > 8 && (
                  <Text className="pt-1 text-center text-xs text-gray-500">
                    Showing first 8. Use People search for the full list.
                  </Text>
                )}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function QuickAddAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-11 flex-row items-center rounded-xl px-3 py-2"
    >
      <Ionicons name={icon} size={18} color={colors.sage} />
      <Text className="ml-3 text-sm font-semibold text-warm-black">{label}</Text>
    </TouchableOpacity>
  )
}
