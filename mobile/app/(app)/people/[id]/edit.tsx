import { useEffect, useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TagPicker } from "@/components/TagPicker"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { AnchoredMenu, useAnchoredMenu } from "@/components/AnchoredMenu"
import { supabase } from "@/lib/supabase"
import { loadImportantMomentsForPerson } from "@/lib/important-moments"
import { updatePersonWithRelations } from "@/lib/people-data"
import { safeBack } from "@/lib/navigation"
import { colors, fonts } from "@/constants/theme"
import { findRelationshipCategory, RELATIONSHIP_CATEGORIES, type RelationshipCategoryLabel } from "@/constants/categories"
import { CONTACT_FREQUENCY_OPTIONS, frequencyLabel } from "@/constants/frequencies"
import {
  normalizeMomentDrafts,
  parseLocalDateString,
  toLocalDateString,
  type ImportantMomentDraft,
} from "@roots/shared"
import { BirthdayField } from "@/features/person-form/BirthdayField"
import { MomentDraftsEditor } from "@/features/person-form/MomentDraftsEditor"
import { LocationSuggestionsList } from "@/features/person-form/LocationSuggestionsList"
import { useLocationAutocomplete } from "@/features/person-form/use-location-autocomplete"
import type { Person, Tag } from "@/types"

