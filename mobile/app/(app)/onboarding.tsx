import { useEffect, useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { ErrorBanner } from "@/components/ErrorBanner"
import { PillButton } from "@/components/PillButton"
import { InlineDateField } from "@/components/InlineDateField"
import { SoftCard } from "@/components/RootsUI"
import { AnchoredMenu, useAnchoredMenu } from "@/components/AnchoredMenu"
import { createPersonWithRelations, PersonRelationsError } from "@/lib/people-data"
import { RELATIONSHIP_CATEGORIES, type RelationshipCategoryLabel } from "@/constants/categories"
import { CONTACT_FREQUENCY_OPTIONS, frequencyLabel } from "@/constants/frequencies"
import { colors, fonts } from "@/constants/theme"
import { INTERACTION_TYPES, normalizeMomentDrafts, toLocalDateString, type ImportantMomentDraft } from "@roots/shared"
import { BirthdayField } from "@/features/person-form/BirthdayField"
import { CompactTextField } from "@/features/person-form/CompactTextField"
import { MomentDraftsEditor } from "@/features/person-form/MomentDraftsEditor"
import { LocationSuggestionsList } from "@/features/person-form/LocationSuggestionsList"
import { useLocationAutocomplete } from "@/features/person-form/use-location-autocomplete"

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
  const [category, setCategory] = useState<RelationshipCategoryLabel | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [birthdayDate, setBirthdayDate] = useState<Date | null>(null)
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [howMet, setHowMet] = useState("")
  const [frequencyDays, setFrequencyDays] = useState(90)
  const [importantMoments, setImportantMoments] = useState<ImportantMomentDraft[]>([])
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const freqMenu = useAnchoredMenu()
  const locationField = useLocationAutocomplete()

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
    setCategory(null)
    setCategoryError(null)
    setCompany("")
    setRole("")
    setBirthdayDate(null)
    setEmail("")
    setPhone("")
    setNotes("")
    setHowMet("")
    setFrequencyDays(90)
    setImportantMoments([])
    setDetailsExpanded(false)
    setFormError(null)
    locationField.resetLocation("", null, null)
  }

  async function handleSavePerson() {
    if (saving) return
    if (!firstName.trim()) {
      setFormError("First name is required")
      return
    }
    if (!lastName.trim()) {
      setFormError("Last name is required")
      return
    }
    if (!category) {
      setCategoryError("Please select a relationship type.")
      return
    }
    const cleanName = `${firstName.trim()} ${lastName.trim()}`
    const { moments: cleanMoments, valid } = normalizeMomentDrafts(importantMoments)
    if (!valid) {
      setFormError("Important moments need both a label and a date.")
      return
    }
    if (!userId) return

    setSaving(true)
    setFormError(null)
    setCategoryError(null)

    let personId: string
    try {
      personId = await createPersonWithRelations({
        userId,
        person: {
          name: cleanName,
          email: email.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          company: company.trim() || null,
          role: role.trim() || null,
          birthday: birthdayDate ? toLocalDateString(birthdayDate) : null,
          how_met: howMet.trim() || null,
          location: locationField.location.trim() || null,
          latitude: locationField.latitude ?? null,
          longitude: locationField.longitude ?? null,
          contact_frequency_days: frequencyDays,
          relationship_type: category ?? null,
        },
        categoryLabel: category,
        moments: cleanMoments,
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
    setLastSavedFirstName(firstName.trim())
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
  if (step === 2) {
    return (
      <Screen>
        <View className="px-5 pt-3 pb-6">
          <Text className="text-2xl font-bold text-warm-black mb-1">
            Who's someone you want to stay close to?
          </Text>
          <Text className="text-sm text-gray-500 mb-4">
            A friend you've lost touch with, a colleague worth keeping up with, or family you
            mean to call more.
          </Text>

          {formError != null && <ErrorBanner message={formError} />}

          <Text style={{ fontFamily: fonts.body, color: colors.error, fontSize: 12 }} className="mt-2">
            * Required field
          </Text>

          {/* Main form card */}
          <SoftCard className="mt-2 p-3">
            {/* Name row */}
            <View className="mb-3 flex-row gap-2">
              <View className="flex-1">
                <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
                  First name <Text style={{ color: "#B91C1C" }}>*</Text>
                </Text>
                <TextInput
                  accessibilityLabel="First name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Alex"
                  placeholderTextColor="#8F96A3"
                  autoCapitalize="words"
                  returnKeyType="next"
                  className="rounded-xl border border-stone-200 bg-white px-3 text-sm"
                  style={{ height: 44, fontFamily: fonts.body, color: colors.ink }}
                />
              </View>
              <View className="flex-1">
                <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
                  Last name <Text style={{ color: "#B91C1C" }}>*</Text>
                </Text>
                <TextInput
                  accessibilityLabel="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Taylor"
                  placeholderTextColor="#8F96A3"
                  autoCapitalize="words"
                  returnKeyType="next"
                  className="rounded-xl border border-stone-200 bg-white px-3 text-sm"
                  style={{ height: 44, fontFamily: fonts.body, color: colors.ink }}
                />
              </View>
            </View>

            {/* Relationship type */}
            <View className="mb-3">
              <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
                Relationship type <Text style={{ color: "#B91C1C" }}>*</Text>
              </Text>
              <View className="flex-row overflow-hidden rounded-xl border border-stone-200">
                {RELATIONSHIP_CATEGORIES.map((cat, index) => {
                  const selected = category === cat.label
                  return (
                    <TouchableOpacity
                      key={cat.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Relationship type ${cat.label}`}
                      onPress={() => {
                        setCategory(cat.label)
                        setCategoryError(null)
                      }}
                      className={`min-h-[50px] flex-1 flex-row items-center justify-center px-1 ${index > 0 ? "border-l border-stone-200" : ""}`}
                      style={{ backgroundColor: selected ? colors.forest : "white" }}
                    >
                      <Ionicons name={cat.icon} size={18} color={selected ? "white" : colors.muted} />
                      <Text
                        style={{ fontFamily: fonts.medium, color: selected ? "white" : colors.ink }}
                        className="ml-1.5 text-sm"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              {categoryError ? <Text className="mt-1.5 text-xs text-red-500">{categoryError}</Text> : null}
            </View>

            {/* Keep in touch — frequency dropdown */}
            <View className="mb-3">
              <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
                Keep in touch
              </Text>
              <View ref={freqMenu.anchorRef}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Choose keep in touch cadence"
                  onPress={freqMenu.toggle}
                  activeOpacity={0.78}
                  className="flex-row items-center rounded-xl border border-stone-200 bg-white"
                  style={{ height: 44 }}
                >
                  <View className="items-center justify-center border-r border-stone-200" style={{ width: 44, height: 44 }}>
                    <Ionicons name="calendar-outline" size={20} color={colors.forest} />
                  </View>
                  <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="flex-1 px-3 text-sm">
                    {frequencyLabel(frequencyDays)}
                  </Text>
                  <Ionicons name={freqMenu.visible ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
                  <View className="w-3" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Location */}
            <View className="mb-3">
              <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
                Location
              </Text>
              <View className="flex-row items-center rounded-xl border border-stone-200 bg-white" style={{ height: 44 }}>
                <View className="items-center justify-center border-r border-stone-200" style={{ width: 44, height: 44 }}>
                  <Ionicons name="location-outline" size={20} color={colors.forest} />
                </View>
                <TextInput
                  accessibilityLabel="Location"
                  value={locationField.location}
                  onChangeText={locationField.handleLocationChange}
                  placeholder="City, country"
                  placeholderTextColor="#8F96A3"
                  className="flex-1 px-3 text-sm"
                  style={{ fontFamily: fonts.body, color: colors.ink, height: 44 }}
                  returnKeyType="next"
                />
                {locationField.latitude !== null ? (
                  <View className="pr-3">
                    <Ionicons name="checkmark-circle" size={18} color={colors.forest} />
                  </View>
                ) : null}
              </View>
              <LocationSuggestionsList
                suggestions={locationField.suggestions}
                onSelect={locationField.selectSuggestion}
              />
            </View>

            {/* How you met (or Relationship for Family) */}
            <CompactTextField
              label={category === "Family" ? "Relationship" : "How you met"}
              icon="people-outline"
              value={howMet}
              onChangeText={setHowMet}
              placeholder={category === "Family" ? "Parent, sibling, partner..." : "At a conference, through a friend..."}
            />

            {/* Phone */}
            <CompactTextField
              label="Phone"
              icon="call-outline"
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 123 4567"
              keyboardType="phone-pad"
            />

            {/* Notes */}
            <CompactTextField
              label="Notes"
              icon="document-text-outline"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything else to remember..."
              multiline
            />

            {/* Conditional: Birthday for Friend/Family */}
            {(category === "Friend" || category === "Family") ? (
              <BirthdayField date={birthdayDate} onChange={setBirthdayDate} />
            ) : null}

            {/* Conditional: Email + Company for Professional */}
            {category === "Professional" ? (
              <>
                <CompactTextField
                  label="Email"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="alex@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <CompactTextField
                  label="Company"
                  icon="business-outline"
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Company name"
                />
              </>
            ) : null}
          </SoftCard>

          {/* Show more details */}
          <SoftCard className="mt-4">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: detailsExpanded }}
              accessibilityLabel={detailsExpanded ? "Hide more details" : "Show more details"}
              onPress={() => setDetailsExpanded((value) => !value)}
              activeOpacity={0.78}
              className="flex-row items-center p-3"
            >
              <View className="flex-1">
                <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-base">
                  {detailsExpanded ? "Hide more details" : "Show more details"}
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-0.5 text-xs leading-4">
                  Role, important dates, and more
                </Text>
              </View>
              <Ionicons name={detailsExpanded ? "chevron-up" : "chevron-down"} size={22} color={colors.muted} />
            </TouchableOpacity>

            {detailsExpanded ? (
              <View className="border-t border-stone-100 p-3">
                {(category === "Friend" || category === "Family") ? (
                  <CompactTextField
                    label="Company"
                    icon="business-outline"
                    value={company}
                    onChangeText={setCompany}
                    placeholder="Company name"
                  />
                ) : null}

                <CompactTextField
                  label="Role"
                  icon="briefcase-outline"
                  value={role}
                  onChangeText={setRole}
                  placeholder="Job title"
                />

                {(category === "Friend" || category === "Family") ? (
                  <CompactTextField
                    label="Email"
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="alex@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : null}

                {category === "Professional" ? (
                  <BirthdayField date={birthdayDate} onChange={setBirthdayDate} />
                ) : null}

                <MomentDraftsEditor moments={importantMoments} onChange={setImportantMoments} />
              </View>
            ) : null}
          </SoftCard>

          <View className="mt-6">
            <Button title="Add to my roots →" onPress={handleSavePerson} loading={saving} />
          </View>
        </View>

        <AnchoredMenu
          visible={freqMenu.visible}
          position={freqMenu.position}
          options={CONTACT_FREQUENCY_OPTIONS.map((option) => ({ key: option.value, label: option.label }))}
          selectedKey={frequencyDays}
          onSelect={setFrequencyDays}
          onClose={freqMenu.close}
        />
      </Screen>
    )
  }

  // ── Step 3 ────────────────────────────────────────────────────────────────
  return (
    <Screen>
      <View className="px-6 py-8">
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
