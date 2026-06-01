import { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { PillButton } from "@/components/PillButton"
import { ErrorBanner } from "@/components/ErrorBanner"
import { ONBOARDING_CATEGORY_PILLS, ONBOARDING_FREQ_OPTIONS } from "@/constants/onboarding"
import { colors } from "@/constants/theme"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function NewPersonScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [birthday, setBirthday] = useState("")
  const [relationship, setRelationship] = useState("")
  const [howMet, setHowMet] = useState("")
  const [location, setLocation] = useState("")
  const [selectedFreq, setSelectedFreq] = useState(30)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isProfessional = selectedCategory === "Professional"
  const isFamily = selectedCategory === "Family"
  const showBirthday = selectedCategory === "Friend" || isFamily

  async function handleSave() {
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
        birthday: showBirthday && birthday ? birthday : null,
        relationship_type: isFamily && relationship.trim() ? relationship.trim() : null,
        location: location.trim() || null,
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

    setSaving(false)
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
          Add someone new
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
          <Text style={{ fontSize: 13, fontWeight: "500", color: colors.warmBlack, marginBottom: 8 }}>
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

          {/* Location */}
          <TextField
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City, state…"
            autoCapitalize="words"
          />

          {/* Contact frequency */}
          <Text style={{ fontSize: 13, fontWeight: "500", color: colors.warmBlack, marginBottom: 8 }}>
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
            title={saving ? "Saving…" : "Save"}
            onPress={handleSave}
            disabled={saving}
            loading={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