export default function EditPersonScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [importantMoments, setImportantMoments] = useState<ImportantMomentDraft[]>([])

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [category, setCategory] = useState<RelationshipCategoryLabel | null>(null)
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [birthdayDate, setBirthdayDate] = useState<Date | null>(null)
  const [email, setEmail] = useState("")
  const [howMet, setHowMet] = useState("")
  const [frequencyDays, setFrequencyDays] = useState(30)
  const [notes, setNotes] = useState("")

  const freqMenu = useAnchoredMenu()
  const locationField = useLocationAutocomplete()
  const { resetLocation } = locationField

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
        if (tagsRes.error) throw tagsRes.error
        if (personTagsRes.error) throw personTagsRes.error
        const p: Person = personRes.data

        // Split name into first/last
        const nameParts = p.name.trim().split(/\s+/)
        setFirstName(nameParts[0] ?? "")
        setLastName(nameParts.slice(1).join(" "))

        setCompany(p.company ?? "")
        setRole(p.role ?? "")
        setEmail(p.email ?? "")
        setHowMet(p.how_met ?? "")
        setFrequencyDays(p.contact_frequency_days ?? 30)
        resetLocation(p.location ?? "", p.latitude ?? null, p.longitude ?? null)
        setNotes(p.notes ?? "")

        if (p.birthday) {
          setBirthdayDate(parseLocalDateString(p.birthday))
        }

        const cat = findRelationshipCategory(p.relationship_type)
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
  }, [id, resetLocation])

  const isProfessional = category === "Professional"
  const isFriendOrFamily = category === "Friend" || category === "Family"

  async function handleSave() {
    if (saving) return
    if (!firstName.trim()) {
      setError("First name is required")
      return
    }
    if (!lastName.trim()) {
      setError("Last name is required")
      return
    }
    if (!category) {
      setCategoryError("Choose Friend, Family, or Professional.")
      return
    }
    const cleanName = `${firstName.trim()} ${lastName.trim()}`
    const { moments: cleanMoments, valid } = normalizeMomentDrafts(importantMoments)
    if (!valid) {
      setError("Important moments need both a label and a date.")
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

      const trimmedLocation = locationField.location.trim()
      await updatePersonWithRelations({
        userId: session.user.id,
        personId: id,
        person: {
          name: cleanName,
          email: email.trim() || null,
          company: company.trim() || null,
          role: role.trim() || null,
          birthday: birthdayDate ? toLocalDateString(birthdayDate) : null,
          how_met: howMet.trim() || null,
          location: trimmedLocation || null,
          latitude: trimmedLocation ? locationField.latitude : null,
          longitude: trimmedLocation ? locationField.longitude : null,
          notes: notes.trim() || null,
          contact_frequency_days: frequencyDays,
          relationship_type: category ?? null,
        },
        categoryLabel: category,
        tagIds: selectedTagIds,
        moments: cleanMoments,
      })

      safeBack(router, `/people/${id}`)
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

    const { data, error: createError } = await supabase
      .from("tags")
      .insert({ user_id: session.user.id, name: tagName, color: colors.sage })
      .select("*")
      .single()

    if (createError) {
      setError(createError.message)
      return
    }

    if (data) {
      setAllTags((prev) => [...prev, data])
      setSelectedTagIds((prev) => [...prev, data.id])
    }
  }

  if (loading) return <LoadingState />

  return (
    <Screen>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
        <TouchableOpacity onPress={() => safeBack(router, `/people/${id}`)} className="py-1 pr-3">
          <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="text-base">Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="text-base">Edit person</Text>
        <View style={{ width: 60 }} />
      </View>

      <View className="px-5 pb-6">
        {error != null && <ErrorBanner message={error} />}

        <Text style={{ fontFamily: fonts.body, color: colors.error, fontSize: 12 }} className="mb-2 mt-1">
          * Required field
        </Text>

        {/* Name row */}
        <View className="mb-3 flex-row gap-2">
          <View className="flex-1">
            <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">
              First name <Text style={{ color: "#B91C1C" }}>*</Text>
            </Text>
            <TextInput
              accessibilityLabel="First name"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              returnKeyType="next"
              className="rounded-xl border border-gray-200 bg-white px-3 text-sm"
              style={{ height: 44, fontFamily: fonts.body, color: colors.ink }}
            />
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">
              Last name <Text style={{ color: "#B91C1C" }}>*</Text>
            </Text>
            <TextInput
              accessibilityLabel="Last name"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              returnKeyType="next"
              className="rounded-xl border border-gray-200 bg-white px-3 text-sm"
              style={{ height: 44, fontFamily: fonts.body, color: colors.ink }}
            />
          </View>
        </View>

        {/* Relationship type */}
        <View className="mb-3">
          <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">
            Relationship type <Text style={{ color: "#B91C1C" }}>*</Text>
          </Text>
          <View className="flex-row gap-2">
            {RELATIONSHIP_CATEGORIES.map((cat) => {
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
                  className="min-h-[42px] flex-1 items-center justify-center rounded-xl border px-2 py-2"
                  style={{
                    backgroundColor: selected ? colors.forest : "white",
                    borderColor: selected ? colors.forest : "#E5E7EB",
                  }}
                >
                  <Text
                    style={{ fontFamily: fonts.medium, color: selected ? "white" : colors.ink }}
                    className="text-sm"
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
          {categoryError ? <Text className="mt-1 text-xs text-red-500">{categoryError}</Text> : null}
        </View>

        {/* Conditional: Professional fields */}
        {isProfessional && (
          <>
            <View className="mb-3">
              <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">Email</Text>
              <TextInput
                accessibilityLabel="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                style={{ fontFamily: fonts.body, color: colors.ink }}
              />
            </View>
            <View className="mb-3">
              <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">Company</Text>
              <TextInput
                accessibilityLabel="Company"
                value={company}
                onChangeText={setCompany}
                placeholder="Company name"
                placeholderTextColor="#9CA3AF"
                returnKeyType="next"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                style={{ fontFamily: fonts.body, color: colors.ink }}
              />
            </View>
            <View className="mb-3">
              <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">Role</Text>
              <TextInput
                accessibilityLabel="Role"
                value={role}
                onChangeText={setRole}
                placeholder="Job title"
                placeholderTextColor="#9CA3AF"
                returnKeyType="next"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                style={{ fontFamily: fonts.body, color: colors.ink }}
              />
            </View>
          </>
        )}

        {/* Conditional: Birthday for Friend/Family */}
        {isFriendOrFamily && <BirthdayField date={birthdayDate} onChange={setBirthdayDate} />}

        {/* Important moments */}
        <MomentDraftsEditor moments={importantMoments} onChange={setImportantMoments} />

        {/* How you met */}
        <View className="mb-3">
          <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">How you met</Text>
          <TextInput
            accessibilityLabel="How you met"
            value={howMet}
            onChangeText={setHowMet}
            placeholder="At a conference, through a friend…"
            placeholderTextColor="#9CA3AF"
            returnKeyType="next"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            style={{ fontFamily: fonts.body, color: colors.ink }}
          />
        </View>

        {/* Keep in touch — frequency dropdown */}
        <View className="mb-3">
          <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">
            How often to stay in touch?
          </Text>
          <View ref={freqMenu.anchorRef}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Choose keep in touch cadence"
              onPress={freqMenu.toggle}
              activeOpacity={0.78}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                height: 44,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                backgroundColor: "white",
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 14 }}>
                {frequencyLabel(frequencyDays)}
              </Text>
              <Ionicons name={freqMenu.visible ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <View className="mb-3">
          <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">Location</Text>
          <View className="flex-row items-center rounded-xl border border-gray-200 bg-white">
            <TextInput
              accessibilityLabel="Location"
              value={locationField.location}
              onChangeText={locationField.handleLocationChange}
              placeholder="City, country"
              placeholderTextColor="#9CA3AF"
              returnKeyType="next"
              className="flex-1 px-3 py-2.5 text-sm"
              style={{ fontFamily: fonts.body, color: colors.ink }}
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
        {!locationField.geocodingAvailable ? (
          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1.5 text-xs">
            Location suggestions are disabled until EXPO_PUBLIC_MAPBOX_TOKEN is configured.
          </Text>
        ) : null}
        </View>

        {/* Notes */}
        <View className="mb-3">
          <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">Notes</Text>
          <TextInput
            accessibilityLabel="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything else to remember…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            returnKeyType="default"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            style={{ fontFamily: fonts.body, color: colors.ink, textAlignVertical: "top", minHeight: 80 }}
          />
        </View>

        {/* Tags */}
        <View className="mb-4">
          <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">Tags</Text>
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
