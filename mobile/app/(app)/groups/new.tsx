import { useEffect, useRef, useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import type { Session } from "@supabase/supabase-js"
import { Screen } from "@/components/Screen"
import { ErrorBanner } from "@/components/ErrorBanner"
import { SoftCard } from "@/components/RootsUI"
import { supabase } from "@/lib/supabase"
import { createGroup } from "@/lib/group-data"
import { colors, fonts, singleLineTextInputStyle } from "@/constants/theme"
import { PeopleMultiSelect } from "@/features/groups/PeopleMultiSelect"
import { useCrmData } from "@/features/crm-data/CrmDataProvider"

export default function NewGroupScreen() {
  const router = useRouter()
  const { refresh } = useCrmData()
  const [name, setName] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cached session: avoids paying a network round trip inside the save call
  // (same pattern as the add-person screen).
  const sessionRef = useRef<Session | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) sessionRef.current = session
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function getCachedSession() {
    if (sessionRef.current) return sessionRef.current
    const {
      data: { session },
    } = await supabase.auth.getSession()
    sessionRef.current = session
    return session
  }

  function togglePerson(personId: string) {
    setSelectedIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId],
    )
  }

  async function handleSave() {
    if (saving) return
    if (!name.trim()) {
      setError("Group name is required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const session = await getCachedSession()
      if (!session) throw new Error("Not authenticated")

      const groupId = await createGroup({
        userId: session.user.id,
        name,
        personIds: selectedIds,
      })
      await refresh()
      router.replace(`/groups/${groupId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create group")
      setSaving(false)
    }
  }

  return (
    <Screen>
      <View className="px-5 pt-3 pb-6">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cancel creating group"
            onPress={() => router.back()}
            className="min-h-11 justify-center pr-4"
          >
            <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="text-lg">
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="text-xl">
            New Group
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Save group"
            onPress={() => void handleSave()}
            disabled={saving}
            className="min-h-11 justify-center pl-4"
          >
            <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-lg">
              {saving ? "Saving" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        {error != null && <ErrorBanner message={error} />}

        <SoftCard className="mt-4 p-3">
          <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
            Group name <Text style={{ color: "#B91C1C" }}>*</Text>
          </Text>
          <TextInput
            accessibilityLabel="Group name"
            value={name}
            onChangeText={setName}
            placeholder="College friends, Book club…"
            placeholderTextColor="#8F96A3"
            autoCapitalize="words"
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            className="rounded-xl border border-stone-200 bg-white px-3"
            style={[singleLineTextInputStyle, { fontFamily: fonts.body, color: colors.ink }]}
          />
        </SoftCard>

        <SoftCard className="mt-4 p-3">
          <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-2 text-sm">
            Add people to this group
          </Text>
          <PeopleMultiSelect selectedIds={selectedIds} onToggle={togglePerson} />
        </SoftCard>
      </View>
    </Screen>
  )
}
