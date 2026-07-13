import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import * as Contacts from "expo-contacts"
import { Ionicons } from "@expo/vector-icons"
import { Button } from "@/components/Button"
import { ErrorBanner } from "@/components/ErrorBanner"
import { PersonAvatar, SearchBox } from "@/components/RootsUI"
import { setSelectedContacts } from "@/features/onboarding/onboarding-contacts"
import { colors, fonts } from "@/constants/theme"

function ManualFallbackLink({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Add someone manually instead"
      onPress={onPress}
      className="min-h-11 items-center justify-center"
    >
      <Text style={{ fontFamily: fonts.medium, color: colors.muted }} className="text-sm">
        Add someone manually instead
      </Text>
    </TouchableOpacity>
  )
}

export default function OnboardingSelectScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contacts.ExistingContact[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadContacts() {
      try {
        const permission = await Contacts.getPermissionsAsync()
        if (!permission.granted) {
          if (!cancelled) setPermissionDenied(true)
          return
        }

        const { data } = await Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.Name,
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.Emails,
            Contacts.Fields.Birthday,
            Contacts.Fields.Company,
            Contacts.Fields.JobTitle,
          ],
        })

        const named = data
          .filter((contact) => contact.name?.trim())
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))

        if (!cancelled) setContacts(named)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load contacts.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadContacts()
    return () => {
      cancelled = true
    }
  }, [])

  const visibleContacts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return contacts
    return contacts.filter((contact) => contact.name.toLowerCase().includes(query))
  }, [contacts, search])

  function toggleContact(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleContinue() {
    const selected = contacts.filter((contact) => selectedIds.has(contact.id))
    if (selected.length === 0) return
    setSelectedContacts(selected)
    router.push("/(app)/onboarding/categorize")
  }

  const goToManual = () => router.push("/(app)/onboarding/manual")

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.forest} />
        </View>
      </SafeAreaView>
    )
  }

  if (permissionDenied || contacts.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="people-outline" size={40} color={colors.sage} />
          <Text
            style={{ fontFamily: fonts.semibold, color: colors.warmBlack }}
            className="mt-4 text-center text-base"
          >
            {permissionDenied
              ? "Enable contacts in Settings to import your people"
              : "No contacts found on your device"}
          </Text>
          <View className="mt-5">
            <ManualFallbackLink onPress={goToManual} />
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ flex: 1, backgroundColor: colors.cream }}>
        <View className="px-5 pt-4 pb-3">
          <Text
            style={{ fontFamily: fonts.heading, color: colors.forest }}
            className="text-[28px] leading-9"
          >
            Who matters to you?
          </Text>
          <Text
            style={{ fontFamily: fonts.body, color: colors.muted }}
            className="mt-1 text-sm leading-5"
          >
            Pick the people you want to stay close to. You can always add more later.
          </Text>

          {error != null && (
            <View className="mt-3">
              <ErrorBanner message={error} />
            </View>
          )}

          <SearchBox className="mt-3" >
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search contacts…"
              placeholderTextColor="#8F96A3"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search contacts"
              className="ml-2 flex-1 py-3 text-sm"
              style={{ fontFamily: fonts.body, color: colors.ink }}
            />
          </SearchBox>
        </View>

        <FlatList
          data={visibleContacts}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id)
            const phone = item.phoneNumbers?.find((entry) => entry.number?.trim())?.number?.trim()
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${selected ? "Deselect" : "Select"} ${item.name}`}
                onPress={() => toggleContact(item.id)}
                activeOpacity={0.75}
                className="mb-1.5 flex-row items-center rounded-2xl px-3 py-2.5"
                style={{ backgroundColor: selected ? colors.mint : "transparent" }}
              >
                <PersonAvatar name={item.name} size={40} />
                <View className="ml-3 flex-1">
                  <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-sm">
                    {item.name}
                  </Text>
                  {phone ? (
                    <Text
                      style={{ fontFamily: fonts.body, color: colors.muted }}
                      className="mt-0.5 text-xs"
                    >
                      {phone}
                    </Text>
                  ) : null}
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.forest} />
                ) : null}
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <Text
              style={{ fontFamily: fonts.body, color: colors.muted }}
              className="mt-8 text-center text-sm"
            >
              No contacts match "{search.trim()}"
            </Text>
          }
        />

        <View
          className="border-t px-5 pt-3 pb-2"
          style={{ borderTopColor: colors.border, backgroundColor: colors.cream }}
        >
          <Button
            title={`Continue with ${selectedIds.size} ${selectedIds.size === 1 ? "person" : "people"}`}
            onPress={handleContinue}
            disabled={selectedIds.size === 0}
          />
          <View className="mt-2">
            <ManualFallbackLink onPress={goToManual} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}
