import { useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { PillButton } from "@/components/PillButton"
import { DatePicker } from "@/components/DatePicker"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { ONBOARDING_FREQ_OPTIONS } from "@/constants/onboarding"
import { INTERACTION_TYPES, updateStreakAfterAction, todayInputValue } from "@roots/shared"

const CATEGORIES = [
  { label: "Friend", tagName: "Friend", tagColor: "#16A34A" },
  { label: "Family", tagName: "Family", tagColor: "#2563EB" },
  { label: "Professional", tagName: "Colleague", tagColor: "#D97706" },
] as const

type CategoryLabel = (typeof CATEGORIES)[number]["label"]

async function getOrCreateTag(
  userId: string,
  name: string,
  color: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("tags")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", name)
    .maybeSingle()

  if (existing) return existing.id

  const { data: created } = await supabase
    .from("tags")
    .insert({ user_id: userId, name, color })
    .select("id")
    .single()

  return created?.id ?? null
}

export default function NewPersonScreen() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Name split (matching web)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")

  const [category, setCategory] = useState<CategoryLabel | null>(null)
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [birthday, setBirthday] = useState("")
  const [relationshipType, setRelationshipType] = useState("")
  const [howMet, setHowMet] = useState("")
  const [frequencyDays, setFrequencyDays] = useState(30)
  const [notes, setNotes] = useState("")

  // More details (collapsible)
  const [showMore, setShowMore] = useState(false)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [location, setLocation] = useState("")
  const [relationshipStrength, setRelationshipStrength] = useState("")
  const [preferredContact, setPreferredContact] = useState("")

  // Interaction prompt after save
  const [savedPersonId, setSavedPersonId] = useState<string | null>(null)
  const [savedPersonFirstName, setSavedPersonFirstName] = useState("")
  const [showInteractionPrompt, setShowInteractionPrompt] = useState(false)
  const [interactionType, setInteractionType] = useState("Text")
  const [interactionDate, setInteractionDate] = useState(todayInputValue())
  const [interactionNotes, setInteractionNotes] = useState("")
  const [loggingInteraction, setLoggingInteraction] = useState(false)
  const [interactionError, setInteractionError] = useState<string | null>(null)

  const isProfessional = category === "Professional"
  const isFamily = category === "Family"
  const isFriendOrFamily = category === "Friend" || isFamily

  async function handleSave() {
    const trimmedFirst = firstName.trim()
    if (!trimmedFirst) {
      setError("First name is required.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const userId = session.user.id
      const name = [trimmedFirst, lastName.trim()].filter(Boolean).join(" ")

      const { data: person, error: insertErr } = await supabase
        .from("people")
        .insert({
          user_id: userId,
          name,
          email: email.trim() || null,
          phone: phone.trim() || null,
          company: isProfessional && company.trim() ? company.trim() : null,
          role: isProfessional && role.trim() ? role.trim() : null,
          birthday: isFriendOrFamily && birthday ? birthday : null,
          how_met: howMet.trim() || null,
          relationship_type: isFamily && relationshipType.trim() ? relationshipType.trim() : null,
          relationship_strength: relationshipStrength || null,
          preferred_contact_method: preferredContact.trim() || null,
          location: location.trim() || null,
          notes: notes.trim() || null,
          contact_frequency_days: frequencyDays,
        })
        .select("id")
        .single()

      if (insertErr) throw insertErr

      if (category && person) {
        const cat = CATEGORIES.find((c) => c.label === category)
        if (cat) {
          const tagId = await getOrCreateTag(userId, cat.tagName, cat.tagColor)
          if (tagId) {
            await supabase
              .from("person_tags")
              .insert({ person_id: person.id, tag_id: tagId })
          }
        }
      }

      await updateStreakAfterAction(supabase)
      setSavedPersonId(person!.id)
      setSavedPersonFirstName(trimmedFirst)
      setShowInteractionPrompt(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save person")
    } finally {
      setSaving(false)
    }
  }

  async function handleLogInteraction() {
    if (!savedPersonId) return
    setLoggingInteraction(true)
    setInteractionError(null)

    try {
      const { error: rpcError } = await supabase.rpc("create_interaction_and_touch_person", {
        p_person_id: savedPersonId,
        p_type: interactionType,
        p_date: interactionDate,
        p_notes: interactionNotes.trim() || null,
        p_follow_up_needed: false,
        p_follow_up_date: null,
        p_follow_up_status: "done",
      })

      if (rpcError) throw rpcError

      await updateStreakAfterAction(supabase)
      router.replace(`/people/${savedPersonId}`)
    } catch (e) {
      setInteractionError(e instanceof Error ? e.message : "Failed to save interaction")
    } finally {
      setLoggingInteraction(false)
    }
  }

  if (showInteractionPrompt) {
    return (
      <Screen>
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <View style={{ width: 60 }} />
          <Text className="text-base font-semibold text-warm-black">One more thing</Text>
          <View style={{ width: 60 }} />
        </View>

        <View className="px-5 pb-8">
          <Text className="text-lg font-semibold text-warm-black mb-1">
            When did you last talk to {savedPersonFirstName}?
          </Text>
          <Text className="text-sm text-gray-500 mb-5">
            Adding your last interaction helps Roots remind you at the right time.
          </Text>

          {interactionError && <ErrorBanner message={interactionError} />}

          <Text className="text-sm font-medium text-warm-black mb-2">How did you connect?</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {INTERACTION_TYPES.map((type) => (
              <PillButton
                key={type}
                label={type}
                selected={interactionType === type}
                onPress={() => setInteractionType(type)}
              />
            ))}
          </View>

          <DatePicker label="When?" value={interactionDate} onChange={setInteractionDate} />

          <TextField
            label="Notes (optional)"
            value={interactionNotes}
            onChangeText={setInteractionNotes}
            placeholder="What did you talk about?"
            multiline
            numberOfLines={3}
          />

          <View className="flex-row gap-3 mt-2">
            <View className="flex-1">
              <Button
                title={loggingInteraction ? "Saving..." : "Save"}
                onPress={handleLogInteraction}
                loading={loggingInteraction}
              />
            </View>
            <TouchableOpacity
              onPress={() => router.replace(`/people/${savedPersonId}`)}
              className="flex-1 border border-gray-200 rounded-xl py-3 items-center justify-center"
            >
              <Text className="text-sm font-medium text-warm-black">Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="py-1 pr-3">
          <Text className="text-sage text-sm font-semibold">← Back to people</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-warm-black">Add someone new</Text>
        <View style={{ width: 60 }} />
      </View>

      <View className="px-5 pb-8">
        {error != null && <ErrorBanner message={error} />}

        {/* First + Last name side by side */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-warm-black mb-1">
              First name <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              className="border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white text-warm-black"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-warm-black mb-1">Last name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              className="border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white text-warm-black"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Relationship type */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-warm-black mb-2">Relationship type</Text>
          <View className="flex-row gap-2">
            {CATEGORIES.map((cat) => (
              <PillButton
                key={cat.label}
                label={cat.label}
                selected={category === cat.label}
                onPress={() => setCategory(category === cat.label ? null : cat.label)}
              />
            ))}
          </View>
        </View>

        {/* Professional: Company + Role */}
        {isProfessional && (
          <View className="flex-row gap-3 mb-0">
            <View className="flex-1">
              <TextField label="Company" value={company} onChangeText={setCompany} />
            </View>
            <View className="flex-1">
              <TextField label="Role" value={role} onChangeText={setRole} />
            </View>
          </View>
        )}

        {/* Friend or Family: Birthday */}
        {isFriendOrFamily && (
          <DatePicker label="Birthday" value={birthday} onChange={setBirthday} />
        )}

        {/* Family: Relationship label */}
        {isFamily && (
          <TextField
            label="Relationship e.g. parent, sibling"
            value={relationshipType}
            onChangeText={setRelationshipType}
          />
        )}

        <TextField
          label="How did you meet?"
          value={howMet}
          onChangeText={setHowMet}
          placeholder="College, work, mutual friends…"
        />

        <TextField
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="Search for a city..."
        />

        {/* Stay in touch frequency */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-warm-black mb-2">Stay in touch</Text>
          <View className="flex-row flex-wrap gap-2">
            {ONBOARDING_FREQ_OPTIONS.map((opt) => (
              <PillButton
                key={opt.value}
                label={opt.label}
                selected={frequencyDays === opt.value}
                onPress={() => setFrequencyDays(opt.value)}
              />
            ))}
          </View>
        </View>

        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add context, conversation threads, or anything useful for the next reach-out."
          multiline
          numberOfLines={4}
        />

        {/* More details collapsible */}
        <TouchableOpacity
          onPress={() => setShowMore((v) => !v)}
          className="flex-row items-center justify-between py-4 border-t border-gray-100 mb-2"
        >
          <Text className="text-sm font-semibold text-warm-black">More details</Text>
          <Text className="text-lg text-gray-500">{showMore ? "▾" : "▸"}</Text>
        </TouchableOpacity>

        {showMore && (
          <>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextField
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
            />
            <View className="mb-4">
              <Text className="text-sm font-medium text-warm-black mb-1">Relationship strength</Text>
              <View className="flex-row flex-wrap gap-2">
                {["New", "Developing", "Strong", "Trusted"].map((opt) => (
                  <PillButton
                    key={opt}
                    label={opt}
                    selected={relationshipStrength === opt}
                    onPress={() => setRelationshipStrength(relationshipStrength === opt ? "" : opt)}
                  />
                ))}
              </View>
            </View>
            <TextField
              label="Best way to reach them"
              value={preferredContact}
              onChangeText={setPreferredContact}
              placeholder="e.g. Email, Text, Coffee chat"
            />
          </>
        )}

        <Button title="Add person" onPress={handleSave} loading={saving} />
      </View>
    </Screen>
  )
}
