import { useEffect, useRef, useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Screen } from "@/components/Screen"
import { TagPicker } from "@/components/TagPicker"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { ConfirmModal } from "@/components/ConfirmModal"
import { SoftCard } from "@/components/RootsUI"
import { AnchoredMenu, useAnchoredMenu } from "@/components/AnchoredMenu"
import { supabase } from "@/lib/supabase"
import { loadImportantMomentsForPerson } from "@/lib/important-moments"
import {
  clearPendingImportEditQueue,
  parseImportEditQueue,
  parsePendingImportEditQueue,
} from "@/lib/import-edit-queue"
import { updatePersonWithRelations } from "@/lib/people-data"
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
import { CompactTextField } from "@/features/person-form/CompactTextField"
import { LocationSuggestionsList } from "@/features/person-form/LocationSuggestionsList"
import { useLocationAutocomplete } from "@/features/person-form/use-location-autocomplete"
import type { Person, Tag } from "@/types"

export default function EditPersonScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    id: string | string[]
    importQueue?: string | string[]
    importReview?: string | string[]
    importIndex?: string | string[]
  }>()
  const id = typeof params.id === "string" ? params.id : ""
  const routeImportEditQueue = parseImportEditQueue({
    currentPersonId: id,
    serializedIds: params.importQueue,
    rawIndex: params.importIndex,
  })
  const pendingImportEditQueue = parsePendingImportEditQueue({
    currentPersonId: id,
    rawQueueFlag: params.importReview,
    rawIndex: params.importIndex,
  })
  const importEditQueue = routeImportEditQueue ?? pendingImportEditQueue

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [confirmQueueCancel, setConfirmQueueCancel] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(false)
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
  const [phone, setPhone] = useState("")
  const [notes, setNotes] = useState("")
  const [howMet, setHowMet] = useState("")
  const [frequencyDays, setFrequencyDays] = useState(90)
  const lastNameInputRef = useRef<TextInput>(null)
  const howMetInputRef = useRef<TextInput>(null)
  const phoneInputRef = useRef<TextInput>(null)
  const companyInputRef = useRef<TextInput>(null)
  const roleInputRef = useRef<TextInput>(null)
  const emailInputRef = useRef<TextInput>(null)

  const freqMenu = useAnchoredMenu()
  const locationField = useLocationAutocomplete()
  const { resetLocation } = locationField

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
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
        setPhone(p.phone ?? "")
        setHowMet(p.how_met ?? "")
        setFrequencyDays(p.contact_frequency_days ?? 90)
        resetLocation(p.location ?? "", p.latitude ?? null, p.longitude ?? null)
        setNotes(p.notes ?? "")

        setBirthdayDate(p.birthday ? parseLocalDateString(p.birthday) : null)

        const cat = findRelationshipCategory(p.relationship_type)
        setCategory(cat?.label ?? null)

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
      setCategoryError("Please select a relationship type.")
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
          phone: phone.trim() || null,
          notes: notes.trim() || null,
          company: company.trim() || null,
          role: role.trim() || null,
          birthday: birthdayDate ? toLocalDateString(birthdayDate) : null,
          how_met: howMet.trim() || null,
          location: trimmedLocation || null,
          latitude: trimmedLocation ? locationField.latitude : null,
          longitude: trimmedLocation ? locationField.longitude : null,
          contact_frequency_days: frequencyDays,
          relationship_type: category ?? null,
        },
        categoryLabel: category,
        tagIds: selectedTagIds,
        moments: cleanMoments,
      })

      if (importEditQueue) {
        const nextIndex = importEditQueue.index + 1
        if (nextIndex < importEditQueue.ids.length) {
          const nextId = importEditQueue.ids[nextIndex]
          if (!nextId) {
            clearPendingImportEditQueue()
            router.dismissTo("/people")
            return
          }

          router.replace({
            pathname: "/(app)/people/[id]/edit",
            params: routeImportEditQueue
              ? {
                  id: nextId,
                  importQueue: JSON.stringify(importEditQueue.ids),
                  importIndex: String(nextIndex),
                }
              : {
                  id: nextId,
                  importReview: "1",
                  importIndex: String(nextIndex),
                },
          })
        } else {
          clearPendingImportEditQueue()
          router.dismissTo("/people")
        }
      } else {
        router.back()
      }
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

  function handleCancel() {
    if (importEditQueue) {
      setConfirmQueueCancel(true)
    } else {
      router.back()
    }
  }

  function stopQueueReview() {
    setConfirmQueueCancel(false)
    clearPendingImportEditQueue()
    router.dismissTo("/people")
  }

  if (loading) return <LoadingState />

  return (
    <Screen>
      <View className="px-5 pt-3 pb-6">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cancel editing person"
            onPress={handleCancel}
            className="min-h-11 justify-center pr-4"
          >
            <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="text-lg">
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="text-xl">
            Edit Person
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Save person"
            onPress={handleSave}
            disabled={saving}
            className="min-h-11 justify-center pl-4"
          >
            <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-lg">
              {saving ? "Saving" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        {importEditQueue ? (
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="mt-1 text-center text-xs">
            Imported person {importEditQueue.index + 1} of {importEditQueue.ids.length}
          </Text>
        ) : null}

        {error != null && <ErrorBanner message={error} />}

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
                submitBehavior="submit"
                onSubmitEditing={() => lastNameInputRef.current?.focus()}
                className="rounded-xl border border-stone-200 bg-white px-3 text-sm"
                style={{ height: 44, fontFamily: fonts.body, color: colors.ink }}
              />
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
                Last name <Text style={{ color: "#B91C1C" }}>*</Text>
              </Text>
              <TextInput
                ref={lastNameInputRef}
                accessibilityLabel="Last name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Taylor"
                placeholderTextColor="#8F96A3"
                autoCapitalize="words"
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
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
                returnKeyType="done"
                submitBehavior="blurAndSubmit"
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
            ref={howMetInputRef}
            label={category === "Family" ? "Relationship" : "How you met"}
            icon="people-outline"
            value={howMet}
            onChangeText={setHowMet}
            placeholder={category === "Family" ? "Parent, sibling, partner..." : "At a conference, through a friend..."}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => phoneInputRef.current?.focus()}
          />

          {/* Phone */}
          <CompactTextField
            ref={phoneInputRef}
            label="Phone"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            placeholder="+1 555 123 4567"
            keyboardType="phone-pad"
          />

          {/* Overview */}
          <CompactTextField
            label="Overview"
            icon="document-text-outline"
            value={notes}
            onChangeText={setNotes}
            placeholder="Any general details you want to remember about this person?"
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
                ref={emailInputRef}
                label="Email"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="alex@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => companyInputRef.current?.focus()}
              />
              <CompactTextField
                ref={companyInputRef}
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
                  ref={companyInputRef}
                  label="Company"
                  icon="business-outline"
                  value={company}
                  onChangeText={setCompany}
                  placeholder="Company name"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => roleInputRef.current?.focus()}
                />
              ) : null}

              <CompactTextField
                ref={roleInputRef}
                label="Role"
                icon="briefcase-outline"
                value={role}
                onChangeText={setRole}
                placeholder="Job title"
                returnKeyType={category === "Friend" || category === "Family" ? "next" : "done"}
                submitBehavior={category === "Friend" || category === "Family" ? "submit" : "blurAndSubmit"}
                onSubmitEditing={
                  category === "Friend" || category === "Family"
                    ? () => emailInputRef.current?.focus()
                    : undefined
                }
              />

              {(category === "Friend" || category === "Family") ? (
                <CompactTextField
                  ref={emailInputRef}
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

              {/* Tags */}
              <View className="mb-1">
                <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
                  Tags
                </Text>
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
            </View>
          ) : null}
        </SoftCard>
      </View>

      <AnchoredMenu
        visible={freqMenu.visible}
        position={freqMenu.position}
        options={CONTACT_FREQUENCY_OPTIONS.map((option) => ({ key: option.value, label: option.label }))}
        selectedKey={frequencyDays}
        onSelect={setFrequencyDays}
        onClose={freqMenu.close}
      />

      <ConfirmModal
        visible={confirmQueueCancel}
        title="Stop reviewing imported people?"
        message="The people you imported will stay in Roots, but the remaining people will not be reviewed now."
        confirmLabel="Stop reviewing"
        cancelLabel="Keep reviewing"
        destructive
        onConfirm={stopQueueReview}
        onCancel={() => setConfirmQueueCancel(false)}
      />
    </Screen>
  )
}
