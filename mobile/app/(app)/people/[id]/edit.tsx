import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { PillButton } from "@/components/PillButton"
import { ErrorBanner } from "@/components/ErrorBanner"
import { LoadingState } from "@/components/LoadingState"
import { TagPicker } from "@/components/TagPicker"
import { ONBOARDING_CATEGORY_PILLS, ONBOARDING_FREQ_OPTIONS } from "@/constants/onboarding"
import { colors } from "@/constants/theme"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { Person, Tag } from "@/types"

export default function EditPersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [userId, setUserId] = useState("")

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

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])

  const isProfessional = selectedCategory === "Professional"
  const isFamily = selectedCategory === "Family"
  const showBirthday = selectedCategory === "Friend" || isFamily

  useEffect(() => {
    async function loadData() {
      if (!id) return
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        setUserId(session.user.id)

        const [personRes, personTagsRes, allTagsRes] = await Promise.all([
          supabase.from("people").select("*").eq("id", id).eq("user_id", session.user.id).single(),
          supabase.from("person_tags").select("tag_id, tags(*)").eq("person_id", id),
          supabase.from("tags").select("*").eq("user_id", session.user.id).order("name"),
        ])

        if (personRes.error || !personRes.data) {
          setNotFound(true)
          return
        }

        const person = personRes.data as Person
        const nameParts = person.name.split(" ")
        setFirstName(nameParts[0] ?? "")
        setLastName(nameParts.slice(1).join(" "))
        setCompany(person.company ?? "")
        setRole(person.role ?? "")
        setBirthday(person.birthday ?? "")
        setRelationship(person.relationship_type ?? "")
        setHowMet(person.how_met ?? "")
        setLocation(person.location ?? "")
        setSelectedFreq(person.contact_frequency_days ?? 30)

        // Infer category from tags
        const tagData: Tag[] = (personTagsRes.data ?? [])
          .map((pt: { tags: unknown }) => pt.tags)
          .filter(Boolean) as Tag[]
        const tagIds = tagData.map((t) => t.id)
        setSelectedTagIds(tagIds)

        const tags = (allTagsRes.data as Tag[]) ?? []
        setAllTags(tags)

        // Pre-select category pill if a matching tag exists
        const categoryMatch = ONBOARDING_CATEGORY_PILLS.find((pill) =>
          tagData.some((t) => t.name === pill.tagName)
        )
        if (categoryMatch) setSelectedCategory(categoryMatch.label)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  async function handleSave() {
    const trimmedFirst = firstName.trim()
    if (!trimmedFirst) {
      setFormError("First name is required.")
      return
    }
    setSaving(true)
    setFormError(null)

    const name = [trimmedFirst, lastName.trim()].filter(Boolean).join(" ")

    const { error: updateError } = await supabase
      .from("people")
      .update({
        name,
        how_met: howMet.trim() || null,
        contact_frequency_days: selectedFreq,
        company: isProfessional && company.trim() ? company.trim() : null,
        role: isProfessional && role.trim() ? role.trim() : null,
        birthday: showBirthday && birthday ? birthday : null,
        relationship_type: isFamily && relationship.trim() ? relationship.trim() : null,
        location: location.trim() || null,
      })
      .eq("id", id)
      .eq("user_id", userId)

    if (updateError) {
      setFormError(updateError.message ?? "Failed to save. Please try again.")
      setSaving(false)
      return
    }

    // Save tags via RPC
    const { error: tagsError } = await supabase.rpc("replace_person_tags", {
      p_person_id: id,
      p_tag_ids: selectedTagIds,
    })

    if (tagsError) {
      setFormError(tagsError.message ?? "Saved, but failed to update tags.")
      setSaving(false)
      return
    }

    setSaving(false)
    router.back()
  }

  if (loading) return <LoadingState />

  if (notFound) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream, paddingTop: insets.top, padding: 24 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 15, color: colors.sage, fontWeight: "600" }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, color: colors.muted }}>Person not found.</Text>
      </View>
    )
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
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ fontSize: 15, color: colors.sage, fontWeight: "600" }}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={{ fontSize: 15, color: colors.sage, fontWeight: "700" }}>
              {saving ? "Saving…" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{
          fontSize: 24,
          fontWeight: "700",
          color: colors.warmBlack,
          fontFamily: "Georgia",
          marginBottom: 24,
        }}>
          Edit
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

          {/* Tags */}
          <Text style={{ fontSize: 13, fontWeight: "500", color: colors.warmBlack, marginBottom: 8 }}>
            Tags
          </Text>
          <TagPicker
            selectedTagIds={selectedTagIds}
            allTags={allTags}
            onTagsChange={setSelectedTagIds}
            userId={userId}
          />

          <View style={{ marginTop: 20 }}>
            <Button
              title={saving ? "Saving…" : "Save"}
              onPress={handleSave}
              disabled={saving}
              loading={saving}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
