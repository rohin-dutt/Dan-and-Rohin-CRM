import { useRef, useState } from "react"
import { Modal, Pressable, Switch, Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Screen } from "@/components/Screen"
import { ErrorBanner } from "@/components/ErrorBanner"
import { IconTile, SoftCard } from "@/components/RootsUI"
import { supabase } from "@/lib/supabase"
import { geocodePlace, type MapboxFeature } from "@/lib/mapbox"
import { colors, fonts } from "@/constants/theme"
import { ONBOARDING_FREQ_OPTIONS } from "@/constants/onboarding"

const CATEGORIES = [
  { label: "Friend", tagName: "Friend", tagColor: "#16A34A", icon: "people-outline" },
  { label: "Family", tagName: "Family", tagColor: "#2563EB", icon: "people-circle-outline" },
  { label: "Professional", tagName: "Professional", tagColor: "#D97706", icon: "briefcase-outline" },
] as const

type CategoryLabel = (typeof CATEGORIES)[number]["label"]
type MomentDraft = { label: string; date: string; recurs_yearly: boolean }

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

function CompactTextField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
  autoCapitalize,
  maxLength,
  required,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  multiline?: boolean
  keyboardType?: "default" | "email-address" | "phone-pad" | "numbers-and-punctuation"
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
  maxLength?: number
  required?: boolean
}) {
  return (
    <View className="mb-3">
      <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
        {label}
        {required ? <Text style={{ color: "#B91C1C" }}> *</Text> : null}
      </Text>
      <View
        className={`flex-row rounded-xl border border-stone-200 bg-white ${multiline ? "items-start" : "items-center"}`}
      >
        <View
          className={`items-center justify-center border-r border-stone-200 ${multiline ? "mt-2" : ""}`}
          style={{ width: 44, height: multiline ? 40 : 44 }}
        >
          <Ionicons name={icon} size={20} color={colors.forest} />
        </View>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8F96A3"
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          className="flex-1 px-3 text-sm"
          style={{
            minHeight: multiline ? 80 : 44,
            paddingVertical: multiline ? 12 : 0,
            fontFamily: fonts.body,
            color: colors.ink,
            textAlignVertical: multiline ? "top" : "center",
          }}
          returnKeyType={multiline ? "default" : "next"}
        />
      </View>
    </View>
  )
}

