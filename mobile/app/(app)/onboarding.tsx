import { useEffect, useState } from "react"
import { useRouter } from "expo-router"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { ErrorBanner } from "@/components/ErrorBanner"
import { PillButton } from "@/components/PillButton"
import { InlineDateField } from "@/components/InlineDateField"
import { createPersonWithRelations, PersonRelationsError } from "@/lib/people-data"
import { RELATIONSHIP_CATEGORIES } from "@/constants/categories"
import { CONTACT_FREQUENCY_OPTIONS } from "@/constants/frequencies"
import { birthdayPartsToLegacyDate, INTERACTION_TYPES, parseBirthdayDate, toLocalDateString } from "@roots/shared"

export default function OnboardingScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Flow
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [savedPersonId, setSavedPersonId] = useState<string | null>(null)
  const [lastSavedFirstName, setLastSavedFirstName] = useState("")

  // Step 2 form
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [birthday, setBirthday] = useState<Date | null>(null)
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false)
  const [relationship, setRelationship] = useState("")
  const [howMet, setHowMet] = useState("")
  const [selectedFreq, setSelectedFreq] = useState(30)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Step 3 form
  const [interactionType, setInteractionType] = useState("Call")
  const [interactionDate, setInteractionDate] = useState<Date>(new Date())
  const [showInteractionDatePicker, setShowInteractionDatePicker] = useState(false)
  const [interactionNotes, setInteractionNotes] = useState("")
  const [step3Saving, setStep3Saving] = useState(false)
  const [step3Error, setStep3Error] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/(auth)/login")
        return
      }
      setUserId(user.id)
      setLoading(false)
    })
  }, [])

  function resetForm() {
    setFirstName("")
    setLastName("")
    setSelectedCategory("")
    setCompany("")
    setRole("")
    setBirthday(null)
    setShowBirthdayPicker(false)
    setRelationship("")
    setHowMet("")
    setSelectedFreq(30)
    setFormError(null)
  }

  async function handleSavePerson() {
    const trimmedFirst = firstName.trim()
    if (!trimmedFirst) {
      setFormError("First name is required.")
      return
    }
    if (!userId || saving) return
    setSaving(true)
    setFormError(null)

    const isProfessional = selectedCategory === "Professional"
    const isFamily = selectedCategory === "Family"
    const hasBirthday = selectedCategory === "Friend" || isFamily
    const name = [trimmedFirst, lastName.trim()].filter(Boolean).join(" ")

    let personId: string
    try {
      personId = await createPersonWithRelations({
        userId,
        person: {
          name,
          how_met: howMet.trim() || null,
          contact_frequency_days: selectedFreq,
          company: isProfessional && company.trim() ? company.trim() : null,
          role: isProfessional && role.trim() ? role.trim() : null,
          birthday_month: hasBirthday && birthday ? parseBirthdayDate(birthday).month : null,
          birthday_day: hasBirthday && birthday ? parseBirthdayDate(birthday).day : null,
          birthday_year: hasBirthday && birthday ? parseBirthdayDate(birthday).year : null,
          birthday: hasBirthday && birthday ? birthdayPartsToLegacyDate(parseBirthdayDate(birthday)) : null,
          relationship_type: isFamily && relationship.trim() ? relationship.trim() : null,
        },
        categoryLabel: selectedCategory || null,
      })
    } catch (e) {
      if (e instanceof PersonRelationsError) {
        // Person was saved; category tag assignment is best-effort during
        // onboarding, so continue instead of blocking the flow.
        personId = e.personId
      } else {
        setFormError(e instanceof Error ? e.message : "Failed to save. Please try again.")
        setSaving(false)
        return
      }
    }

    setSavedPersonId(personId)
    setLastSavedFirstName(trimmedFirst)
    resetForm()
    setSaving(false)
    setStep(3)
  }

  async function handleSaveInteraction() {
    if (!savedPersonId) return
    setStep3Saving(true)
    setStep3Error(null)

    const { error } = await supabase.rpc("create_interaction_and_touch_person", {
      p_person_id: savedPersonId,
      p_type: interactionType,
      p_date: toLocalDateString(interactionDate),
      p_notes: interactionNotes.trim() || null,
      p_follow_up_needed: false,
      p_follow_up_date: null,
      p_follow_up_status: "done",
    })

    if (error) {
      setStep3Error(error.message ?? "Failed to save. Please try again.")
      setStep3Saving(false)
      return
    }

    router.replace("/(app)/(tabs)/dashboard")
  }

  if (loading) return null

  // ── Step 1 ────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <Screen scrollable={false}>
        <View className="flex-1 items-center justify-center px-6 py-12">
          <Text className="text-xs text-gray-400 tracking-widest mb-10">STEP 1 OF 3</Text>
          <Text className="text-3xl font-bold text-warm-black text-center mb-3">
            Stay close to the people who matter.
          </Text>
          <Text className="text-base text-gray-500 text-center mb-8">
            Roots reminds you to reach out, tracks your interactions, and makes sure no one
            important slips away.
          </Text>
          <Text className="text-xs text-gray-400 text-center mb-8">
            We'll send you reminders about who to reach out to. You can turn this off anytime
            in Settings.
          </Text>
          <Button title="Let's get started →" onPress={() => setStep(2)} />
          <Text className="text-xs text-gray-400 mt-3">Takes about 2 minutes.</Text>
        </View>
      </Screen>
    )
  }

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const showProfessional = selectedCategory === "Professional"
  const showFamily = selectedCategory === "Family"
  const showBirthday = selectedCategory === "Friend" || showFamily

  if (step === 2) {
    return (
      <Screen>
        <View className="px-6 py-8">
          <Text className="text-xs text-gray-400 tracking-widest mb-6">STEP 2 OF 3</Text>
          <Text className="text-2xl font-bold text-warm-black mb-1">
            Who's someone you want to stay close to?
          </Text>
          <Text className="text-sm text-gray-500 mb-6">
            A friend you've lost touch with, a colleague worth keeping up with, or family you
            mean to call more.
          </Text>

          {formError && <ErrorBanner message={formError} />}

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-warm-black mb-1">
                First name <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Alex"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-warm-black mb-1">Last name</Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Smith"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
              />
            </View>
          </View>

          <Text className="text-sm font-medium text-warm-black mb-2">Relationship type</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {RELATIONSHIP_CATEGORIES.map(({ label }) => (
              <PillButton
                key={label}
                label={label}
                selected={selectedCategory === label}
                onPress={() => setSelectedCategory(selectedCategory === label ? "" : label)}
              />
            ))}
          </View>

          {showProfessional && (
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-warm-black mb-1">Company</Text>
                <TextInput
                  value={company}
                  onChangeText={setCompany}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-warm-black mb-1">Role</Text>
                <TextInput
                  value={role}
                  onChangeText={setRole}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                />
              </View>
            </View>
          )}

          {showBirthday && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-warm-black mb-1">Birthday</Text>
              <InlineDateField
                date={birthday}
                placeholder="Select birthday"
                open={showBirthdayPicker}
                onToggle={() => setShowBirthdayPicker((v) => !v)}
                onChange={setBirthday}
                onDone={() => setShowBirthdayPicker(false)}
              />
            </View>
          )}

          {showFamily && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-warm-black mb-1">
                Relationship e.g. parent, sibling
              </Text>
              <TextInput
                value={relationship}
                onChangeText={setRelationship}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
              />
            </View>
          )}

          <View className="mb-4">
            <Text className="text-sm font-medium text-warm-black mb-1">How did you meet?</Text>
            <TextInput
              value={howMet}
              onChangeText={setHowMet}
              placeholder="College, work, mutual friends…"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
            />
          </View>

          <Text className="text-sm font-medium text-warm-black mb-2">Stay in touch</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {CONTACT_FREQUENCY_OPTIONS.map(({ label, value }) => (
              <PillButton
                key={value}
                label={label}
                selected={selectedFreq === value}
                onPress={() => setSelectedFreq(value)}
              />
            ))}
          </View>

          <Button title="Add to my roots →" onPress={handleSavePerson} loading={saving} />
        </View>
      </Screen>
    )
  }

  // ── Step 3 ────────────────────────────────────────────────────────────────
  return (
    <Screen>
      <View className="px-6 py-8">
        <Text className="text-xs text-gray-400 tracking-widest mb-6">STEP 3 OF 3</Text>
        <Text className="text-2xl font-bold text-warm-black mb-1">
          When did you last talk to {lastSavedFirstName}?
        </Text>
        <Text className="text-sm text-gray-500 mb-6">
          This gives Roots the context it needs to remind you at the right time.
        </Text>

        {step3Error && <ErrorBanner message={step3Error} />}

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

        <View className="mb-4">
          <Text className="text-sm font-medium text-warm-black mb-1">When?</Text>
          <InlineDateField
            date={interactionDate}
            placeholder="Select date"
            open={showInteractionDatePicker}
            onToggle={() => setShowInteractionDatePicker((v) => !v)}
            onChange={setInteractionDate}
            onDone={() => setShowInteractionDatePicker(false)}
            maximumDate={new Date()}
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-warm-black mb-1">Notes (optional)</Text>
          <TextInput
            value={interactionNotes}
            onChangeText={setInteractionNotes}
            placeholder="What did you talk about?"
            multiline
            numberOfLines={3}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white"
          />
        </View>

        <Button
          title="Save and see my dashboard →"
          onPress={handleSaveInteraction}
          loading={step3Saving}
        />

        <TouchableOpacity
          onPress={() => router.replace("/(app)/(tabs)/dashboard")}
          className="mt-4 items-center"
        >
          <Text className="text-sm text-gray-400">Skip — I'll add this later →</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}
