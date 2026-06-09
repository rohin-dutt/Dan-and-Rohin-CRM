import { useEffect, useState } from "react"
import { Switch, Text, TouchableOpacity, View } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { PillButton } from "@/components/PillButton"
import { TagPicker } from "@/components/TagPicker"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { loadImportantMomentsForPerson } from "@/lib/important-moments"
import { colors } from "@/constants/theme"
import { ONBOARDING_FREQ_OPTIONS } from "@/constants/onboarding"
import type { ImportantMoment, Person, Tag } from "@/types"

const CATEGORIES = [
  { label: "Friend", tagName: "Friend", tagColor: "#16A34A" },
  { label: "Family", tagName: "Family", tagColor: "#2563EB" },
  { label: "Professional", tagName: "Professional", tagColor: "#D97706" },
] as const

type CategoryLabel = (typeof CATEGORIES)[number]["label"]
type MomentDraft = Pick<ImportantMoment, "label" | "date" | "recurs_yearly">

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
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [importantMoments, setImportantMoments] = useState<MomentDraft[]>([])

  const [name, setName] = useState("")
  const [category, setCategory] = useState<CategoryLabel | null>(null)
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [birthday, setBirthday] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [howMet, setHowMet] = useState("")
  const [frequencyDays, setFrequencyDays] = useState(30)
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return

        const [personRes, tagsRes, personTagsRes, loadedMoments] = await Promise.all([
          supabase.from("people").select("*").eq("id", id).single(),
          supabase.from("tags").select("*").eq("user_id", session.user.id),
          supabase.from("person_tags").select("tag_id").eq("person_id", id),
          loadImportantMomentsForPerson(id),
        ])

        if (personRes.error) throw personRes.error
        const p: Person = personRes.data

        setName(p.name)
        setCompany(p.company ?? "")
        setRole(p.role ?? "")
        setBirthday(p.birthday ?? "")
        setEmail(p.email ?? "")
        setPhone(p.phone ?? "")
        setHowMet(p.how_met ?? "")
        setFrequencyDays(p.contact_frequency_days ?? 30)
        setLocation(p.location ?? "")
        setNotes(p.notes ?? "")

        const cat = CATEGORIES.find((c) => c.label === p.relationship_type)
        if (cat) setCategory(cat.label)

        setAllTags(tagsRes.data ?? [])
        setSelectedTagIds((personTagsRes.data ?? []).map((pt) => pt.tag_id))
        setImportantMoments(
          loadedMoments.map((moment) => ({
            label: moment.label,
            date: moment.date,
            recurs_yearly: moment.recurs_yearly,
          })),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load person")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const isProfessional = category === "Professional"
  const isFriendOrFamily = category === "Friend" || category === "Family"

  function addImportantMoment() {
    setImportantMoments((current) => [...current, { label: "", date: "", recurs_yearly: true }])
  }

  function updateImportantMoment(index: number, patch: Partial<MomentDraft>) {
    setImportantMoments((current) =>
      current.map((moment, momentIndex) => (momentIndex === index ? { ...moment, ...patch } : moment)),
    )
  }

  function removeImportantMoment(index: number) {
    setImportantMoments((current) => current.filter((_, momentIndex) => momentIndex !== index))
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    if (!category) {
      setCategoryError("Choose Friend, Family, or Professional.")
      return
    }
    const cleanMoments = importantMoments
      .map((moment) => ({ ...moment, label: moment.label.trim(), date: moment.date.trim() }))
      .filter((moment) => moment.label || moment.date)
    const invalidMoment = cleanMoments.find((moment) => !moment.label || !/^\d{4}-\d{2}-\d{2}$/.test(moment.date))
    if (invalidMoment) {
      setError("Important moments need a label and date in YYYY-MM-DD format.")
      return
    }

    setSaving(true)
    setError(null)
    setCategoryError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const { error: updateErr } = await supabase
        .from("people")
        .update({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          company: company.trim() || null,
          role: role.trim() || null,
          birthday: birthday.trim() || null,
          how_met: howMet.trim() || null,
          location: location.trim() || null,
          notes: notes.trim() || null,
          contact_frequency_days: frequencyDays,
          relationship_type: category ?? null,
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

      const { error: deleteMomentsError } = await supabase.from("important_moments").delete().eq("person_id", id)
      if (deleteMomentsError) throw deleteMomentsError
      if (cleanMoments.length > 0) {
        const { error: insertMomentsError } = await supabase.from("important_moments").insert(
          cleanMoments.map((moment) => ({
            user_id: session.user.id,
            person_id: id,
            label: moment.label,
            date: moment.date,
            recurs_yearly: moment.recurs_yearly,
          })),
        )
        if (insertMomentsError) throw insertMomentsError
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
        <Text className="text-base font-semibold text-warm-black">Edit person</Text>
        <View style={{ width: 60 }} />
      </View>

      <View className="px-5 pb-8">
        {error != null && <ErrorBanner message={error} />}

        <TextField
          label="Name *"
          value={name}
          onChangeText={setName}
          placeholder="Full name"
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Category */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-warm-black mb-2">Relationship type *</Text>
          <View className="flex-row gap-2">
            {CATEGORIES.map((cat) => (
              <PillButton
                key={cat.label}
                label={cat.label}
                selected={category === cat.label}
                onPress={() => {
                  setCategory(cat.label)
                  setCategoryError(null)
                }}
              />
            ))}
          </View>
          {categoryError && <Text className="text-xs text-red-500 mt-2">{categoryError}</Text>}
        </View>

        {isProfessional && (
          <>
            <TextField
              label="Company"
              value={company}
              onChangeText={setCompany}
              placeholder="Company name"
              returnKeyType="next"
            />
            <TextField
              label="Role"
              value={role}
              onChangeText={setRole}
              placeholder="Job title"
              returnKeyType="next"
            />
          </>
        )}

        {isFriendOrFamily && (
          <TextField
            label="Birthday"
            value={birthday}
            onChangeText={setBirthday}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            returnKeyType="next"
          />
        )}

        <View className="mb-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-warm-black">Important moments</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add important moment" onPress={addImportantMoment}>
              <Text className="text-sm font-semibold text-sage">Add</Text>
            </TouchableOpacity>
          </View>
          {importantMoments.length === 0 ? (
            <Text className="text-sm text-gray-500">Add dates like an anniversary or graduation.</Text>
          ) : (
            importantMoments.map((moment, index) => (
              <View key={index} className="mb-3 rounded-xl border border-gray-200 bg-white p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-warm-black">Moment {index + 1}</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove important moment" onPress={() => removeImportantMoment(index)}>
                    <Text className="text-sm font-semibold text-red-600">Remove</Text>
                  </TouchableOpacity>
                </View>
                <TextField
                  label="Label"
                  value={moment.label}
                  onChangeText={(text) => updateImportantMoment(index, { label: text })}
                  placeholder="Anniversary, graduation..."
                  returnKeyType="next"
                />
                <TextField
                  label="Date"
                  value={moment.date}
                  onChangeText={(text) => updateImportantMoment(index, { date: text })}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="next"
                />
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-warm-black">Repeat yearly</Text>
                  <Switch
                    value={moment.recurs_yearly}
                    onValueChange={(value) => updateImportantMoment(index, { recurs_yearly: value })}
                    trackColor={{ false: colors.border, true: colors.sage }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            ))
          )}
        </View>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />

        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 (555) 000-0000"
          keyboardType="phone-pad"
          returnKeyType="next"
        />

        <TextField
          label="How did you meet?"
          value={howMet}
          onChangeText={setHowMet}
          placeholder="At a conference, through a friend…"
          returnKeyType="next"
        />

        {/* Frequency */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-warm-black mb-2">
            How often should you stay in touch?
          </Text>
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
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="City, country"
          returnKeyType="next"
        />

        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything else to remember…"
          multiline
          numberOfLines={3}
          returnKeyType="default"
        />

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
