import { useState } from "react"
import { Switch, Text, TouchableOpacity, View } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { PillButton } from "@/components/PillButton"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { colors } from "@/constants/theme"
import { INTERACTION_TYPES, updateStreakAfterAction, todayInputValue } from "@roots/shared"

export default function LogInteractionScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [interactionType, setInteractionType] = useState(INTERACTION_TYPES[0])
  const [date, setDate] = useState(todayInputValue())
  const [notes, setNotes] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(false)
  const [followUpDate, setFollowUpDate] = useState("")

  async function handleSave() {
    if (!date.trim()) {
      setError("Date is required")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const { error: rpcError } = await supabase.rpc("create_interaction_and_touch_person", {
        p_person_id: id,
        p_type: interactionType,
        p_date: date.trim(),
        p_notes: notes.trim() || null,
        p_follow_up_needed: followUpEnabled,
        p_follow_up_date: followUpEnabled && followUpDate.trim() ? followUpDate.trim() : null,
      })

      if (rpcError) throw rpcError

      await updateStreakAfterAction(supabase)

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
        <Text className="text-base font-semibold text-warm-black">Log a chat</Text>
        <View style={{ width: 60 }} />
      </View>

      <View className="px-5 pb-8">
        {error != null && <ErrorBanner message={error} />}

        {/* Interaction type */}
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

        <TextField
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          returnKeyType="next"
        />

        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="What did you talk about?"
          multiline
          numberOfLines={4}
          returnKeyType="default"
        />

        {/* Follow-up toggle */}
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
            <TextField
              label="Follow-up date"
              value={followUpDate}
              onChangeText={setFollowUpDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              returnKeyType="done"
            />
          )}
        </View>

        <Button title="Save" onPress={handleSave} loading={saving} />
      </View>
    </Screen>
  )
}
