import { useEffect, useRef, useState } from "react"
import { Modal, Pressable, Switch, Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TagPicker } from "@/components/TagPicker"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { loadImportantMomentsForPerson } from "@/lib/important-moments"
import { geocodePlace, type MapboxFeature } from "@/lib/mapbox"
import { colors, fonts } from "@/constants/theme"
import { ONBOARDING_FREQ_OPTIONS } from "@/constants/onboarding"
import type { ImportantMoment, Person, Tag } from "@/types"

const CATEGORIES = [
  { label: "Friend", tagName: "Friend", tagColor: "#16A34A" },
  { label: "Family", tagName: "Family", tagColor: "#2563EB" },
  { label: "Professional", tagName: "Professional", tagColor: "#D97706" },
] as const

type CategoryLabel = (typeof CATEGORIES)[number]["label"]
type MomentDraft = Pick<ImportantMoment, "label" | "date" | "recurs_yearly">

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatDateDisplay(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function parseLocalDate(value: string): Date | null {
  const parts = value.split("-").map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null
  return new Date(parts[0]!, parts[1]! - 1, parts[2])
}

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

function freqLabel(days: number) {
  return ONBOARDING_FREQ_OPTIONS.find((option) => option.value === days)?.label ?? `Every ${days} days`
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
  const [momentPickerIndex, setMomentPickerIndex] = useState<number | null>(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [category, setCategory] = useState<CategoryLabel | null>(null)
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [birthdayDate, setBirthdayDate] = useState<Date | null>(null)
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false)
  const [email, setEmail] = useState("")
  const [howMet, setHowMet] = useState("")
  const [frequencyDays, setFrequencyDays] = useState(30)
  const [location, setLocation] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationSuggestions, setLocationSuggestions] = useState<MapboxFeature[]>([])
  const [notes, setNotes] = useState("")

  // Freq dropdown
  const freqButtonRef = useRef<View>(null)
  const [freqDropdownVisible, setFreqDropdownVisible] = useState(false)
  const [freqDropdownPos, setFreqDropdownPos] = useState({ x: 0, y: 0 })

  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleLocationChange(text: string) {
    setLocation(text)
    setLatitude(null)
    setLongitude(null)
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current)
    if (!text.trim()) {
      setLocationSuggestions([])
      return
    }
    geocodeTimerRef.current = setTimeout(() => {
      void geocodePlace(text).then((results) => {
        setLocationSuggestions(results.slice(0, 5))
      })
    }, 400)
  }

  function handleLocationSuggestionSelect(feature: MapboxFeature) {
    setLocation(feature.place_name)
    setLatitude(feature.center[1])
    setLongitude(feature.center[0])
    setLocationSuggestions([])
  }

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

        // Split name into first/last
        const nameParts = p.name.trim().split(/\s+/)
        setFirstName(nameParts[0] ?? "")
        setLastName(nameParts.slice(1).join(" "))

        setCompany(p.company ?? "")
        setRole(p.role ?? "")
        setEmail(p.email ?? "")
        setHowMet(p.how_met ?? "")
        setFrequencyDays(p.contact_frequency_days ?? 30)
        setLocation(p.location ?? "")
        setLatitude(p.latitude ?? null)
        setLongitude(p.longitude ?? null)
        setNotes(p.notes ?? "")

        if (p.birthday) {
          const parts = p.birthday.split("-").map(Number)
          if (parts.length === 3) {
            setBirthdayDate(new Date(parts[0]!, parts[1]! - 1, parts[2]))
          }
        }

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
    setMomentPickerIndex(null)
    setImportantMoments((current) => current.filter((_, momentIndex) => momentIndex !== index))
  }

  function handleFreqPress() {
    if (freqDropdownVisible) {
      setFreqDropdownVisible(false)
      return
    }
    freqButtonRef.current?.measure((_, __, ___, height, pageX, pageY) => {
      setFreqDropdownPos({ x: pageX, y: pageY + height })
      setFreqDropdownVisible(true)
    })
  }

  async function handleSave() {
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
    const cleanMoments = importantMoments
      .map((moment) => ({ ...moment, label: moment.label.trim(), date: moment.date.trim() }))
      .filter((moment) => moment.label || moment.date)
    const invalidMoment = cleanMoments.find((moment) => !moment.label || !/^\d{4}-\d{2}-\d{2}$/.test(moment.date))
    if (invalidMoment) {
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

      const { error: updateErr } = await supabase
        .from("people")
        .update({
          name: cleanName,
          email: email.trim() || null,
          company: company.trim() || null,
          role: role.trim() || null,
          birthday: birthdayDate ? toLocalDateString(birthdayDate) : null,
          how_met: howMet.trim() || null,
          location: location.trim() || null,
          latitude: location.trim() ? latitude : null,
          longitude: location.trim() ? longitude : null,
          notes: notes.trim() || null,
          contact_frequency_days: frequencyDays,
          relationship_type: category ?? null,
        })
        .eq("id", id)

      if (updateErr) throw updateErr

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
      <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="py-1 pr-3">
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
            {CATEGORIES.map((cat) => {
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
        {isFriendOrFamily && (
          <View className="mb-3">
            <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">
              Birthday
            </Text>
            {birthdayDate ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F0FDF4",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  height: 44,
                  borderWidth: 1,
                  borderColor: "#BBF7D0",
                }}
              >
                <Ionicons name="calendar-outline" size={16} color={colors.forest} style={{ marginRight: 8 }} />
                <Text style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 14, flex: 1 }}>
                  {formatDateDisplay(birthdayDate)}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Clear birthday"
                  onPress={() => { setBirthdayDate(null); setShowBirthdayPicker(false) }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.forest} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Select birthday"
                onPress={() => setShowBirthdayPicker((v) => !v)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 44,
                  borderWidth: 1,
                  borderColor: showBirthdayPicker ? colors.forest : "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  backgroundColor: "white",
                }}
              >
                <Ionicons name="calendar-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
                <Text style={{ fontFamily: fonts.body, color: "#9CA3AF", fontSize: 14 }}>
                  Select birthday
                </Text>
              </TouchableOpacity>
            )}
            {showBirthdayPicker && !birthdayDate ? (
              <View
                style={{
                  borderWidth: 1,
                  borderTopWidth: 0,
                  borderColor: colors.forest,
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12,
                  backgroundColor: "white",
                  overflow: "hidden",
                }}
              >
                <DateTimePicker
                  value={birthdayDate ?? new Date(1990, 0, 1)}
                  mode="date"
                  display="spinner"
                  onChange={(_, date) => {
                    if (date) setBirthdayDate(date)
                  }}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Done selecting birthday"
                  onPress={() => setShowBirthdayPicker(false)}
                  style={{ alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 12 }}
                >
                  <Text style={{ fontFamily: fonts.bold, color: colors.forest, fontSize: 15 }}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* Important moments */}
        <View className="mb-3">
          <View className="mb-2 flex-row items-center justify-between">
            <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="text-sm">Important moments</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add important moment" onPress={addImportantMoment}>
              <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">Add</Text>
            </TouchableOpacity>
          </View>
          {importantMoments.length === 0 ? (
            <Text className="text-sm text-gray-500">Add dates like an anniversary or graduation.</Text>
          ) : (
            importantMoments.map((moment, index) => (
              <View key={index} className="mb-3 rounded-xl border border-gray-200 bg-white p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} className="text-sm">Moment {index + 1}</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove important moment" onPress={() => removeImportantMoment(index)}>
                    <Text className="text-sm font-semibold text-red-600">Remove</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  accessibilityLabel="Moment label"
                  value={moment.label}
                  onChangeText={(text) => updateImportantMoment(index, { label: text })}
                  placeholder="Anniversary, graduation..."
                  placeholderTextColor="#9CA3AF"
                  className="mb-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
                  style={{ fontFamily: fonts.body, color: colors.ink }}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Select moment date"
                  onPress={() => setMomentPickerIndex((current) => (current === index ? null : index))}
                  className="mb-2 flex-row items-center rounded-xl border bg-white px-3 py-2.5"
                  style={{ borderColor: momentPickerIndex === index ? colors.forest : "#E5E7EB" }}
                >
                  <Ionicons name="calendar-outline" size={16} color={moment.date ? colors.forest : "#9CA3AF"} style={{ marginRight: 8 }} />
                  <Text
                    style={{ fontFamily: fonts.body, color: moment.date ? colors.ink : "#9CA3AF", fontSize: 14, flex: 1 }}
                  >
                    {parseLocalDate(moment.date) ? formatDateDisplay(parseLocalDate(moment.date)!) : "Select date"}
                  </Text>
                  <Ionicons name={momentPickerIndex === index ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
                </TouchableOpacity>
                {momentPickerIndex === index ? (
                  <View className="mb-2 overflow-hidden rounded-xl border bg-white" style={{ borderColor: colors.forest }}>
                    <DateTimePicker
                      value={parseLocalDate(moment.date) ?? new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(_, picked) => {
                        if (picked) updateImportantMoment(index, { date: toLocalDateString(picked) })
                      }}
                    />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Done selecting moment date"
                      onPress={() => setMomentPickerIndex(null)}
                      style={{ alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 12 }}
                    >
                      <Text style={{ fontFamily: fonts.bold, color: colors.forest, fontSize: 15 }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
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
          <View ref={freqButtonRef}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Choose keep in touch cadence"
              onPress={handleFreqPress}
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
                {freqLabel(frequencyDays)}
              </Text>
              <Ionicons name={freqDropdownVisible ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <View className="mb-3">
          <Text style={{ fontFamily: fonts.medium, color: colors.warmBlack }} className="mb-1 text-sm">Location</Text>
          <View className="flex-row items-center rounded-xl border border-gray-200 bg-white">
            <TextInput
              accessibilityLabel="Location"
              value={location}
              onChangeText={handleLocationChange}
              placeholder="City, country"
              placeholderTextColor="#9CA3AF"
              returnKeyType="next"
              className="flex-1 px-3 py-2.5 text-sm"
              style={{ fontFamily: fonts.body, color: colors.ink }}
            />
            {latitude !== null ? (
              <View className="pr-3">
                <Ionicons name="checkmark-circle" size={18} color={colors.forest} />
              </View>
            ) : null}
          </View>
          {locationSuggestions.length > 0 ? (
            <View className="mt-1.5 rounded-xl border border-gray-200 bg-white" style={{ zIndex: 20 }}>
              {locationSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={`${suggestion.place_name}-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={suggestion.place_name}
                  onPress={() => handleLocationSuggestionSelect(suggestion)}
                  className={`px-4 py-3 ${index < locationSuggestions.length - 1 ? "border-b border-stone-100" : ""}`}
                >
                  <Text style={{ fontFamily: fonts.body, color: colors.ink }} numberOfLines={1} className="text-sm">
                    {suggestion.place_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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

      {/* Frequency dropdown modal */}
      <Modal
        visible={freqDropdownVisible}
        transparent
        animationType="none"
        onRequestClose={() => setFreqDropdownVisible(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setFreqDropdownVisible(false)}>
          <Pressable
            style={{
              position: "absolute",
              top: freqDropdownPos.y + 4,
              left: freqDropdownPos.x,
              backgroundColor: "white",
              borderRadius: 12,
              minWidth: 200,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 8,
              overflow: "hidden",
            }}
          >
            {ONBOARDING_FREQ_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                onPress={() => {
                  setFrequencyDays(option.value)
                  setFreqDropdownVisible(false)
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  borderBottomWidth: index < ONBOARDING_FREQ_OPTIONS.length - 1 ? 1 : 0,
                  borderBottomColor: "#F5F4F2",
                }}
              >
                <Text style={{ fontFamily: fonts.medium, color: colors.forest, fontSize: 14 }}>
                  {option.label}
                </Text>
                {frequencyDays === option.value ? <Ionicons name="checkmark" size={16} color={colors.forest} /> : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}
