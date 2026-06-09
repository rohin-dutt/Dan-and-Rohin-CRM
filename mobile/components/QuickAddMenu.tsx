import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { colors, fonts } from "@/constants/theme"
import { Divider, IconTile } from "@/components/RootsUI"
import { PillButton } from "@/components/PillButton"
import { INTERACTION_TYPES, updateStreakAfterAction, todayInputValue } from "@roots/shared"

type QuickAddMode = "note" | "chat"
type PickerStep = "search" | "form"

type PersonOption = {
  id: string
  name: string
  company: string | null
}

export function QuickAddMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [pickerMode, setPickerMode] = useState<QuickAddMode | null>(null)
  const [pickerStep, setPickerStep] = useState<PickerStep>("search")
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [personSearch, setPersonSearch] = useState("")
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null)

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [interactionType, setInteractionType] = useState(INTERACTION_TYPES[0])
  const [date, setDate] = useState(todayInputValue())
  const [interactionNotes, setInteractionNotes] = useState("")
  const [noteText, setNoteText] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(false)
  const [followUpDate, setFollowUpDate] = useState("")

  const filteredPeople = useMemo(() => {
    const normalized = personSearch.trim().toLowerCase()
    if (!normalized) return people
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(normalized) ||
        (p.company?.toLowerCase().includes(normalized) ?? false),
    )
  }, [people, personSearch])

  function resetPickerState() {
    setPickerStep("search")
    setPersonSearch("")
    setSelectedPerson(null)
    setFormError(null)
    setSaving(false)
    setInteractionType(INTERACTION_TYPES[0])
    setDate(todayInputValue())
    setInteractionNotes("")
    setNoteText("")
    setFollowUpEnabled(false)
    setFollowUpDate("")
  }

  function closePickerModal() {
    setPickerMode(null)
    resetPickerState()
  }

  async function openPersonPicker(mode: QuickAddMode) {
    onClose()
    setPickerMode(mode)
    setPickerStep("search")
    setPersonSearch("")
    setSelectedPerson(null)
    setFormError(null)
    setInteractionType(INTERACTION_TYPES[0])
    setDate(todayInputValue())
    setLoadingPeople(true)
    setFetchError(null)

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
      setFetchError(e instanceof Error ? e.message : "Could not load people.")
      setPeople([])
    } finally {
      setLoadingPeople(false)
    }
  }

  function handlePersonSelect(person: PersonOption) {
    setSelectedPerson(person)
    setPickerStep("form")
    setFormError(null)
  }

  async function handleSaveInteraction() {
    if (!selectedPerson) return
    if (!date.trim()) {
      setFormError("Date is required")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")
      const { error: rpcError } = await supabase.rpc("create_interaction_and_touch_person", {
        p_person_id: selectedPerson.id,
        p_type: interactionType,
        p_date: date.trim(),
        p_notes: interactionNotes.trim() || null,
        p_follow_up_needed: followUpEnabled,
        p_follow_up_date: followUpEnabled && followUpDate.trim() ? followUpDate.trim() : null,
      })
      if (rpcError) throw rpcError
      await updateStreakAfterAction(supabase)
      closePickerModal()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNote() {
    if (!selectedPerson) return
    if (!noteText.trim()) {
      setFormError("Note text is required")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")
      const { error: rpcError } = await supabase.rpc("create_interaction_and_touch_person", {
        p_person_id: selectedPerson.id,
        p_type: "Other",
        p_date: todayInputValue(),
        p_notes: noteText.trim(),
        p_follow_up_needed: false,
        p_follow_up_date: null,
      })
      if (rpcError) throw rpcError
      await updateStreakAfterAction(supabase)
      closePickerModal()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save note")
    } finally {
      setSaving(false)
    }
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
              label="Add someone new"
              description="Add someone new to your Roots"
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
        animationType="slide"
        transparent
        visible={pickerMode != null}
        onRequestClose={closePickerModal}
      >
        <Pressable className="flex-1 justify-end bg-black/30" onPress={closePickerModal}>
          <Pressable
            className="rounded-t-[30px] bg-white px-6 pt-6"
            style={{ paddingBottom: Math.max(insets.bottom + 16, 32), maxHeight: "85%" }}
            onStartShouldSetResponder={() => true}
          >
            <View className="mb-5 items-center">
              <View className="h-1.5 w-24 rounded-full bg-stone-200" />
            </View>

            {pickerStep === "search" ? (
              <>
                <View className="mb-4 flex-row items-center justify-between">
                  <View>
                    <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-xl">
                      {pickerMode === "note" ? "Add a note" : "Log a chat"}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                      {pickerMode === "note" ? "Who is it about?" : "Who did you connect with?"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={closePickerModal}
                    className="h-10 w-10 items-center justify-center rounded-full bg-stone-100"
                  >
                    <Ionicons name="close" size={18} color={colors.warmBlack} />
                  </TouchableOpacity>
                </View>

                <View className="mb-4 h-11 flex-row items-center rounded-2xl border border-stone-200 bg-stone-50 px-3">
                  <Ionicons name="search-outline" size={16} color="#60646D" />
                  <TextInput
                    value={personSearch}
                    onChangeText={setPersonSearch}
                    placeholder="Search people"
                    placeholderTextColor="#777A83"
                    className="ml-2 flex-1 text-sm"
                    style={{ fontFamily: fonts.body, color: colors.ink }}
                    autoFocus
                    accessibilityLabel="Search people"
                  />
                </View>

                {loadingPeople ? (
                  <View className="py-8">
                    <ActivityIndicator color={colors.forest} />
                  </View>
                ) : fetchError ? (
                  <Text className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">
                    {fetchError}
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
                        closePickerModal()
                        router.push("/people/new")
                      }}
                      className="mt-4 min-h-12 items-center justify-center rounded-xl bg-forest"
                    >
                      <Text style={{ fontFamily: fonts.bold }} className="text-sm text-white">
                        Add person
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : filteredPeople.length === 0 ? (
                  <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="py-4 text-center text-sm">
                    No people match "{personSearch}"
                  </Text>
                ) : (
                  <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 320 }}>
                    {filteredPeople.map((person) => (
                      <TouchableOpacity
                        key={person.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Choose ${person.name}`}
                        onPress={() => handlePersonSelect(person)}
                        className="mb-2 rounded-2xl border border-stone-100 bg-white px-4 py-3"
                      >
                        <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-base">
                          {person.name}
                        </Text>
                        {person.company ? (
                          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-0.5 text-sm">
                            {person.company}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View className="mb-4 flex-row items-center">
                  <TouchableOpacity
                    onPress={() => {
                      setPickerStep("search")
                      setFormError(null)
                    }}
                    className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-stone-100"
                    accessibilityRole="button"
                    accessibilityLabel="Back to person search"
                  >
                    <Ionicons name="arrow-back" size={18} color={colors.ink} />
                  </TouchableOpacity>
                  <View className="flex-1">
                    <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-lg">
                      {pickerMode === "note" ? "Add note" : "Log chat"}
                    </Text>
                    <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">
                      with {selectedPerson?.name}
                    </Text>
                  </View>
                </View>

                {formError ? (
                  <Text className="mb-3 rounded-xl bg-red-50 px-3 py-3 text-sm text-red-700">
                    {formError}
                  </Text>
                ) : null}

                {pickerMode === "chat" ? (
                  <>
                    <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="mb-2 text-sm">
                      Type
                    </Text>
                    <View className="mb-4 flex-row flex-wrap gap-2">
                      {INTERACTION_TYPES.map((type) => (
                        <PillButton
                          key={type}
                          label={type}
                          selected={interactionType === type}
                          onPress={() => setInteractionType(type)}
                        />
                      ))}
                    </View>

                    <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="mb-1 text-sm">
                      Date
                    </Text>
                    <TextInput
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numbers-and-punctuation"
                      className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm"
                      style={{ fontFamily: fonts.body, color: colors.ink }}
                    />
                  </>
                ) : null}

                <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="mb-1 text-sm">
                  {pickerMode === "note" ? "Note" : "Notes"}
                </Text>
                <TextInput
                  value={pickerMode === "note" ? noteText : interactionNotes}
                  onChangeText={pickerMode === "note" ? setNoteText : setInteractionNotes}
                  placeholder={pickerMode === "note" ? "What do you want to remember?" : "What did you talk about?"}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm"
                  style={{ fontFamily: fonts.body, color: colors.ink, minHeight: 96, textAlignVertical: "top" }}
                />

                {pickerMode === "chat" ? (
                  <View className="mb-4">
                    <View className="flex-row items-center justify-between py-2">
                      <View className="mr-4 flex-1">
                        <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="text-sm">
                          Set a follow-up
                        </Text>
                        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-0.5 text-xs">
                          Remind yourself to follow up
                        </Text>
                      </View>
                      <Switch
                        value={followUpEnabled}
                        onValueChange={setFollowUpEnabled}
                        trackColor={{ false: colors.border, true: colors.sage }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                    {followUpEnabled ? (
                      <>
                        <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="mb-1 text-sm">
                          Follow-up date
                        </Text>
                        <TextInput
                          value={followUpDate}
                          onChangeText={setFollowUpDate}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numbers-and-punctuation"
                          className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm"
                          style={{ fontFamily: fonts.body, color: colors.ink }}
                        />
                      </>
                    ) : null}
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={pickerMode === "note" ? handleSaveNote : handleSaveInteraction}
                  disabled={saving}
                  activeOpacity={0.8}
                  className="mb-2 min-h-12 items-center justify-center rounded-2xl bg-forest"
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontFamily: fonts.bold }} className="text-base text-white">
                      {pickerMode === "note" ? "Save note" : "Save"}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
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
      className="min-h-20 flex-row items-center py-4"
    >
      <IconTile icon={icon} color={color} background={background} size={52} />
      <View className="ml-4 flex-1">
        <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-[17px]">
          {label}
        </Text>
        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
