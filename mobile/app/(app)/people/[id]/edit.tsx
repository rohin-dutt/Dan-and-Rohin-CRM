import { useEffect, useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { PillButton } from "@/components/PillButton"
import { DatePicker } from "@/components/DatePicker"
import { TagPicker } from "@/components/TagPicker"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { colors } from "@/constants/theme"
import { ONBOARDING_FREQ_OPTIONS } from "@/constants/onboarding"
import type { Person, Tag } from "@/types"

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

export default function EditPersonScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [personName, setPersonName] = useState("")

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

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return

        const [personRes, tagsRes, personTagsRes] = await Promise.all([
          supabase.from("people").select("*").eq("id", id).single(),
          supabase.from("tags").select("*").eq("user_id", session.user.id),
          supabase.from("person_tags").select("tag_id").eq("person_id", id),
        ])

        if (personRes.error) throw personRes.error
        const p: Person = personRes.data

        // Split name at first space
        const parts = p.name.split(" ")
        setFirstName(parts[0] ?? "")
        setLastName(parts.slice(1).join(" "))
        setPersonName(p.name)

        setCompany(p.company ?? "")
        setRole(p.role ?? "")
        setBirthday(p.birthday ?? "")
        setRelationshipType(p.relationship_type ?? "")
        setEmail(p.email ?? "")
        setPhone(p.phone ?? "")
        setHowMet(p.how_met ?? "")
        setFrequencyDays(p.contact_frequency_days ?? 30)
        setLocation(p.location ?? "")
        setNotes(p.notes ?? "")
        setRelationshipStrength(p.relationship_strength ?? "")
        setPreferredContact(p.preferred_contact_method ?? "")

        // Auto-expand more details if any are populated
        if (p.email || p.phone || p.relationship_strength || p.preferred_contact_method) {
          setShowMore(true)
        }

        const cat = CATEGORIES.find((c) => c.label === p.relationship_type)
        if (cat) setCategory(cat.label)

        setAllTags(tagsRes.data ?? [])
        setSelectedTagIds((personTagsRes.data ?? []).map((pt) => pt.tag_id))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load person")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

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

      const name = [trimmedFirst, lastName.trim()].filter(Boolean).join(" ")

      const { error: updateErr } = await supabase
        .from("people")
        .update({
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
        .eq("id", id)

      if (updateErr) throw updateErr

      // If a category tag is selected, ensure it's in the selectedTagIds
      let finalTagIds = [...selectedTagIds]
      if (category) {
        const cat = CATEGORIES.find((c) => c.label === category)
        if (cat) {
          const tagId = await getOrCreateTag(session.user.id, cat.tagName, cat.tagColor)
          if (tagId && !finalTagIds.includes(tagId)) {
            finalTagIds = [...finalTagIds, tagId]
          }
        }
      }

      // Replace all person_tags
      await supabase.from("person_tags").delete().eq("person_id", id)
      if (finalTagIds.length > 0) {
        await supabase.from("person_tags").insert(
          finalTagIds.map((tagId) => ({ person_id: id, tag_id: tagId })),
        )
      }

      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateTag(tagName: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from("tags")
      .insert({ user_id: session.user.id, name: tagName, color: colors.sage })
      .select("*")
      .single()

    if (data) {
      setAllTags((prev) => [...prev, data])
      setSelectedTagIds((prev) => [...prev, data.id])
    }
  }

  if (loading) return <LoadingState />

  return (
    <Screen>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="py-1 pr-3">
          <Text className="text-sage text-sm font-semibold">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-warm-black" numberOfLines={1}>
          Edit {personName}
        </Text>
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
          placeholder="Anything else to remember…"
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

        {/* Tags */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-warm-black mb-2">Tags</Text>
          <TagPicker
            tags={allTags}
            selectedTagIds={selectedTagIds}
            onToggle={(tagId) =>
              setSelectedTagIds((prev) =>
                prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
              )
            }
            onCreateTag={handleCreateTag}
          />
        </View>

        <Button title="Save changes" onPress={handleSave} loading={saving} />
      </View>
    </Screen>
  )
}
