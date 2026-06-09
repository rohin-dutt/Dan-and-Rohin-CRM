import { useRef, useState } from "react"
import { Alert, Text, TextInput, TouchableOpacity, View, type AlertButton } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
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

function AddTextField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
  autoCapitalize,
  maxLength,
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
}) {
  return (
    <View className="mb-5">
      <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-2 text-[15px]">
        {label}
      </Text>
      <View
        className={`flex-row rounded-xl border border-stone-200 bg-white ${multiline ? "items-start" : "items-center"}`}
      >
        <View
          className={`items-center justify-center border-r border-stone-200 ${multiline ? "mt-2" : ""}`}
          style={{ width: 52, height: multiline ? 44 : 50 }}
        >
          <Ionicons name={icon} size={22} color={colors.forest} />
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
          className="flex-1 px-4 text-base"
          style={{
            minHeight: multiline ? 88 : 50,
            paddingVertical: multiline ? 14 : 0,
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

  const [fullName, setFullName] = useState("")
  const [category, setCategory] = useState<CategoryLabel>("Friend")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [birthday, setBirthday] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [howMet, setHowMet] = useState("")
  const [frequencyDays, setFrequencyDays] = useState(90)
  const [location, setLocation] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationSuggestions, setLocationSuggestions] = useState<MapboxFeature[]>([])
  const [notes, setNotes] = useState("")

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

  function showFrequencyPicker() {
    const buttons: AlertButton[] = ONBOARDING_FREQ_OPTIONS.map((option) => ({
      text: option.label,
      onPress: () => setFrequencyDays(option.value),
    }))
    buttons.push({ text: "Cancel", style: "cancel" })

    Alert.alert(
      "Keep in touch",
      "Choose a contact cadence.",
      buttons,
    )
  }

  async function handleSave() {
    const cleanName = fullName.trim().replace(/\s+/g, " ")
    if (!cleanName) {
      setError("Full name is required")
      return
    }
    if (!category) {
      setCategoryError("Choose Friend, Family, or Professional.")
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
          phone: phone.trim() || null,
          company: company.trim() || null,
          role: role.trim() || null,
          birthday: birthday.trim() || null,
          how_met: howMet.trim() || null,
          location: location.trim() || null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          notes: notes.trim() || null,
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

      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save person")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen>
      <View className="px-5 pt-4 pb-8">
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

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Import from Contacts"
          onPress={() => router.push("/people/import-contacts")}
          activeOpacity={0.78}
          className="mt-6"
        >
          <SoftCard className="flex-row items-center p-4">
            <IconTile icon="id-card-outline" size={52} />
            <View className="ml-4 flex-1">
              <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-lg">
                Import from Contacts
              </Text>
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm leading-5">
                Pull in name, phone, and email from your contacts.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.muted} />
          </SoftCard>
        </TouchableOpacity>

        <SoftCard className="mt-6 p-4">
          <AddTextField
            label="Full name"
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Alex Taylor"
            autoCapitalize="words"
          />

          <View className="mb-5">
            <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-2 text-[15px]">
              Relationship type
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
                    className={`min-h-[56px] flex-1 flex-row items-center justify-center px-1 ${index > 0 ? "border-l border-stone-200" : ""}`}
                    style={{ backgroundColor: selected ? colors.forest : "white" }}
                  >
                    <Ionicons name={cat.icon} size={20} color={selected ? "white" : colors.muted} />
                    <Text
                      style={{ fontFamily: fonts.medium, color: selected ? "white" : colors.ink }}
                      className="ml-2 text-sm"
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
            {categoryError ? <Text className="mt-2 text-xs text-red-500">{categoryError}</Text> : null}
          </View>

          <View className="mb-5">
            <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-2 text-[15px]">
              Keep in touch
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Choose keep in touch cadence"
              onPress={showFrequencyPicker}
              activeOpacity={0.78}
              className="flex-row items-center rounded-xl border border-stone-200 bg-white"
            >
              <View className="items-center justify-center border-r border-stone-200" style={{ width: 52, height: 50 }}>
                <Ionicons name="calendar-outline" size={22} color={colors.forest} />
              </View>
              <Text style={{ fontFamily: fonts.body, color: colors.ink }} className="flex-1 px-4 text-base">
                {freqLabel(frequencyDays)}
              </Text>
              <Ionicons name="chevron-down" size={22} color={colors.muted} />
              <View className="w-4" />
            </TouchableOpacity>
          </View>

          <AddTextField
            label="Phone"
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            placeholder="(415) 555-2671"
            keyboardType="phone-pad"
          />
          <AddTextField
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="alex@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {email.trim() ? (
            <View className="-mt-2 mb-5 flex-row items-center">
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.forest} />
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="ml-2 text-sm">
                Looks good
              </Text>
            </View>
          ) : null}
          <AddTextField
            label="Quick note (optional)"
            icon="chatbubble-outline"
            value={notes}
            onChangeText={setNotes}
            placeholder="We met at the product launch."
            multiline
            maxLength={200}
          />
          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="-mt-4 text-right text-xs">
            {notes.length}/200
          </Text>
        </SoftCard>

        <SoftCard className="mt-6">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: detailsExpanded }}
            accessibilityLabel={detailsExpanded ? "Hide more details" : "Show more details"}
            onPress={() => setDetailsExpanded((value) => !value)}
            activeOpacity={0.78}
            className="flex-row items-center p-4"
          >
            <View className="flex-1">
              <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-lg">
                {detailsExpanded ? "Hide more details" : "Show more details"}
              </Text>
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm leading-5">
                Birthday, location, company, how you met, tags, and more
              </Text>
            </View>
            <Ionicons name={detailsExpanded ? "chevron-up" : "chevron-down"} size={24} color={colors.muted} />
          </TouchableOpacity>

          {detailsExpanded ? (
            <View className="border-t border-stone-100 p-4">
              <AddTextField
                label="Birthday"
                icon="calendar-outline"
                value={birthday}
                onChangeText={setBirthday}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
              />

              <View className="mb-5">
                <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="mb-2 text-[15px]">
                  Location
                </Text>
                <View className="flex-row items-center rounded-xl border border-stone-200 bg-white">
                  <View className="items-center justify-center border-r border-stone-200" style={{ width: 52, height: 50 }}>
                    <Ionicons name="location-outline" size={22} color={colors.forest} />
                  </View>
                  <TextInput
                    accessibilityLabel="Location"
                    value={location}
                    onChangeText={handleLocationChange}
                    placeholder="City, country"
                    placeholderTextColor="#8F96A3"
                    className="flex-1 px-4 text-base"
                    style={{ fontFamily: fonts.body, color: colors.ink }}
                    returnKeyType="next"
                  />
                  {latitude !== null ? (
                    <View className="pr-4">
                      <Ionicons name="checkmark-circle" size={20} color={colors.forest} />
                    </View>
                  ) : null}
                </View>
                {locationSuggestions.length > 0 ? (
                  <View className="mt-2 rounded-xl border border-stone-200 bg-white shadow-lg" style={{ zIndex: 20 }}>
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

              <AddTextField
                label="Company"
                icon="business-outline"
                value={company}
                onChangeText={setCompany}
                placeholder="Company"
              />
              <AddTextField
                label="Role"
                icon="briefcase-outline"
                value={role}
                onChangeText={setRole}
                placeholder="Job title"
              />
              <AddTextField
                label="How we met"
                icon="people-outline"
                value={howMet}
                onChangeText={setHowMet}
                placeholder="At a conference, through a friend..."
              />
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm leading-5">
                Tags are created from the selected relationship type when this person is saved.
              </Text>
            </View>
          ) : null}
        </SoftCard>
      </View>
    </Screen>
  )
}