export default function NewPersonScreen() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [category, setCategory] = useState<CategoryLabel | null>(null)
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [birthdayDate, setBirthdayDate] = useState<Date | null>(null)
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false)
  const [email, setEmail] = useState("")
  const [howMet, setHowMet] = useState("")
  const [frequencyDays, setFrequencyDays] = useState(90)
  const [location, setLocation] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationSuggestions, setLocationSuggestions] = useState<MapboxFeature[]>([])
  const [importantMoments, setImportantMoments] = useState<MomentDraft[]>([])

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

      const userId = session.user.id

      const { data: person, error: insertErr } = await supabase
        .from("people")
        .insert({
          user_id: userId,
          name: cleanName,
          email: email.trim() || null,
          company: company.trim() || null,
          role: role.trim() || null,
          birthday: birthdayDate ? toLocalDateString(birthdayDate) : null,
          how_met: howMet.trim() || null,
          location: location.trim() || null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          contact_frequency_days: frequencyDays,
          relationship_type: category ?? null,
        })
        .select("id")
        .single()

      if (insertErr) throw insertErr

      if (category && person) {
        const cat = CATEGORIES.find((c) => c.label === category)
        if (cat) {
          const tagId = await getOrCreateTag(userId, cat.tagName, cat.tagColor)
          if (tagId) {
            await supabase
              .from("person_tags")
              .insert({ person_id: person.id, tag_id: tagId })
          }
        }
      }

      if (person && cleanMoments.length > 0) {
        const { error: momentsError } = await supabase.from("important_moments").insert(
          cleanMoments.map((moment) => ({
            user_id: userId,
            person_id: person.id,
            label: moment.label,
            date: moment.date,
            recurs_yearly: moment.recurs_yearly,
          })),
        )
        if (momentsError) throw momentsError
      }

      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save person")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <View className="px-5 pt-3 pb-6">
        {/* Header */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cancel adding person"
            onPress={() => router.back()}
            className="min-h-11 justify-center pr-4"
          >
            <Text style={{ fontFamily: fonts.medium, color: colors.forest }} className="text-lg">
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="text-xl">
            Add Person
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

        {error != null && <ErrorBanner message={error} />}

        {/* Import from Contacts */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Import from Contacts"
          onPress={() => router.push("/people/import-contacts")}
          activeOpacity={0.78}
          className="mt-4"
        >
          <SoftCard className="flex-row items-center p-3">
            <IconTile icon="id-card-outline" size={44} />
            <View className="ml-3 flex-1">
              <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-base">
                Import from Contacts
              </Text>
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-0.5 text-xs leading-4">
                Pull in name, phone, and email from your contacts.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </SoftCard>
        </TouchableOpacity>

        {/* Main form card */}
        <SoftCard className="mt-4 p-3">
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
              {CATEGORIES.map((cat, index) => {
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
            <View ref={freqButtonRef}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Choose keep in touch cadence"
                onPress={handleFreqPress}
                activeOpacity={0.78}
                className="flex-row items-center rounded-xl border border-stone-200 bg-white"
                style={{ height: 44 }}
              >
                <View className="items-center justify-center border-r border-stone-200" style={{ width: 44, height: 44 }}>
                  <Ionicons name="calendar-outline" size={20} color={colors.forest} />
                </View>
                <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="flex-1 px-3 text-sm">
                  {freqLabel(frequencyDays)}
                </Text>
                <Ionicons name={freqDropdownVisible ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
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
                value={location}
                onChangeText={handleLocationChange}
                placeholder="City, country"
                placeholderTextColor="#8F96A3"
                className="flex-1 px-3 text-sm"
                style={{ fontFamily: fonts.body, color: colors.ink, height: 44 }}
                returnKeyType="next"
              />
              {latitude !== null ? (
                <View className="pr-3">
                  <Ionicons name="checkmark-circle" size={18} color={colors.forest} />
                </View>
              ) : null}
            </View>
            {locationSuggestions.length > 0 ? (
              <View className="mt-1.5 rounded-xl border border-stone-200 bg-white" style={{ zIndex: 20 }}>
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

          {/* How you met */}
          <CompactTextField
            label="How you met"
            icon="people-outline"
            value={howMet}
            onChangeText={setHowMet}
            placeholder="At a conference, through a friend..."
          />

          {/* Conditional: Birthday for Friend/Family */}
          {(category === "Friend" || category === "Family") ? (
            <View className="mb-3">
              <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-1.5 text-sm">
                Birthday (optional)
              </Text>
              {birthdayDate ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.mint,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    height: 44,
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.forest} style={{ marginRight: 8 }} />
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
                    borderColor: showBirthdayPicker ? colors.forest : "#E7E5E4",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: "white",
                  }}
                >
                  <Ionicons name="calendar-outline" size={18} color="#8F96A3" style={{ marginRight: 8 }} />
                  <Text style={{ fontFamily: fonts.body, color: "#8F96A3", fontSize: 14 }}>
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
                    marginBottom: 0,
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
              <CompactTextField
                label="Role"
                icon="briefcase-outline"
                value={role}
                onChangeText={setRole}
                placeholder="Job title"
              />

              <View className="mb-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="text-sm">
                    Important moments
                  </Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add important moment" onPress={addImportantMoment}>
                    <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>
                {importantMoments.length === 0 ? (
                  <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-xs leading-4">
                    Add dates like an anniversary or graduation.
                  </Text>
                ) : (
                  importantMoments.map((moment, index) => (
                    <View key={index} className="mb-3 rounded-xl border border-stone-200 bg-white p-3">
                      <View className="flex-row items-center justify-between">
                        <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} className="text-sm">
                          Moment {index + 1}
                        </Text>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove important moment" onPress={() => removeImportantMoment(index)}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        value={moment.label}
                        onChangeText={(text) => updateImportantMoment(index, { label: text })}
                        placeholder="Anniversary, graduation..."
                        placeholderTextColor="#8F96A3"
                        className="mt-2 rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
                        style={{ fontFamily: fonts.body, color: colors.ink }}
                      />
                      <TextInput
                        value={moment.date}
                        onChangeText={(text) => updateImportantMoment(index, { date: text })}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#8F96A3"
                        keyboardType="numbers-and-punctuation"
                        className="mt-2 rounded-xl border border-stone-200 px-3 py-2.5 text-sm"
                        style={{ fontFamily: fonts.body, color: colors.ink }}
                      />
                      <View className="mt-2 flex-row items-center justify-between">
                        <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="text-sm">
                          Repeat yearly
                        </Text>
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

              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-xs leading-4">
                Tags are created from the selected relationship type when this person is saved.
              </Text>
            </View>
          ) : null}
        </SoftCard>
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
