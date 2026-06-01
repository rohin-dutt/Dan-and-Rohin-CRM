import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  TouchableOpacity,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/Button"
import { PillButton } from "@/components/PillButton"
import { ErrorBanner } from "@/components/ErrorBanner"
import { colors } from "@/constants/theme"
import { INTERACTION_TYPES, todayInputValue, updateStreakAfterAction } from "@roots/shared"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function LogInteractionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [interactionType, setInteractionType] = useState("Call")
  const [date, setDate] = useState(todayInputValue())
  const [notes, setNotes] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(false)
  const [followUpDate, setFollowUpDate] = useState(todayInputValue())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!id) return
    setSaving(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc("create_interaction_and_touch_person", {
      p_person_id: id,
      p_type: interactionType,
      p_date: date,
      p_notes: notes.trim() || null,
      p_follow_up_needed: followUpEnabled,
      p_follow_up_date: followUpEnabled ? followUpDate : null,
      p_follow_up_status: followUpEnabled ? "open" : "done",
    })

    if (rpcError) {
      setError(rpcError.message ?? "Failed to save. Please try again.")
      setSaving(false)
      return
    }

    await updateStreakAfterAction(supabase as unknown as Parameters<typeof updateStreakAfterAction>[0])
    setSaving(false)
    // Go back twice: past log screen, back to person detail
    router.back()
    router.back()
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.cream }}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 48,
          paddingHorizontal: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, color: colors.sage, fontWeight: "600" }}>← Back</Text>
        </TouchableOpacity>

        <Text style={{
          fontSize: 24,
          fontWeight: "700",
          color: colors.warmBlack,
          fontFamily: "Georgia",
          marginBottom: 24,
        }}>
          Log a chat
        </Text>

        <View style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }}>
          {error && <ErrorBanner message={error} />}

          {/* Interaction type */}
          <Text style={{ fontSize: 13, fontWeight: "500", color: colors.warmBlack, marginBottom: 8 }}>
            How did you connect?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 20 }}>
            {INTERACTION_TYPES.map((type) => (
              <PillButton
                key={type}
                label={type}
                selected={interactionType === type}
                onPress={() => setInteractionType(type)}
              />
            ))}
          </View>

          {/* Date */}
          <Text style={{ fontSize: 13, fontWeight: "500", color: colors.warmBlack, marginBottom: 6 }}>
            When?
          </Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            placeholderTextColor="#9CA3AF"
            style={{
              height: 44,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              paddingHorizontal: 12,
              fontSize: 15,
              color: colors.warmBlack,
              marginBottom: 16,
            }}
          />

          {/* Notes */}
          <Text style={{ fontSize: 13, fontWeight: "500", color: colors.warmBlack, marginBottom: 6 }}>
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="What did you talk about?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 15,
              color: colors.warmBlack,
              marginBottom: 20,
              minHeight: 80,
              textAlignVertical: "top",
            }}
          />

          {/* Follow-up toggle */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: followUpEnabled ? 16 : 24,
          }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: colors.warmBlack }}>
              Want to follow up?
            </Text>
            <Switch
              value={followUpEnabled}
              onValueChange={setFollowUpEnabled}
              trackColor={{ false: colors.border, true: colors.sage }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Follow-up date */}
          {followUpEnabled && (
            <>
              <Text style={{ fontSize: 13, fontWeight: "500", color: colors.warmBlack, marginBottom: 6 }}>
                Remind me on
              </Text>
              <TextInput
                value={followUpDate}
                onChangeText={setFollowUpDate}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                placeholderTextColor="#9CA3AF"
                style={{
                  height: 44,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  paddingHorizontal: 12,
                  fontSize: 15,
                  color: colors.warmBlack,
                  marginBottom: 24,
                }}
              />
            </>
          )}

          <Button
            title={saving ? "Saving…" : "Save"}
            onPress={handleSave}
            disabled={saving}
            loading={saving}
          />

          <TouchableOpacity
            onPress={() => router.back()}
            style={{ alignItems: "center", marginTop: 14 }}
          >
            <Text style={{ fontSize: 14, color: colors.muted }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
