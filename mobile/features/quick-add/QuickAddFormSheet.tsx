import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Dimensions,
  Platform,
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
import { formatFullDate, INTERACTION_TYPES, toLocalDateString, updateStreakAfterAction } from "@roots/shared"

export type QuickAddMode = "note" | "chat"

type PersonOption = {
  id: string
  name: string
  company: string | null
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 14, marginBottom: 8 }}>
      {children}
    </Text>
  )
}

function DateField({
  label,
  date,
  placeholder,
  open,
  minDate,
  maxDate,
  onToggle,
  onChange,
  onDone,
}: {
  label: string
  date: Date | null
  placeholder: string
  open: boolean
  minDate?: Date
  maxDate?: Date
  onToggle: () => void
  onChange: (date: Date) => void
  onDone: () => void
}) {
  const inputDateValue = date ? date.toISOString().slice(0, 10) : ""

  function handleWebDateChange(value: string) {
    if (!value) return
    const [year, month, day] = value.split("-").map(Number)
    if (!year || !month || !day) return
    onChange(new Date(year, month - 1, day))
  }

  return (
    <View style={{ marginBottom: 20 }}>
      <FieldLabel>{label}</FieldLabel>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Select ${label.toLowerCase()}`}
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 44,
          borderWidth: 1,
          borderColor: open ? colors.forest : "#E7E5E4",
          borderRadius: 12,
          paddingHorizontal: 14,
          backgroundColor: "white",
          marginBottom: open ? 0 : 0,
        }}
      >
        <Ionicons name={label.toLowerCase().includes("follow") ? "flag-outline" : "calendar-outline"} size={16} color={colors.forest} style={{ marginRight: 8 }} />
        <Text style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 14, flex: 1 }}>
          {date ? formatFullDate(date) : placeholder}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
      </TouchableOpacity>
      {open ? (
        <View
          style={{
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: colors.forest,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            backgroundColor: "white",
            overflow: "hidden",
          }}
        >
          {Platform.OS === "web" ? (
            <TextInput
              accessibilityLabel={`Choose ${label.toLowerCase()}`}
              value={inputDateValue}
              onChangeText={handleWebDateChange}
              placeholder="YYYY-MM-DD"
              style={{
                color: colors.ink,
                fontFamily: fonts.body,
                fontSize: 16,
                padding: 14,
              }}
            />
          ) : (
            <DateTimePicker
              value={date ?? new Date()}
              mode="date"
              display="spinner"
              onChange={(_, nextDate) => {
                if (nextDate) onChange(nextDate)
              }}
              minimumDate={minDate}
              maximumDate={maxDate}
            />
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Done selecting ${label.toLowerCase()}`}
            onPress={onDone}
            style={{ alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 12 }}
          >
            <Text style={{ fontFamily: fonts.bold, color: colors.forest, fontSize: 15 }}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  )
}

