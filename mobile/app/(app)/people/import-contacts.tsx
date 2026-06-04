import { useMemo, useState } from "react"
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native"
import * as Contacts from "expo-contacts"
import { useRouter } from "expo-router"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { EmptyState } from "@/components/EmptyState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { LoadingState } from "@/components/LoadingState"
import { Screen } from "@/components/Screen"
import { callTrustedApi } from "@/lib/trusted-api"
import { supabase } from "@/lib/supabase"
import { mapDeviceContact, toContactImportPayload, type ImportCandidate } from "@/lib/contact-import"
import type { Person } from "@/types"

type PermissionState = "unknown" | "denied" | "limited" | "granted"

type ImportResponse = {
  ok: boolean
  imported: number
  errors: string[]
}

export default function ImportContactsScreen() {
  const router = useRouter()
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<string | null>(null)

  const selectedCandidates = useMemo(
    () => candidates.filter((candidate) => selectedIds.has(candidate.id)),
    [candidates, selectedIds],
  )
  const duplicateCount = candidates.filter((candidate) => candidate.duplicateReason != null).length

  async function loadExistingPeople() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) throw new Error("You must be signed in.")

    const { data, error: peopleError } = await supabase
      .from("people")
      .select("*")
      .eq("user_id", session.user.id)

    if (peopleError) throw peopleError
    return data ?? []
  }

  async function requestAndLoadContacts() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const permission = await Contacts.requestPermissionsAsync()
      if (!permission.granted) {
        setPermissionState("denied")
        setCandidates([])
        setSelectedIds(new Set())
        return
      }

      setPermissionState(permission.accessPrivileges === "limited" ? "limited" : "granted")

      const [people, contacts] = await Promise.all([
        loadExistingPeople(),
        Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.Name,
            Contacts.Fields.Emails,
            Contacts.Fields.PhoneNumbers,
          ],
        }),
      ])

      const mapped = contacts.data
        .map((contact) => mapDeviceContact(contact, people as Person[]))
        .filter((contact): contact is ImportCandidate => contact != null)
        .sort((a, b) => a.name.localeCompare(b.name))

      setCandidates(mapped)
      setSelectedIds(new Set(mapped.filter((candidate) => candidate.duplicateReason == null).map((candidate) => candidate.id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contacts.")
    } finally {
      setLoading(false)
    }
  }

  function toggleContact(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllNonDuplicates() {
    setSelectedIds(new Set(candidates.filter((candidate) => candidate.duplicateReason == null).map((candidate) => candidate.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function importSelectedContacts() {
    if (selectedCandidates.length === 0) {
      setError("Select at least one contact to import.")
      return
    }

    const duplicateSelections = selectedCandidates.filter((candidate) => candidate.duplicateReason != null).length
    if (duplicateSelections > 0) {
      Alert.alert(
        "Import possible duplicates?",
        `${duplicateSelections} selected contact${duplicateSelections === 1 ? "" : "s"} may already exist. Roots will create new people for this import.`,
        [
          { text: "Review", style: "cancel" },
          { text: "Import", style: "destructive", onPress: () => void submitImport() },
        ],
      )
      return
    }

    await submitImport()
  }

  async function submitImport() {
    setSaving(true)
    setError(null)
    setResult(null)
    const submittedIds = new Set(selectedCandidates.map((candidate) => candidate.id))

    try {
      const response = await callTrustedApi("/api/import/contacts", {
        body: {
          contacts: selectedCandidates.map(toContactImportPayload),
        },
      }) as ImportResponse

      const failures = response.errors.length
      setResult(`Imported ${response.imported} contact${response.imported === 1 ? "" : "s"}${failures ? ` with ${failures} warning${failures === 1 ? "" : "s"}` : ""}.`)
      if (failures === 0) {
        setCandidates((current) => current.filter((candidate) => !submittedIds.has(candidate.id)))
        setSelectedIds(new Set())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import contacts.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <Screen scrollable={false}>
      <View className="px-5 pt-4 pb-3 bg-cream">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity onPress={() => router.back()} className="py-2 pr-3">
            <Text className="text-sage text-sm font-semibold">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-base font-semibold text-warm-black">Import contacts</Text>
          <View style={{ width: 60 }} />
        </View>

        {error && <ErrorBanner message={error} />}
        {result && (
          <View className="rounded-xl bg-green-50 border border-green-100 px-3 py-2 mb-3">
            <Text className="text-sm text-green-700">{result}</Text>
          </View>
        )}

        {candidates.length === 0 ? (
          <Card>
            <Text className="text-base font-semibold text-warm-black mb-2">
              Choose contacts to add to Roots
            </Text>
            <Text className="text-sm text-gray-600 mb-4">
              Roots only imports contacts you select on the review screen. Names, first email addresses, and first phone numbers are mapped; notes, addresses, images, and unselected contacts stay on your device.
            </Text>
            {permissionState === "denied" && (
              <Text className="text-sm text-red-600 mb-4">
                Contacts permission was denied. Enable Contacts access in iOS Settings to import.
              </Text>
            )}
            <Button title="Review contacts" onPress={requestAndLoadContacts} />
          </Card>
        ) : (
          <>
            <View className="flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-sm font-semibold text-warm-black">
                  {selectedCandidates.length} selected of {candidates.length}
                </Text>
                <Text className="text-xs text-gray-500">
                  {permissionState === "limited" ? "Limited Contacts access. " : ""}
                  {duplicateCount} possible duplicate{duplicateCount === 1 ? "" : "s"}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={selectAllNonDuplicates} className="py-2">
                  <Text className="text-xs font-semibold text-sage">Select safe</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearSelection} className="py-2">
                  <Text className="text-xs font-semibold text-gray-500">Clear</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Button
              title={`Import ${selectedCandidates.length} selected`}
              onPress={importSelectedContacts}
              loading={saving}
              disabled={selectedCandidates.length === 0}
            />
          </>
        )}
      </View>

      {candidates.length > 0 ? (
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id)
            return (
              <TouchableOpacity onPress={() => toggleContact(item.id)} activeOpacity={0.75}>
                <Card className={`mb-3 ${selected ? "border-sage" : ""}`}>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-warm-black">{item.name}</Text>
                      {item.email && <Text className="text-xs text-gray-500 mt-1">{item.email}</Text>}
                      {item.phone && <Text className="text-xs text-gray-500 mt-1">{item.phone}</Text>}
                      {item.duplicateReason && (
                        <Text className="text-xs text-amber-700 mt-2">{item.duplicateReason}</Text>
                      )}
                    </View>
                    <View className={`h-6 w-6 rounded-full border items-center justify-center ${selected ? "bg-sage border-sage" : "bg-white border-gray-300"}`}>
                      {selected && <Text className="text-white text-xs font-bold">X</Text>}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <EmptyState
              title="No importable contacts"
              description="No contacts with a name were available from your device."
            />
          }
        />
      ) : null}
    </Screen>
  )
}
