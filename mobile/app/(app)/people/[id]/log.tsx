import { useState } from "react"
import { DeviceEventEmitter, Switch, Text, TouchableOpacity, View } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { PillButton } from "@/components/PillButton"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { colors, fonts } from "@/constants/theme"
import { INTERACTION_TYPES, updateStreakAfterAction } from "@roots/shared"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatDateDisplay(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function InlineDateField({
  label,
  date,
  placeholder,
  open,
  onToggle,
  onChange,
  onDone,
  minimumDate,
  maximumDate,
}: {
  label: string
  date: Date | null
  placeholder: string
  open: boolean
  onToggle: () => void
  onChange: (date: Date) => void
  onDone: () => void
  minimumDate?: Date
  maximumDate?: Date
}) {
  return (
    <View className="mb-4">
      <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="mb-2 text-sm">
        {label}
      </Text>
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
        }}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.forest} style={{ marginRight: 8 }} />
        <Text
          style={{ fontFamily: fonts.body, color: date ? colors.ink : "#9CA3AF", fontSize: 14, flex: 1 }}
        >
          {date ? formatDateDisplay(date) : placeholder}
        </Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
      </TouchableOpacity>
      {open ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.forest,
            borderRadius: 12,
            backgroundColor: "white",
            overflow: "hidden",
            marginTop: 6,
          }}
        >
          <DateTimePicker
            value={date ?? new Date()}
            mode="date"
            display="spinner"
            onChange={(_, picked) => {
              if (picked) onChange(picked)
            }}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
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

export default function LogInteractionScreen() {
  const router = useRouter()
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNoteMode = action === "note"
  const [interactionType, setInteractionType] = useState(isNoteMode ? "Other" : INTERACTION_TYPES[0])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [notes, setNotes] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(false)
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null)
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false)

  async function handleSave() {
    if (isNoteMode && !notes.trim()) {
      setError("Note text is required")
      return
    }
    if (!isNoteMode && followUpEnabled && !followUpDate) {
      setError("Follow-up date is required when a follow-up is set")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      if (isNoteMode) {
        const { error: insertError } = await supabase.from("person_notes").insert({
          user_id: session.user.id,
          person_id: id,
          body: notes.trim(),
          note_date: toLocalDateString(selectedDate),
        })
        if (insertError) throw insertError
        DeviceEventEmitter.emit("noteAdded")
      } else {
        const { error: rpcError } = await supabase.rpc("create_interaction_and_touch_person", {
          p_person_id: id,
          p_type: interactionType,
          p_date: toLocalDateString(selectedDate),
          p_notes: notes.trim() || null,
          p_follow_up_needed: followUpEnabled,
          p_follow_up_date: followUpEnabled && followUpDate ? toLocalDateString(followUpDate) : null,
        })

        if (rpcError) throw rpcError

        await updateStreakAfterAction(supabase)
        DeviceEventEmitter.emit("interactionAdded")
      }

      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log interaction")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="py-1 pr-3">
          <Text className="text-sage text-sm font-semibold">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-warm-black">
          {isNoteMode ? "Add note" : "Log a chat"}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <View className="px-5 pb-8">
        {error != null && <ErrorBanner message={error} />}

        {!isNoteMode ? (
          <View className="mb-4">
            <Text className="text-sm font-medium text-warm-black mb-2">Type</Text>
            <View className="flex-row flex-wrap gap-2">
              {INTERACTION_TYPES.map((type) => (
                <PillButton
                  key={type}
                  label={type}
                  selected={interactionType === type}
                  onPress={() => setInteractionType(type)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <InlineDateField
          label="Date"
          date={selectedDate}
          placeholder="Select date"
          open={showDatePicker}
          onToggle={() => {
            setShowDatePicker((v) => !v)
            setShowFollowUpPicker(false)
          }}
          onChange={setSelectedDate}
          onDone={() => setShowDatePicker(false)}
          maximumDate={new Date()}
        />

        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder={isNoteMode ? "What do you want to remember?" : "What did you talk about?"}
          multiline
          numberOfLines={4}
          returnKeyType="default"
        />

        {!isNoteMode ? (
        <View className="mb-4">
          <View className="flex-row items-center justify-between py-2">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-medium text-warm-black">Set a follow-up</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                Remind yourself to follow up with this person
              </Text>
            </View>
            <Switch
              value={followUpEnabled}
              onValueChange={setFollowUpEnabled}
              trackColor={{ false: colors.border, true: colors.sage }}
              thumbColor="#FFFFFF"
            />
          </View>

          {followUpEnabled && (
            <InlineDateField
              label="Follow-up date"
              date={followUpDate}
              placeholder="Select follow-up date"
              open={showFollowUpPicker}
              onToggle={() => {
                setShowFollowUpPicker((v) => !v)
                setShowDatePicker(false)
              }}
              onChange={setFollowUpDate}
              onDone={() => setShowFollowUpPicker(false)}
              minimumDate={new Date()}
            />
          )}
        </View>
        ) : null}

        <Button title={isNoteMode ? "Save note" : "Save"} onPress={handleSave} loading={saving} />
      </View>
    </Screen>
  )
}
