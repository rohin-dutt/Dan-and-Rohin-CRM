import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { ErrorBanner } from "@/components/ErrorBanner"
import { PillButton } from "@/components/PillButton"
import { ONBOARDING_CATEGORY_PILLS, ONBOARDING_FREQ_OPTIONS } from "@/constants/onboarding"
import { colors } from "@/constants/theme"
import { INTERACTION_TYPES, todayInputValue, updateStreakAfterAction } from "@roots/shared"

export default function OnboardingScreen() {
  const router = useRouter()

  // Flow
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [savedPersonId, setSavedPersonId] = useState<string | null>(null)
  const [lastSavedFirstName, setLastSavedFirstName] = useState("")

  // Step 2 state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [birthday, setBirthday] = useState("")
  const [relationship, setRelationship] = useState("")
  const [howMet, setHowMet] = useState("")
  const [selectedFreq, setSelectedFreq] = useState(30)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Step 3 state
  const [interactionType, setInteractionType] = useState("Call")
  const [interactionDate, setInteractionDate] = useState(todayInputValue())
  const [interactionNotes, setInteractionNotes] = useState("")
  const [step3Saving, setStep3Saving] = useState(false)
  const [step3Error, setStep3Error] = useState<string | null>(null)

  async function handleSavePerson() {
    const trimmedFirst = firstName.trim()
    if (!trimmedFirst) {
      setFormError("First name is required.")
      return
    }

    setSaving(true)
    setFormError(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setSaving(false)
      return
    }
    const userId = session.user.id

    const isProfessional = selectedCategory === "Professional"
    const isFamily = selectedCategory === "Family"
    const hasBirthday = selectedCategory === "Friend" || isFamily

    const name = [trimmedFirst, lastName.trim()].filter(Boolean).join(" ")

    const { data, error: insertError } = await supabase
      .from("people")
      .insert({
        user_id: userId,
        name,
        how_met: howMet.trim() || null,
        contact_frequency_days: selectedFreq,
        company: isProfessional && company.trim() ? company.trim() : null,
        role: isProfessional && role.trim() ? role.trim() : null,
        birthday: hasBirthday && birthday ? birthday : null,
        relationship_type: isFamily && relationship.trim() ? relationship.trim() : null,
      })
      .select()
      .single()

    if (insertError || !data) {
      setFormError(insertError?.message ?? "Failed to save. Please try again.")
      setSaving(false)
      return
    }

    // Best-effort: attach category tag
    if (selectedCategory) {
      const catPill = ONBOARDING_CATEGORY_PILLS.find((p) => p.label === selectedCategory)
      if (catPill) {
        const { data: existingArr } = await supabase
          .from("tags")
          .select("id")
          .eq("user_id", userId)
          .eq("name", catPill.tagName)
          .limit(1)

        let tagId: string | null = existingArr?.[0]?.id ?? null

        if (!tagId) {
          const { data: newTag } = await supabase
            .from("tags")
            .insert({ user_id: userId, name: catPill.tagName, color: catPill.tagColor })
            .select("id")
            .single()
          tagId = newTag?.id ?? null
        }

        if (tagId) {
          await supabase.from("person_tags").insert({ person_id: data.id, tag_id: tagId })
        }
      }
    }

    setSavedPersonId(data.id)
    setLastSavedFirstName(trimmedFirst)
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
      p_date: interactionDate,
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

    await updateStreakAfterAction(supabase as unknown as Parameters<typeof updateStreakAfterAction>[0])
    router.replace("/(app)/(tabs)/dashboard")
  }

  const isProfessional = selectedCategory === "Professional"
  const isFamily = selectedCategory === "Family"
  const showBirthday = selectedCategory === "Friend" || isFamily

  // ── Step 1 — Welcome ──────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.cream,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 48,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: colors.muted,
              letterSpacing: 1,
              marginBottom: 40,
            }}
          >
            Step 1 of 3
          </Text>

          <Text style={{ fontSize: 48, marginBottom: 32 }}>🌱</Text>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: colors.warmBlack,
              textAlign: "center",
              fontFamily: "Georgia",
              marginBottom: 12,
              lineHeight: 36,
            }}
          >
            Stay close to the people who matter.
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: colors.muted,
              textAlign: "center",
              lineHeight: 22,
              marginBottom: 20,
            }}
          >
            Roots reminds you to reach out, tracks your interactions, and makes sure no one
            important slips away.
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: colors.muted,
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            We'll send you a weekly email with who to reach out to. You can turn this off in
            Settings.
          </Text>

          <View style={{ width: "100%", marginBottom: 12 }}>
            <Button title="Let's get started →" onPress={() => setStep(2)} />
          </View>

          <Text style={{ fontSize: 12, color: colors.muted }}>Takes about 2 minutes.</Text>
        </View>
      </KeyboardAvoidingView>
    )
  }

  // ── Step 2 — Add one person ───────────────────────────────────────────────

  if (step === 2) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.cream }}
          contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              fontSize: 11,
              color: colors.muted,
              letterSpacing: 1,
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            Step 2 of 3
          </Text>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: colors.warmBlack,
              fontFamily: "Georgia",
              marginBottom: 6,
            }}
          >
            Who's someone you want to stay close to?
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 24, lineHeight: 20 }}>
            A friend you've lost touch with, a colleague worth keeping up with, or family you mean
            to call more.
          </Text>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {formError && <ErrorBanner message={formError} />}

            {/* Name row */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="First name *"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Alex"
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Last name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Smith"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Relationship type */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: colors.warmBlack,
                marginBottom: 8,
              }}
            >
              Relationship type
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
              {ONBOARDING_CATEGORY_PILLS.map(({ label, tagColor }) => (
                <PillButton
                  key={label}
                  label={label}
                  selected={selectedCategory === label}
                  onPress={() => setSelectedCategory(selectedCategory === label ? "" : label)}
                  selectedColor={tagColor}
                />
              ))}
            </View>

            {/* Professional: Company + Role */}
            {isProfessional && (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Company"
                    value={company}
                    onChangeText={setCompany}
                    placeholder="Acme Corp"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Role"
                    value={role}
                    onChangeText={setRole}
                    placeholder="Engineer"
                  />
                </View>
              </View>
            )}

            {/* Friend or Family: Birthday */}
            {showBirthday && (
              <TextField
                label="Birthday"
                value={birthday}
                onChangeText={setBirthday}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
              />
            )}

            {/* Family: Relationship label */}
            {isFamily && (
              <TextField
                label="Relationship"
                value={relationship}
                onChangeText={setRelationship}
                placeholder="parent, sibling…"
                autoCapitalize="none"
              />
            )}

            {/* How did you meet */}
            <TextField
              label="How did you meet?"
              value={howMet}
              onChangeText={setHowMet}
              placeholder="College, work, mutual friends…"
              autoCapitalize="sentences"
            />

            {/* Stay in touch */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: colors.warmBlack,
                marginBottom: 8,
              }}
            >
              Stay in touch
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 20 }}>
              {ONBOARDING_FREQ_OPTIONS.map(({ label, value }) => (
                <PillButton
                  key={value}
                  label={label}
                  selected={selectedFreq === value}
                  onPress={() => setSelectedFreq(value)}
                />
              ))}
            </View>

            <Button
              title={saving ? "Saving…" : "Add to my roots →"}
              onPress={handleSavePerson}
              disabled={saving}
              loading={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ── Step 3 — Log first interaction ────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.cream }}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            fontSize: 11,
            color: colors.muted,
            letterSpacing: 1,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          Step 3 of 3
        </Text>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: colors.warmBlack,
            fontFamily: "Georgia",
            marginBottom: 6,
          }}
        >
          When did you last talk to {lastSavedFirstName}?
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 24, lineHeight: 20 }}>
          This gives Roots the context it needs to remind you at the right time.
        </Text>

        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          {step3Error && (
            <View style={{ marginBottom: 16 }}>
              <ErrorBanner message={step3Error} />
              <TouchableOpacity
                onPress={() => router.replace("/(app)/(tabs)/dashboard")}
                style={{ alignItems: "flex-end", marginTop: 4 }}
              >
                <Text style={{ fontSize: 13, color: colors.sage, fontWeight: "500" }}>
                  Skip anyway →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Interaction type */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: colors.warmBlack,
              marginBottom: 8,
            }}
          >
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
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: colors.warmBlack,
              marginBottom: 6,
            }}
          >
            When?
          </Text>
          <TextInput
            value={interactionDate}
            onChangeText={setInteractionDate}
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
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: colors.warmBlack,
              marginBottom: 6,
            }}
          >
            Notes (optional)
          </Text>
          <TextInput
            value={interactionNotes}
            onChangeText={setInteractionNotes}
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

          <Button
            title={step3Saving ? "Saving…" : "Save and see my dashboard →"}
            onPress={handleSaveInteraction}
            disabled={step3Saving}
            loading={step3Saving}
          />

          <TouchableOpacity
            onPress={() => router.replace("/(app)/(tabs)/dashboard")}
            style={{ alignItems: "center", marginTop: 16 }}
          >
            <Text style={{ fontSize: 14, color: colors.muted }}>
              Skip — I'll add this later →
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
