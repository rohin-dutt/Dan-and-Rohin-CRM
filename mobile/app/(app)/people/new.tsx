import { useRef, useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { TextField } from "@/components/TextField"
import { PillButton } from "@/components/PillButton"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { geocodePlace, type MapboxFeature } from "@/lib/mapbox"
import { colors, fonts } from "@/constants/theme"
import { ONBOARDING_FREQ_OPTIONS } from "@/constants/onboarding"

const CATEGORIES = [
  { label: "Friend", tagName: "Friend", tagColor: "#16A34A" },
  { label: "Family", tagName: "Family", tagColor: "#2563EB" },
  { label: "Professional", tagName: "Professional", tagColor: "#D97706" },
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

export default function NewPersonScreen() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)

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
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationSuggestions, setLocationSuggestions] = useState<MapboxFeature[]>([])
  const [notes, setNotes] = useState("")

  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isProfessional = category === "Professional"
  const isFriendOrFamily = category === "Friend" || category === "Family"

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

  async function handleSave() {
    if (!name.trim()) {
      setError("Name is required")
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
          name: name.trim(),
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
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="py-1 pr-3">
          <Text className="text-sage text-sm font-semibold">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-warm-black">Add person</Text>
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

        {/* Conditional: Professional fields */}
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

        {/* Conditional: Friend/Family birthday */}
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

        {/* Location with Mapbox autocomplete */}
        <View className="mb-4">
          <Text className="mb-1 text-sm font-medium text-warm-black">Location</Text>
          <View
            className="flex-row items-center rounded-xl border bg-white px-3"
            style={{ borderColor: "#E5E7EB", minHeight: 44 }}
          >
            <TextInput
              value={location}
              onChangeText={handleLocationChange}
              placeholder="City, country"
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-sm"
              style={{ fontFamily: fonts.body, color: colors.ink, paddingVertical: 10 }}
              returnKeyType="next"
            />
            {latitude !== null ? (
              <Ionicons name="checkmark-circle" size={18} color={colors.forest} />
            ) : null}
          </View>
          {locationSuggestions.length > 0 ? (
            <View className="mt-1 rounded-xl border border-stone-200 bg-white shadow-lg" style={{ zIndex: 20 }}>
              {locationSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
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

        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything else to remember…"
          multiline
          numberOfLines={3}
          returnKeyType="default"
        />

        <Button title="Add person" onPress={handleSave} loading={saving} />
      </View>
    </Screen>
  )
}
