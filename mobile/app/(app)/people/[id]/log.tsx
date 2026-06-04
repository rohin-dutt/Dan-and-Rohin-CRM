import { useEffect, useState } from "react"
import { Switch, Text, TouchableOpacity, View } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { PillButton } from "@/components/PillButton"
import { DatePicker } from "@/components/DatePicker"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { colors } from "@/constants/theme"
import { INTERACTION_TYPES, updateStreakAfterAction, todayInputValue, formatDate } from "@roots/shared"

type OpenFollowUp = {
  id: string
  follow_up_date: string | null
  notes: string | null
  type: string
}

export default function LogInteractionScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personName, setPersonName] = useState<string | null>(null)
  const [openFollowUps, setOpenFollowUps] = useState<OpenFollowUp[]>([])
  const [markFollowUpDone, setMarkFollowUpDone] = useState(true)

  const [interactionType, setInteractionType] = useState(INTERACTION_TYPES[0])
  const [date, setDate] = useState(todayInputValue())
  const [notes, setNotes] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(false)
  const [followUpDate, setFollowUpDate] = useState("")

  useEffect(() => {
    async function loadPerson() {
      const { data: personData } = await supabase
        .from("people")
        .select("id, name")
        .eq("id", id)
        .single()
      if (personData) setPersonName(personData.name)

      const today = todayInputValue()
      const { data: followUpsData } = await supabase
        .from("interactions")
        .select("id, follow_up_date, notes, type")
        .eq("person_id", id)
        .eq("follow_up_needed", true)
        .eq("follow_up_status", "open")
        .gt("follow_up_date", today)
        .order("follow_up_date", { ascending: true })
      setOpenFollowUps(followUpsData ?? [])
    }
    loadPerson()
  }, [id])

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
        p_follow_up_status: followUpEnabled ? "open" : "done",
      })

      if (rpcError) throw rpcError

      if (markFollowUpDone && openFollowUps.length > 0) {
        const followUpIds = openFollowUps.map((fu) => fu.id)
        await supabase
          .from("interactions")
          .update({ follow_up_status: "done" })
          .in("id", followUpIds)
          .eq("person_id", id)
      }

      await updateStreakAfterAction(supabase)

      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log interaction")
    } finally {
      setSaving(false)
    }
  }

  const firstName = personName?.split(" ")[0] ?? null

  return (
    <Screen>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="py-1 pr-3">
          <Text className="text-sage text-sm font-semibold">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-warm-black">
          {firstName ? `Catch up with ${firstName}` : "Log a chat"}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <View className="px-5 pb-8">
        {error != null && <ErrorBanner message={error} />}

        {/* Open follow-ups banner */}
        {openFollowUps.length > 0 && (
          <View className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <Text className="text-sm font-medium text-amber-800">
              You had a follow-up scheduled
              {openFollowUps[0].follow_up_date
                ? ` for ${formatDate(openFollowUps[0].follow_up_date)}`
                : ""}
              {openFollowUps[0].notes
                ? ` — "${openFollowUps[0].notes.length > 60 ? openFollowUps[0].notes.slice(0, 60) + "..." : openFollowUps[0].notes}"`
                : ""}
            </Text>
            <View className="flex-row items-center gap-2 mt-2">
              <TouchableOpacity
                onPress={() => setMarkFollowUpDone((v) => !v)}
                className="flex-row items-center gap-2"
                activeOpacity={0.7}
              >
                <View
                  className={`w-4 h-4 rounded border items-center justify-center ${markFollowUpDone ? "bg-amber-700 border-amber-700" : "border-amber-500 bg-white"}`}
                >
                  {markFollowUpDone && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
                <Text className="text-sm text-amber-800">Mark as done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Interaction type */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-warm-black mb-2">
            How did you connect? <Text className="text-red-500">*</Text>
          </Text>
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

        <DatePicker label="Date *" value={date} onChange={setDate} />

        <TextField
          label="What did you talk about?"
          value={notes}
          onChangeText={setNotes}
          placeholder="What did you talk about?"
          multiline
          numberOfLines={4}
        />

        {/* Want to follow up? */}
        <View className="mb-4">
          <View className="flex-row items-center gap-3 py-2">
            <Switch
              value={followUpEnabled}
              onValueChange={setFollowUpEnabled}
              trackColor={{ false: colors.border, true: colors.sage }}
              thumbColor="#FFFFFF"
            />
            <Text className="text-sm font-medium text-warm-black">Want to follow up?</Text>
          </View>

          {followUpEnabled && (
            <DatePicker label="Remind me on" value={followUpDate} onChange={setFollowUpDate} />
          )}
        </View>

        <Button title={saving ? "Saving..." : "Save"} onPress={handleSave} loading={saving} />
      </View>
    </Screen>
  )
}
