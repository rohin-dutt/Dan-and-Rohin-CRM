import { useEffect, useState } from "react"
import { ActivityIndicator, DeviceEventEmitter, Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import type * as Contacts from "expo-contacts"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { ErrorBanner } from "@/components/ErrorBanner"
import { PersonAvatar } from "@/components/RootsUI"
import { getSelectedContacts } from "@/features/onboarding/onboarding-contacts"
import {
  createPersonWithRelations,
  updatePersonWithRelations,
  PersonRelationsError,
  type PersonWriteValues,
} from "@/lib/people-data"
import { PEOPLE_CHANGED_EVENT } from "@/lib/onboarding-status"
import { RELATIONSHIP_CATEGORIES, type RelationshipCategoryLabel } from "@/constants/categories"
import { YEARLESS_BIRTHDAY_YEAR } from "@/lib/format-dates"
import { colors, fonts } from "@/constants/theme"
import { toLocalDateString } from "@roots/shared"

const CATEGORY_FREQUENCY_DAYS: Record<RelationshipCategoryLabel, number> = {
  Friend: 90,
  Family: 30,
  Professional: 180,
}

// Contacts without a birth year get the placeholder year so the rest of the
// app can render them as month + day only. expo-contacts months are 0-indexed.
function birthdayFromContact(birthday: Contacts.Date | undefined): string | null {
  if (!birthday || birthday.month == null || birthday.day == null) return null
  const year = birthday.year ? birthday.year : YEARLESS_BIRTHDAY_YEAR
  return toLocalDateString(new Date(year, birthday.month, birthday.day))
}

function personValuesFromContact(
  contact: Contacts.ExistingContact,
  category: RelationshipCategoryLabel,
): PersonWriteValues {
  return {
    name: contact.name.trim(),
    phone: contact.phoneNumbers?.[0]?.number?.trim() || null,
    email: contact.emails?.[0]?.email?.trim() || null,
    birthday: birthdayFromContact(contact.birthday),
    company: contact.company?.trim() || null,
    role: contact.jobTitle?.trim() || null,
    contact_frequency_days: CATEGORY_FREQUENCY_DAYS[category],
    relationship_type: category,
  }
}

export default function OnboardingCategorizeScreen() {
  const router = useRouter()
  const [contacts] = useState<Contacts.ExistingContact[]>(() => getSelectedContacts())
  const [userId, setUserId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [savedPersonIds, setSavedPersonIds] = useState<Map<number, string>>(new Map())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedCategory, setFailedCategory] = useState<RelationshipCategoryLabel | null>(null)

  useEffect(() => {
    if (contacts.length === 0) {
      router.replace("/(app)/onboarding/select")
      return
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/(auth)/login")
        return
      }
      setUserId(session.user.id)
    })
  }, [contacts, router])

  async function handleSelectCategory(category: RelationshipCategoryLabel) {
    if (saving || !userId) return
    setSaving(true)
    setError(null)
    setFailedCategory(null)

    const contact = contacts[currentIndex]
    const person = personValuesFromContact(contact, category)
    const existingId = savedPersonIds.get(currentIndex)

    let personId = existingId
    try {
      if (existingId) {
        await updatePersonWithRelations({ userId, personId: existingId, person, categoryLabel: category })
      } else {
        personId = await createPersonWithRelations({ userId, person, categoryLabel: category })
      }
    } catch (e) {
      if (e instanceof PersonRelationsError) {
        // The person row was written; the category tag is best-effort during
        // onboarding, so continue instead of blocking the flow.
        personId = e.personId
      } else {
        setError(e instanceof Error ? e.message : "Failed to save. Please try again.")
        setFailedCategory(category)
        setSaving(false)
        return
      }
    }

    const nextSaved = new Map(savedPersonIds)
    if (personId) nextSaved.set(currentIndex, personId)
    setSavedPersonIds(nextSaved)
    setSaving(false)

    if (currentIndex === contacts.length - 1) {
      DeviceEventEmitter.emit(PEOPLE_CHANGED_EVENT)
      router.push({
        pathname: "/(app)/onboarding/celebrate",
        params: { count: String(nextSaved.size) },
      })
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  function handleBack() {
    if (saving) return
    setError(null)
    setFailedCategory(null)
    if (currentIndex === 0) {
      router.back()
    } else {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (contacts.length === 0) return null

  const contact = contacts[currentIndex]
  const phone = contact.phoneNumbers?.find((entry) => entry.number?.trim())?.number?.trim()
  const email = contact.emails?.find((entry) => entry.email?.trim())?.email?.trim()

  return (
    <Screen scrollable={false}>
      <View className="flex-1 px-5 pt-3">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={handleBack}
            className="min-h-11 min-w-11 items-start justify-center"
          >
            <Ionicons name="chevron-back" size={26} color={colors.forest} />
          </TouchableOpacity>
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="text-sm">
            {currentIndex + 1} of {contacts.length}
          </Text>
        </View>

        <View className="flex-1 items-center justify-center pb-16">
          <PersonAvatar name={contact.name} size={80} />
          <Text
            style={{ fontFamily: fonts.heading, color: colors.forest }}
            className="mt-5 text-center text-[30px] leading-9"
          >
            {contact.name}
          </Text>
          {phone || email ? (
            <Text
              style={{ fontFamily: fonts.body, color: colors.muted }}
              className="mt-2 text-center text-sm"
            >
              {phone ?? email}
            </Text>
          ) : null}

          {error != null && (
            <View className="mt-6 w-full">
              <ErrorBanner message={error} />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Try again"
                onPress={() => {
                  if (failedCategory) void handleSelectCategory(failedCategory)
                }}
                className="min-h-11 items-center justify-center"
              >
                <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text
            style={{ fontFamily: fonts.semibold, color: colors.warmBlack }}
            className="mt-10 text-base"
          >
            How do you know them?
          </Text>

          {saving ? (
            <View className="mt-6 h-24 items-center justify-center">
              <ActivityIndicator color={colors.forest} />
            </View>
          ) : (
            <View className="mt-6 w-full flex-row gap-2">
              {RELATIONSHIP_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.label}
                  accessibilityRole="button"
                  accessibilityLabel={`Categorize as ${category.label}`}
                  onPress={() => void handleSelectCategory(category.label)}
                  activeOpacity={0.78}
                  className="min-h-24 flex-1 items-center justify-center rounded-2xl border border-stone-200 bg-white px-1 py-4 shadow-sm"
                >
                  <Ionicons name={category.icon} size={26} color={colors.forest} />
                  <Text
                    style={{ fontFamily: fonts.semibold, color: colors.ink }}
                    className="mt-2 text-sm"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </Screen>
  )
}
