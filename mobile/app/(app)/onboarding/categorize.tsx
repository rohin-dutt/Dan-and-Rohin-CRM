import { useEffect, useState } from "react"
import { ActivityIndicator, DeviceEventEmitter, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import type * as Contacts from "expo-contacts"
import { Ionicons } from "@expo/vector-icons"
import { supabase } from "@/lib/supabase"
import { Screen } from "@/components/Screen"
import { PersonAvatar } from "@/components/RootsUI"
import {
  getCadenceDefaultForCategory,
  getSelectedContacts,
} from "@/features/onboarding/onboarding-contacts"
import {
  createPersonWithRelations,
  PersonRelationsError,
  type PersonWriteValues,
} from "@/lib/people-data"
import { PEOPLE_CHANGED_EVENT } from "@/lib/onboarding-status"
import { RELATIONSHIP_CATEGORIES, type RelationshipCategoryLabel } from "@/constants/categories"
import { YEARLESS_BIRTHDAY_YEAR } from "@/lib/format-dates"
import { colors, fonts } from "@/constants/theme"
import { toLocalDateString } from "@roots/shared"

type Categorization = {
  contact: Contacts.ExistingContact
  category: RelationshipCategoryLabel
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
    contact_frequency_days: getCadenceDefaultForCategory(category),
    relationship_type: category,
  }
}

export default function OnboardingCategorizeScreen() {
  const router = useRouter()
  const [contacts] = useState<Contacts.ExistingContact[]>(() => getSelectedContacts())
  const [userId, setUserId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [categorizations, setCategorizations] = useState<Map<number, Categorization>>(new Map())
  const [isSavingBatch, setIsSavingBatch] = useState(false)

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

  // Saves every categorized contact to Supabase in one pass. Best-effort: a
  // contact that fails to save is skipped rather than blocking the rest of
  // the batch, since onboarding shouldn't strand the user on a network error.
  async function saveBatch(finalCategorizations: Map<number, Categorization>) {
    setIsSavingBatch(true)

    let savedCount = 0
    for (const { contact, category } of finalCategorizations.values()) {
      if (!userId) break
      const person = personValuesFromContact(contact, category)
      try {
        await createPersonWithRelations({ userId, person, categoryLabel: category })
        savedCount += 1
      } catch (e) {
        if (e instanceof PersonRelationsError) {
          // The person row was written; the category tag/moments are
          // best-effort during onboarding, so still count it as saved.
          savedCount += 1
        }
      }
    }

    DeviceEventEmitter.emit(PEOPLE_CHANGED_EVENT)
    router.push({
      pathname: "/(app)/onboarding/celebrate",
      params: { count: String(savedCount) },
    })
  }

  function handleSelectCategory(category: RelationshipCategoryLabel) {
    if (isSavingBatch || !userId) return

    const next = new Map(categorizations)
    next.set(currentIndex, { contact: contacts[currentIndex], category })
    setCategorizations(next)

    if (currentIndex === contacts.length - 1) {
      void saveBatch(next)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  function handleBack() {
    if (isSavingBatch) return
    if (currentIndex === 0) {
      router.back()
    } else {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (contacts.length === 0) return null

  if (isSavingBatch) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.forest} />
        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-4 text-center text-sm">
          Saving your people...
        </Text>
      </SafeAreaView>
    )
  }

  const contact = contacts[currentIndex]
  const phone = contact.phoneNumbers?.find((entry) => entry.number?.trim())?.number?.trim()
  const email = contact.emails?.find((entry) => entry.email?.trim())?.email?.trim()
  const selectedCategory = categorizations.get(currentIndex)?.category

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

          <Text
            style={{ fontFamily: fonts.semibold, color: colors.warmBlack }}
            className="mt-10 text-base"
          >
            How do you know them?
          </Text>

          <View className="mt-6 w-full flex-row gap-2">
            {RELATIONSHIP_CATEGORIES.map((category) => {
              const selected = selectedCategory === category.label
              return (
                <TouchableOpacity
                  key={category.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Categorize as ${category.label}`}
                  onPress={() => handleSelectCategory(category.label)}
                  activeOpacity={0.78}
                  style={{ backgroundColor: selected ? colors.forest : "white" }}
                  className="min-h-24 flex-1 items-center justify-center rounded-2xl border border-stone-200 px-1 py-4 shadow-sm"
                >
                  <Ionicons name={category.icon} size={26} color={selected ? "white" : colors.forest} />
                  <Text
                    style={{ fontFamily: fonts.semibold, color: selected ? "white" : colors.ink }}
                    className="mt-2 text-sm"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>
    </Screen>
  )
}