export function QuickAddFormSheet({ mode, onClose }: { mode: QuickAddMode | null; onClose: () => void }) {
  const [people, setPeople] = useState<PersonOption[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [personSearch, setPersonSearch] = useState("")
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null)
  const [personInputFocused, setPersonInputFocused] = useState(false)
  const [interactionType, setInteractionType] = useState(INTERACTION_TYPES[0])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [interactionNotes, setInteractionNotes] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(false)
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null)
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (mode == null) return
    setPersonSearch("")
    setSelectedPerson(null)
    setPersonInputFocused(false)
    setFormError(null)
    setSaving(false)
    setInteractionType(INTERACTION_TYPES[0])
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

        const { data, error } = await supabase
          .from("people")
          .select("id, name, company")
          .eq("user_id", session.user.id)
          .order("name", { ascending: true })

        if (error) throw error
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
  }, [mode])

  const filteredPeople = useMemo(() => {
    const normalized = personSearch.trim().toLowerCase()
    if (!normalized) return []
    return people
      .filter((person) => person.name.toLowerCase().includes(normalized) || (person.company?.toLowerCase().includes(normalized) ?? false))
      .slice(0, 5)
  }, [people, personSearch])

  const sheetMaxHeight =
    Platform.OS === "web"
      ? Math.min(Dimensions.get("window").height * 0.92, 680)
      : Dimensions.get("window").height * 0.9

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
      const { error } = await supabase.rpc("create_interaction_and_touch_person", {
        p_person_id: selectedPerson.id,
        p_type: interactionType,
        p_date: toLocalDateString(selectedDate),
        p_notes: interactionNotes.trim() || null,
        p_follow_up_needed: followUpEnabled,
        p_follow_up_date: followUpEnabled && followUpDate ? toLocalDateString(followUpDate) : null,
      })
      if (error) throw error
      await updateStreakAfterAction(supabase)
      DeviceEventEmitter.emit("interactionAdded")
      onClose()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to log interaction")
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

      const { error } = await supabase.from("person_notes").insert({
        user_id: session.user.id,
        person_id: selectedPerson.id,
        body: noteText.trim(),
        note_date: toLocalDateString(selectedDate),
      })
      if (error) throw error
      DeviceEventEmitter.emit("noteAdded")
      onClose()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save note")
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheetModal visible={mode != null} onClose={onClose} backdropOpacity={0.3} sheetStyle={{ height: sheetMaxHeight }} accessibilityLabel="Dismiss quick add form">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, maxHeight: sheetMaxHeight - 76 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
      >
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <View style={{ height: 6, width: 96, borderRadius: 3, backgroundColor: "#E7E5E4" }} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 20, flex: 1 }}>
            {mode === "note" ? "Add a note" : "Log a chat"}
          </Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F5F5F4", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={18} color={colors.warmBlack} />
          </TouchableOpacity>
        </View>

        {formError ? (
          <Text style={{ fontFamily: fonts.body, color: "#B91C1C", fontSize: 13, backgroundColor: "#FEF2F2", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 }}>
            {formError}
          </Text>
        ) : null}

        <FieldLabel>{mode === "note" ? "Who is this about?" : "Who did you talk to?"}</FieldLabel>
        {selectedPerson ? (
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.mint, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 15 }}>{selectedPerson.name}</Text>
              {selectedPerson.company ? <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 13, marginTop: 1 }}>{selectedPerson.company}</Text> : null}
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear person selection" onPress={() => {
              setSelectedPerson(null)
              setPersonSearch("")
              setFormError(null)
            }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={colors.forest} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", height: 44, borderRadius: 14, borderWidth: 1, borderColor: "#E7E5E4", backgroundColor: "#FAFAF9", paddingHorizontal: 12 }}>
              {loadingPeople ? <ActivityIndicator size="small" color={colors.forest} style={{ marginRight: 8 }} /> : <Ionicons name="search-outline" size={16} color="#60646D" style={{ marginRight: 8 }} />}
              <TextInput
                value={personSearch}
                onChangeText={setPersonSearch}
                placeholder="Search by name or company..."
                placeholderTextColor="#777A83"
                style={{ flex: 1, fontFamily: fonts.body, color: colors.ink, fontSize: 14 }}
                onFocus={() => setPersonInputFocused(true)}
                onBlur={() => setTimeout(() => setPersonInputFocused(false), 150)}
                accessibilityLabel="Search people"
              />
            </View>
            {showPersonResults && personSearch.trim() && filteredPeople.length > 0 ? (
              <View style={{ borderRadius: 14, borderWidth: 1, borderColor: "#E7E5E4", backgroundColor: "white", marginTop: 4, overflow: "hidden" }}>
                {filteredPeople.map((person, index) => (
                  <TouchableOpacity key={person.id} accessibilityRole="button" accessibilityLabel={`Select ${person.name}`} onPress={() => {
                    setSelectedPerson(person)
                    setPersonSearch("")
                    setPersonInputFocused(false)
                    setFormError(null)
                  }} style={{ paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: index < filteredPeople.length - 1 ? 1 : 0, borderBottomColor: "#F5F5F4" }}>
                    <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 14 }}>{person.name}</Text>
                    {person.company ? <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginTop: 1 }}>{person.company}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : showPersonResults && !loadingPeople && personSearch.trim() ? (
              <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 13, marginTop: 6 }}>
                No people match "{personSearch}"
              </Text>
            ) : fetchError ? (
              <Text style={{ fontFamily: fonts.body, color: "#B91C1C", fontSize: 13, backgroundColor: "#FEF2F2", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4 }}>
                {fetchError}
              </Text>
            ) : null}
          </View>
        )}

        {mode === "chat" ? (
          <>
            <FieldLabel>How did you connect?</FieldLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {INTERACTION_TYPES.map((type) => (
                <PillButton key={type} label={type} selected={interactionType === type} onPress={() => setInteractionType(type)} />
              ))}
            </View>
          </>
        ) : null}

        <DateField
          label={mode === "note" ? "Note date" : "Date"}
          date={selectedDate}
          placeholder="Select date"
          open={showDatePicker}
          maxDate={new Date()}
          onToggle={() => {
            setShowDatePicker((value) => !value)
            setShowFollowUpPicker(false)
          }}
          onChange={setSelectedDate}
          onDone={() => setShowDatePicker(false)}
        />

        {mode === "chat" ? (
          <>
            <FieldLabel>What did you talk about? (optional)</FieldLabel>
            <TextInput value={interactionNotes} onChangeText={setInteractionNotes} placeholder="Topics, updates, anything worth noting..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 14, borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: "white", minHeight: 84, textAlignVertical: "top", marginBottom: 20 }} />

            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 14 }}>Set a follow-up</Text>
                  <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginTop: 2 }}>Explicit follow-ups stay separate from cadence reminders.</Text>
                </View>
                <Switch value={followUpEnabled} onValueChange={setFollowUpEnabled} trackColor={{ false: colors.border, true: colors.sage }} thumbColor="#FFFFFF" />
              </View>
              {followUpEnabled ? (
                <DateField
                  label="Follow-up date"
                  date={followUpDate}
                  placeholder="Select follow-up date"
                  open={showFollowUpPicker}
                  minDate={new Date()}
                  onToggle={() => {
                    setShowFollowUpPicker((value) => !value)
                    setShowDatePicker(false)
                  }}
                  onChange={setFollowUpDate}
                  onDone={() => setShowFollowUpPicker(false)}
                />
              ) : null}
            </View>
          </>
        ) : (
          <>
            <FieldLabel>What do you want to note?</FieldLabel>
            <TextInput value={noteText} onChangeText={setNoteText} placeholder="What do you want to remember?" placeholderTextColor="#9CA3AF" multiline numberOfLines={4} style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 14, borderWidth: 1, borderColor: "#E7E5E4", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: "white", minHeight: 100, textAlignVertical: "top", marginBottom: 24 }} />
          </>
        )}
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: "#F5F5F4", paddingHorizontal: 24, paddingTop: 12, paddingBottom: Platform.OS === "web" ? 16 : 0, backgroundColor: "white" }}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={mode === "note" ? "Save quick note" : "Save quick interaction"}
          onPress={mode === "note" ? handleSaveNote : handleSaveInteraction}
          disabled={saving}
          activeOpacity={0.8}
          style={{ minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.forest, opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={{ fontFamily: fonts.bold, color: "white", fontSize: 16 }}>{mode === "note" ? "Save note" : "Save"}</Text>}
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  )
}
