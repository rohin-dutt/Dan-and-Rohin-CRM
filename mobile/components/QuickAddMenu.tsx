import { useCallback, useMemo, useState } from "react"
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { colors, fonts } from "@/constants/theme"
import { Divider, IconTile } from "@/components/RootsUI"
import { BottomSheetModal } from "@/components/BottomSheetModal"
import { PillButton } from "@/components/PillButton"
import { INTERACTION_TYPES, updateStreakAfterAction, todayInputValue } from "@roots/shared"

type QuickAddMode = "note" | "chat"

type PersonOption = {
  id: string
  name: string
  company: string | null
}

export function QuickAddMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()

  const [pickerMode, setPickerMode] = useState<QuickAddMode | null>(null)
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Person typeahead
  const [personSearch, setPersonSearch] = useState("")
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null)
  const [personInputFocused, setPersonInputFocused] = useState(false)

  // Chat fields
  const [interactionType, setInteractionType] = useState(INTERACTION_TYPES[0])
  const [date, setDate] = useState(todayInputValue())
  const [interactionNotes, setInteractionNotes] = useState("")

  // Note fields
  const [noteText, setNoteText] = useState("")

  // Common
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const filteredPeople = useMemo(() => {
    const normalized = personSearch.trim().toLowerCase()
    if (!normalized) return people.slice(0, 5)
    return people
      .filter(
        (p) =>
          p.name.toLowerCase().includes(normalized) ||
          (p.company?.toLowerCase().includes(normalized) ?? false),
      )
      .slice(0, 5)
  }, [people, personSearch])

  const showPersonResults = personInputFocused && !selectedPerson

  const resetForm = useCallback(() => {
    setPersonSearch("")
    setSelectedPerson(null)
    setPersonInputFocused(false)
    setFormError(null)
    setSaving(false)
    setInteractionType(INTERACTION_TYPES[0])
    setDate(todayInputValue())
    setInteractionNotes("")
    setNoteText("")
  }, [])

  function closeForm() {
    setPickerMode(null)
    resetForm()
  }

  async function openForm(mode: QuickAddMode) {
    onClose()
    resetForm()
    setPickerMode(mode)
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

  async function handleSaveInteraction() {
    if (!selectedPerson) {
      setFormError("Please select a person first")
      return
    }
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
        p_follow_up_needed: false,
        p_follow_up_date: null,
      })
      if (rpcError) throw rpcError
      await updateStreakAfterAction(supabase)
      closeForm()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNote() {
    if (!selectedPerson) {
      setFormError("Please select a person first")
      return
    }
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
      const { error: insertError } = await supabase.from("person_notes").insert({
        user_id: session.user.id,
        person_id: selectedPerson.id,
        body: noteText.trim(),
        note_date: todayInputValue(),
      })
      if (insertError) throw insertError
      closeForm()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save note")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* ── Action sheet ──────────────────────────────────────────── */}
      <BottomSheetModal visible={visible} onClose={onClose} animationType="fade" backdropOpacity={0.45} avoidKeyboard={false} accessibilityLabel="Dismiss quick add menu">
          <View className="px-6 pt-6">
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
              onPress={() => void openForm("chat")}
            />
            <Divider />
            <QuickAddAction
              icon="calendar-outline"
              label="Add note"
              description="Save a note about someone"
              color={colors.purple}
              background="#F2EEFA"
              onPress={() => void openForm("note")}
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
          </View>
      </BottomSheetModal>

      {/* ── Single-step form modal ─────────────────────────────────── */}
      <BottomSheetModal
        visible={pickerMode != null}
        onClose={closeForm}
        backdropOpacity={0.3}
        sheetStyle={{ maxHeight: "90%" }}
        accessibilityLabel="Dismiss quick add form"
      >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}
              >
                {/* Handle */}
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <View style={{ height: 6, width: 96, borderRadius: 3, backgroundColor: "#E7E5E4" }} />
                </View>

                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 20, flex: 1 }}>
                    {pickerMode === "note" ? "Add a note" : "Log a chat"}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={closeForm}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "#F5F5F4",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close" size={18} color={colors.warmBlack} />
                  </TouchableOpacity>
                </View>

                {formError ? (
                  <Text
                    style={{
                      fontFamily: fonts.body,
                      color: "#B91C1C",
                      fontSize: 13,
                      backgroundColor: "#FEF2F2",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 16,
                    }}
                  >
                    {formError}
                  </Text>
                ) : null}

                {/* Person search */}
                <Text
                  style={{
                    fontFamily: fonts.medium,
                    color: colors.ink,
                    fontSize: 14,
                    marginBottom: 8,
                  }}
                >
                  {pickerMode === "note" ? "Who is this about?" : "Who did you talk to?"}
                </Text>

                {selectedPerson ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.mint,
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      marginBottom: 20,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 15 }}>
                        {selectedPerson.name}
                      </Text>
                      {selectedPerson.company ? (
                        <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 13, marginTop: 1 }}>
                          {selectedPerson.company}
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Clear person selection"
                      onPress={() => {
                        setSelectedPerson(null)
                        setPersonSearch("")
                        setFormError(null)
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.forest} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginBottom: 4 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        height: 44,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: "#E7E5E4",
                        backgroundColor: "#FAFAF9",
                        paddingHorizontal: 12,
                        marginBottom: 0,
                      }}
                    >
                      {loadingPeople ? (
                        <ActivityIndicator size="small" color={colors.forest} style={{ marginRight: 8 }} />
                      ) : (
                        <Ionicons name="search-outline" size={16} color="#60646D" style={{ marginRight: 8 }} />
                      )}
                      <TextInput
                        value={personSearch}
                        onChangeText={setPersonSearch}
                        placeholder="Search by name…"
                        placeholderTextColor="#777A83"
                        style={{ flex: 1, fontFamily: fonts.body, color: colors.ink, fontSize: 14 }}
                        onFocus={() => setPersonInputFocused(true)}
                        onBlur={() => {
                          setTimeout(() => setPersonInputFocused(false), 150)
                        }}
                        accessibilityLabel="Search people"
                      />
                    </View>

                    {showPersonResults && filteredPeople.length > 0 ? (
                      <View
                        style={{
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: "#E7E5E4",
                          backgroundColor: "white",
                          marginTop: 4,
                          overflow: "hidden",
                          marginBottom: 12,
                        }}
                      >
                        {filteredPeople.map((person, index) => (
                          <TouchableOpacity
                            key={person.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${person.name}`}
                            onPress={() => {
                              setSelectedPerson(person)
                              setPersonSearch("")
                              setPersonInputFocused(false)
                              setFormError(null)
                            }}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 11,
                              borderBottomWidth: index < filteredPeople.length - 1 ? 1 : 0,
                              borderBottomColor: "#F5F5F4",
                            }}
                          >
                            <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 14 }}>
                              {person.name}
                            </Text>
                            {person.company ? (
                              <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginTop: 1 }}>
                                {person.company}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : showPersonResults && !loadingPeople && personSearch.trim() && filteredPeople.length === 0 ? (
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          color: colors.muted,
                          fontSize: 13,
                          marginTop: 6,
                          marginBottom: 12,
                        }}
                      >
                        No people match "{personSearch}"
                      </Text>
                    ) : !loadingPeople && people.length === 0 && !fetchError ? (
                      <View
                        style={{
                          borderRadius: 14,
                          borderWidth: 1,
                          borderColor: "#E7E5E4",
                          backgroundColor: "white",
                          padding: 16,
                          marginTop: 4,
                          marginBottom: 12,
                        }}
                      >
                        <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 14 }}>
                          No people yet
                        </Text>
                        <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 13, marginTop: 4 }}>
                          Add someone first, then you can log notes and chats.
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            closeForm()
                            router.push("/people/new")
                          }}
                          style={{
                            marginTop: 12,
                            minHeight: 40,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 10,
                            backgroundColor: colors.forest,
                          }}
                        >
                          <Text style={{ fontFamily: fonts.bold, color: "white", fontSize: 13 }}>
                            Add person
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : fetchError ? (
                      <Text
                        style={{
                          fontFamily: fonts.body,
                          color: "#B91C1C",
                          fontSize: 13,
                          backgroundColor: "#FEF2F2",
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          marginTop: 4,
                          marginBottom: 12,
                        }}
                      >
                        {fetchError}
                      </Text>
                    ) : (
                      <View style={{ height: 16 }} />
                    )}
                  </View>
                )}

                {/* ── Chat-specific fields ─────────────────────── */}
                {pickerMode === "chat" ? (
                  <>
                    <Text
                      style={{
                        fontFamily: fonts.medium,
                        color: colors.ink,
                        fontSize: 14,
                        marginBottom: 10,
                      }}
                    >
                      How did you connect?
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 20,
                      }}
                    >
                      {INTERACTION_TYPES.map((type) => (
                        <PillButton
                          key={type}
                          label={type}
                          selected={interactionType === type}
                          onPress={() => setInteractionType(type)}
                        />
                      ))}
                    </View>

                    <Text
                      style={{
                        fontFamily: fonts.medium,
                        color: colors.ink,
                        fontSize: 14,
                        marginBottom: 8,
                      }}
                    >
                      When?
                    </Text>
                    <TextInput
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numbers-and-punctuation"
                      style={{
                        fontFamily: fonts.body,
                        color: colors.ink,
                        fontSize: 14,
                        borderWidth: 1,
                        borderColor: "#E7E5E4",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        backgroundColor: "white",
                        marginBottom: 20,
                      }}
                    />

                    <Text
                      style={{
                        fontFamily: fonts.medium,
                        color: colors.ink,
                        fontSize: 14,
                        marginBottom: 8,
                      }}
                    >
                      What did you talk about? (optional)
                    </Text>
                    <TextInput
                      value={interactionNotes}
                      onChangeText={setInteractionNotes}
                      placeholder="Topics, updates, anything worth noting…"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      style={{
                        fontFamily: fonts.body,
                        color: colors.ink,
                        fontSize: 14,
                        borderWidth: 1,
                        borderColor: "#E7E5E4",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        backgroundColor: "white",
                        minHeight: 84,
                        textAlignVertical: "top",
                        marginBottom: 24,
                      }}
                    />
                  </>
                ) : (
                  // ── Note-specific fields ──────────────────────
                  <>
                    <Text
                      style={{
                        fontFamily: fonts.medium,
                        color: colors.ink,
                        fontSize: 14,
                        marginBottom: 8,
                      }}
                    >
                      What do you want to note?
                    </Text>
                    <TextInput
                      value={noteText}
                      onChangeText={setNoteText}
                      placeholder="What do you want to remember?"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                      style={{
                        fontFamily: fonts.body,
                        color: colors.ink,
                        fontSize: 14,
                        borderWidth: 1,
                        borderColor: "#E7E5E4",
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        backgroundColor: "white",
                        minHeight: 100,
                        textAlignVertical: "top",
                        marginBottom: 24,
                      }}
                    />
                  </>
                )}

                {/* Save button */}
                <TouchableOpacity
                  onPress={pickerMode === "note" ? handleSaveNote : handleSaveInteraction}
                  disabled={saving}
                  activeOpacity={0.8}
                  style={{
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                    backgroundColor: colors.forest,
                    opacity: saving ? 0.7 : 1,
                    marginBottom: 4,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={{ fontFamily: fonts.bold, color: "white", fontSize: 16 }}>
                      {pickerMode === "note" ? "Save note" : "Save"}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
      </BottomSheetModal>
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
