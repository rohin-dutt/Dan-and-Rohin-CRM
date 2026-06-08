import { useState } from "react"
import { ActivityIndicator, Modal, Pressable, Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { colors, fonts } from "@/constants/theme"
import { Divider, IconTile } from "@/components/RootsUI"

type QuickAddMode = "note" | "chat"

type PersonOption = {
  id: string
  name: string
  company: string | null
}

export function QuickAddMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [pickerMode, setPickerMode] = useState<QuickAddMode | null>(null)
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openPersonPicker(mode: QuickAddMode) {
    onClose()
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
    <>
      <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
        <Pressable
          className="flex-1 justify-end bg-black/45"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss quick add menu"
        >
          <Pressable
            className="rounded-t-[30px] bg-white px-6 pt-6"
            style={{ paddingBottom: Math.max(insets.bottom + 20, 36) }}
          >
            <View className="mb-8 items-center">
              <View className="h-1.5 w-24 rounded-full bg-stone-200" />
            </View>
            <QuickAddAction
              icon="person-outline"
              label="Add person"
              description="Add a new person to your network"
              color={colors.forest}
              background={colors.mint}
              onPress={() => {
                onClose()
                router.push("/people/new")
              }}
            />
            <Divider />
            <QuickAddAction
              icon="chatbubble-outline"
              label="Log interaction"
              description="Log a chat, call, or meeting"
              color="#98520B"
              background="#FBF1E9"
              onPress={() => void openPersonPicker("chat")}
            />
            <Divider />
            <QuickAddAction
              icon="calendar-outline"
              label="Add note"
              description="Save a note about someone"
              color={colors.purple}
              background="#F2EEFA"
              onPress={() => void openPersonPicker("note")}
            />

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel quick add"
              onPress={onClose}
              activeOpacity={0.8}
              className="mt-8 min-h-16 items-center justify-center rounded-2xl bg-stone-100"
            >
              <Text style={{ fontFamily: fonts.bold, color: colors.forest }} className="text-xl">
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={pickerMode != null}
        onRequestClose={() => setPickerMode(null)}
      >
        <Pressable className="flex-1 justify-end bg-black/30" onPress={() => setPickerMode(null)}>
          <Pressable
            className="rounded-t-[30px] bg-white px-6 pt-6"
            style={{ paddingBottom: Math.max(insets.bottom + 20, 34) }}
          >
            <View className="mb-5 items-center">
              <View className="h-1.5 w-24 rounded-full bg-stone-200" />
            </View>
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-xl">
                  Choose a person
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                  {pickerMode === "note" ? "Add a note to someone." : "Log a chat, call, or meeting."}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close person picker"
                onPress={() => setPickerMode(null)}
                className="h-10 w-10 items-center justify-center rounded-full bg-stone-100"
              >
                <Ionicons name="close" size={18} color={colors.warmBlack} />
              </TouchableOpacity>
            </View>

            {loadingPeople ? (
              <View className="py-8">
                <ActivityIndicator color={colors.forest} />
              </View>
            ) : error ? (
              <Text className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">
                {error}
              </Text>
            ) : people.length === 0 ? (
              <View className="rounded-2xl border border-stone-100 bg-white p-4">
                <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
                  No people yet
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                  Add someone first, then you can log notes and chats.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setPickerMode(null)
                    router.push("/people/new")
                  }}
                  className="mt-4 min-h-12 items-center justify-center rounded-xl bg-forest"
                >
                  <Text style={{ fontFamily: fonts.bold }} className="text-sm text-white">
                    Add person
                  </Text>
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
                    className="mb-2 rounded-2xl border border-stone-100 bg-white px-4 py-3"
                  >
                    <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
                      {person.name}
                    </Text>
                    {person.company && (
                      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-0.5 text-sm">
                        {person.company}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
                {people.length > 8 && (
                  <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="pt-1 text-center text-xs">
                    Showing first 8. Use People search for the full list.
                  </Text>
                )}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function QuickAddAction({
  icon,
  label,
  description,
  color,
  background,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  description: string
  color: string
  background: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      activeOpacity={0.76}
      className="min-h-28 flex-row items-center py-5"
    >
      <IconTile icon={icon} color={color} background={background} size={70} />
      <View className="ml-5 flex-1">
        <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-xl">
          {label}
        </Text>
        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-lg">
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
