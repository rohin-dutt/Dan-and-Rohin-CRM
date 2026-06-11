import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  DeviceEventEmitter,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { colors, fonts } from "@/constants/theme"
import { BottomSheetModal } from "@/components/BottomSheetModal"
import { PillButton } from "@/components/PillButton"
import { formatFullDate, toLocalDateString, todayInputValue, updateStreakAfterAction } from "@roots/shared"

export type QuickAddMode = "note" | "chat"

export type QuickAddPerson = {
  id: string
  name: string
  company: string | null
}

type PersonOption = QuickAddPerson

const QUICK_INTERACTION_TYPES = ["Text / Email", "Call", "In Person"] as const
type QuickInteractionType = (typeof QUICK_INTERACTION_TYPES)[number]

// Single-step "log a chat" / "add a note" sheet. Opened from the quick-add
// menu (person chosen via typeahead) and from the person detail screen
// (person preselected via `initialPerson`) so both entry points share the
// exact same form.
export function QuickAddFormSheet({
  mode,
  onClose,
  initialPerson,
}: {
  mode: QuickAddMode | null
  onClose: () => void
  initialPerson?: QuickAddPerson | null
}) {
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Person typeahead
  const [personSearch, setPersonSearch] = useState("")
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null)
  const [personInputFocused, setPersonInputFocused] = useState(false)

  // Chat fields
  const [interactionType, setInteractionType] = useState<QuickInteractionType>("Text / Email")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [interactionNotes, setInteractionNotes] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(false)
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null)
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false)

  // Note fields
  const [noteText, setNoteText] = useState("")

  // Common
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (mode == null) return

    // Reset per-open state, then load the people list for the typeahead.
    setPersonSearch("")
    setSelectedPerson(initialPerson ?? null)
    setPersonInputFocused(false)
    setFormError(null)
    setSaving(false)
    setInteractionType("Text / Email")
    setSelectedDate(new Date())
    setShowDatePicker(false)
    setInteractionNotes("")
    setFollowUpEnabled(false)
    setFollowUpDate(null)
    setShowFollowUpPicker(false)
    setNoteText("")
    setLoadingPeople(true)
    setFetchError(null)

    let cancelled = false
    async function loadPeople() {
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
        if (!cancelled) setPeople(data ?? [])
      } catch (e) {
        if (!cancelled) {
          setFetchError(e instanceof Error ? e.message : "Could not load people.")
          setPeople([])
        }
      } finally {
        if (!cancelled) setLoadingPeople(false)
      }
    }
    void loadPeople()
    return () => {
      cancelled = true
    }
  }, [mode, initialPerson])

  const filteredPeople = useMemo(() => {
    const normalized = personSearch.trim().toLowerCase()
    if (!normalized) return []
    return people
      .filter(
        (p) =>
          p.name.toLowerCase().includes(normalized) ||
          (p.company?.toLowerCase().includes(normalized) ?? false),
      )
      .slice(0, 5)
  }, [people, personSearch])

  const showPersonResults = personInputFocused && !selectedPerson

  async function handleSaveInteraction() {
    if (saving) return
    if (!selectedPerson) {
      setFormError("Please select a person first")
      return
    }
    if (followUpEnabled && !followUpDate) {
      setFormError("Follow-up date is required when a follow-up is set")
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
        p_date: toLocalDateString(selectedDate),
        p_notes: interactionNotes.trim() || null,
        p_follow_up_needed: followUpEnabled,
        p_follow_up_date: followUpEnabled && followUpDate ? toLocalDateString(followUpDate) : null,
      })
      if (rpcError) throw rpcError
      await updateStreakAfterAction(supabase)
      DeviceEventEmitter.emit("interactionAdded")
      onClose()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNote() {
    if (saving) return
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
      DeviceEventEmitter.emit("noteAdded")
      onClose()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save note")
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheetModal
      visible={mode != null}
      onClose={onClose}
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
            {mode === "note" ? "Add a note" : "Log a chat"}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
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
          {mode === "note" ? "Who is this about?" : "Who did you talk to?"}
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

            {showPersonResults && personSearch.trim() && filteredPeople.length > 0 ? (
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
        {mode === "chat" ? (
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
              {QUICK_INTERACTION_TYPES.map((type) => (
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
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Select date"
              onPress={() => setShowDatePicker((v) => !v)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                height: 44,
                borderWidth: 1,
                borderColor: showDatePicker ? colors.forest : "#E7E5E4",
                borderRadius: 12,
                paddingHorizontal: 14,
                backgroundColor: "white",
                marginBottom: showDatePicker ? 0 : 20,
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.forest} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 14, flex: 1 }}>
                {formatFullDate(selectedDate)}
              </Text>
              <Ionicons name={showDatePicker ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
            </TouchableOpacity>

            {showDatePicker ? (
              <View
                style={{
                  borderWidth: 1,
                  borderTopWidth: 0,
                  borderColor: colors.forest,
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                  backgroundColor: "white",
                  overflow: "hidden",
                  marginBottom: 20,
                }}
              >
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => {
                    if (date) setSelectedDate(date)
                  }}
                  minimumDate={new Date(new Date().getFullYear() - 100, 0, 1)}
                  maximumDate={new Date()}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Done selecting date"
                  onPress={() => setShowDatePicker(false)}
                  style={{ alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 12 }}
                >
                  <Text style={{ fontFamily: fonts.bold, color: colors.forest, fontSize: 15 }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}

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
                marginBottom: 20,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: followUpEnabled ? 12 : 24,
              }}
            >
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 14 }}>
                  Set a follow-up
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginTop: 2 }}>
                  Remind yourself to follow up with this person
                </Text>
              </View>
              <Switch
                value={followUpEnabled}
                onValueChange={(value) => {
                  setFollowUpEnabled(value)
                  if (!value) setShowFollowUpPicker(false)
                }}
                trackColor={{ false: "#E7E5E4", true: colors.sage }}
                thumbColor="#FFFFFF"
              />
            </View>

            {followUpEnabled ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Select follow-up date"
                  onPress={() => setShowFollowUpPicker((v) => !v)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    height: 44,
                    borderWidth: 1,
                    borderColor: showFollowUpPicker ? colors.forest : "#E7E5E4",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    backgroundColor: "white",
                    marginBottom: showFollowUpPicker ? 0 : 24,
                  }}
                >
                  <Ionicons name="flag-outline" size={16} color={colors.forest} style={{ marginRight: 8 }} />
                  <Text style={{ fontFamily: fonts.body, color: followUpDate ? colors.ink : "#9CA3AF", fontSize: 14, flex: 1 }}>
                    {followUpDate ? formatFullDate(followUpDate) : "Select follow-up date"}
                  </Text>
                  <Ionicons name={showFollowUpPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
                </TouchableOpacity>

                {showFollowUpPicker ? (
                  <View
                    style={{
                      borderWidth: 1,
                      borderTopWidth: 0,
                      borderColor: colors.forest,
                      borderBottomLeftRadius: 12,
                      borderBottomRightRadius: 12,
                      backgroundColor: "white",
                      overflow: "hidden",
                      marginBottom: 24,
                    }}
                  >
                    <DateTimePicker
                      value={followUpDate ?? new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(_, date) => {
                        if (date) setFollowUpDate(date)
                      }}
                      minimumDate={new Date()}
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Done selecting follow-up date"
                      onPress={() => {
                        if (!followUpDate) setFollowUpDate(new Date())
                        setShowFollowUpPicker(false)
                      }}
                      style={{ alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 12 }}
                    >
                      <Text style={{ fontFamily: fonts.bold, color: colors.forest, fontSize: 15 }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            ) : null}
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
          onPress={mode === "note" ? handleSaveNote : handleSaveInteraction}
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
              {mode === "note" ? "Save note" : "Save"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </BottomSheetModal>
  )
}
