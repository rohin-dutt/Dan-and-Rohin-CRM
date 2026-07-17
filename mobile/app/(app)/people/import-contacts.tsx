import { useEffect, useMemo, useRef, useState } from "react"
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View } from "react-native"
import * as Contacts from "expo-contacts"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import type { Session } from "@supabase/supabase-js"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { EmptyState } from "@/components/EmptyState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { LoadingState } from "@/components/LoadingState"
import { ConfirmModal } from "@/components/ConfirmModal"
import { Screen } from "@/components/Screen"
import { callTrustedApi } from "@/lib/trusted-api"
import { supabase } from "@/lib/supabase"
import { mapDeviceContact, toContactImportPayload, type ImportCandidate } from "@/lib/contact-import"
import {
  clearPendingImportEditQueue,
  serializeImportEditQueue,
  setPendingImportEditQueue,
} from "@/lib/import-edit-queue"
import type { Person } from "@/types"
import { colors } from "@/constants/theme"
import { useCrmData } from "@/features/crm-data/CrmDataProvider"

type PermissionState = "unknown" | "denied" | "limited" | "granted"

type ImportResponse = {
  ok: boolean
  imported: number
  errors: string[]
  createdPeople: Array<{
    id: string
    name: string
  }>
}

type BatchReviewPrompt = {
  createdPersonIds: string[]
  failureCount: number
}

function matchesCandidate(candidate: ImportCandidate, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true
  return (
    candidate.name.toLowerCase().startsWith(query) ||
    (candidate.email ?? "").toLowerCase().startsWith(query) ||
    (candidate.phone ?? "").toLowerCase().startsWith(query)
  )
}

function batchReviewMessage(prompt: BatchReviewPrompt) {
  const importedCount = prompt.createdPersonIds.length
  const importedSummary = `${importedCount} ${importedCount === 1 ? "person was" : "people were"} imported.`
  const failureSummary = prompt.failureCount > 0
    ? ` ${prompt.failureCount} contact${prompt.failureCount === 1 ? "" : "s"} could not be imported.`
    : ""
  const detailsSummary = importedCount === 1
    ? "This person still needs relationship details and a little more information so Roots can personalize reminders and follow-ups."
    : "These people still need relationship details and a little more information so Roots can personalize reminders and follow-ups."

  return `${importedSummary}${failureSummary}\n\n${detailsSummary}`
}

export default function ImportContactsScreen() {
  const router = useRouter()
  const { snapshot, refresh } = useCrmData()
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hiddenDuplicateIds, setHiddenDuplicateIds] = useState<Set<string>>(new Set())
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [search, setSearch] = useState("")
  const [result, setResult] = useState<string | null>(null)
  const [batchReviewPrompt, setBatchReviewPrompt] = useState<BatchReviewPrompt | null>(null)

  const visibleCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        if (!matchesCandidate(candidate, search)) return false
        if (candidate.duplicateReason && !showDuplicates) return false
        if (hiddenDuplicateIds.has(candidate.id)) return false
        return true
      }),
    [candidates, hiddenDuplicateIds, search, showDuplicates],
  )

  const selectedCandidates = useMemo(
    () => candidates.filter((candidate) => selectedIds.has(candidate.id)),
    [candidates, selectedIds],
  )
  const duplicateCount = candidates.filter((candidate) => candidate.duplicateReason != null).length
  const visibleDuplicateCount = visibleCandidates.filter((candidate) => candidate.duplicateReason != null).length

  // Cached session: avoids paying a network round trip inside every save
  // call. Fetched once on mount, with a fallback fetch (and re-cache) if
  // it hasn't resolved by the time it's needed.
  const sessionRef = useRef<Session | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) sessionRef.current = session
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function getCachedSession() {
    if (sessionRef.current) return sessionRef.current
    const {
      data: { session },
    } = await supabase.auth.getSession()
    sessionRef.current = session
    return session
  }

  async function loadExistingPeople() {
    if (snapshot) return snapshot.people

    const session = await getCachedSession()
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
    setSearch("")

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
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))

      setCandidates(mapped)
      setHiddenDuplicateIds(new Set())
      setShowDuplicates(false)
      setSelectedIds(new Set())
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

  function removeDuplicates() {
    const duplicateIds = candidates
      .filter((candidate) => candidate.duplicateReason != null)
      .map((candidate) => candidate.id)
    setHiddenDuplicateIds(new Set(duplicateIds))
    setSelectedIds((current) => {
      const next = new Set(current)
      duplicateIds.forEach((id) => next.delete(id))
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function reviewBatchNow() {
    if (!batchReviewPrompt) return

    if (!setPendingImportEditQueue(batchReviewPrompt.createdPersonIds)) {
      setBatchReviewPrompt(null)
      setError("The contacts were imported, but Roots could not open them for review.")
      return
    }

    const firstPersonId = batchReviewPrompt.createdPersonIds[0]
    if (!firstPersonId) {
      clearPendingImportEditQueue()
      setBatchReviewPrompt(null)
      setError("The contacts were imported, but Roots could not open them for review.")
      return
    }

    setBatchReviewPrompt(null)
    router.replace({
      pathname: "/(app)/people/[id]/edit",
      params: {
        id: firstPersonId,
        importReview: "1",
        importIndex: "0",
      },
    })
  }

  function reviewBatchLater() {
    clearPendingImportEditQueue()
    setBatchReviewPrompt(null)
    router.dismissTo("/people")
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
    const submittedCandidates = selectedCandidates
    const shouldReviewSequentially = submittedCandidates.length <= 3

    function reviewCreatedPeople(createdPersonIds: string[]) {
      const importQueue = serializeImportEditQueue(createdPersonIds)
      const firstPersonId = createdPersonIds[0]
      if (!importQueue || !firstPersonId) {
        setError("The contacts were imported, but Roots could not open them for review.")
        return
      }

      router.replace({
        pathname: "/(app)/people/[id]/edit",
        params: {
          id: firstPersonId,
          importQueue,
          importIndex: "0",
        },
      })
    }

    try {
      const response = await callTrustedApi("/api/import/contacts", {
        body: {
          contacts: submittedCandidates.map(toContactImportPayload),
        },
      }) as ImportResponse

      const failures = response.errors.length
      setResult(`Imported ${response.imported} contact${response.imported === 1 ? "" : "s"}${failures ? ` with ${failures} warning${failures === 1 ? "" : "s"}` : ""}.`)
      const createdPersonIds = response.createdPeople.map((person) => person.id)

      if (createdPersonIds.length === 0) {
        setError(response.errors.join("\n") || "No contacts were imported.")
        return
      }
      await refresh()

      if (shouldReviewSequentially) {
        if (failures > 0) {
          setError(response.errors.join("\n"))
          Alert.alert(
            "Some contacts weren't imported",
            `${response.errors.join("\n")}\n\nThe ${createdPersonIds.length} successfully imported ${createdPersonIds.length === 1 ? "person is" : "people are"} ready to review.`,
            [
              {
                text: "Review imported people",
                onPress: () => reviewCreatedPeople(createdPersonIds),
              },
            ],
            { cancelable: false },
          )
        } else {
          reviewCreatedPeople(createdPersonIds)
        }
        return
      }

      setBatchReviewPrompt({ createdPersonIds, failureCount: failures })
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
              Roots imports only the selected names and contact details you approve.
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
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search contacts..."
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white mb-3 text-warm-black"
              placeholderTextColor="#9CA3AF"
              accessibilityLabel="Search import contacts"
            />

            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-warm-black">
                  {selectedCandidates.length} selected of {visibleCandidates.length} shown
                </Text>
                <Text className="text-xs text-gray-500">
                  {permissionState === "limited" ? "Limited Contacts access. " : ""}
                  {duplicateCount} possible duplicate{duplicateCount === 1 ? "" : "s"}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={removeDuplicates} className="py-2">
                  <Text className="text-xs font-semibold text-sage">Remove duplicates</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearSelection} className="py-2">
                  <Text className="text-xs font-semibold text-gray-500">Clear</Text>
                </TouchableOpacity>
              </View>
            </View>

            {duplicateCount > 0 && (
              <TouchableOpacity
                onPress={() => setShowDuplicates((value) => !value)}
                className="mb-3 flex-row items-center rounded-xl bg-white px-3 py-2"
                accessibilityRole="switch"
                accessibilityState={{ checked: showDuplicates }}
              >
                <Ionicons
                  name={showDuplicates ? "checkbox-outline" : "square-outline"}
                  size={18}
                  color={colors.sage}
                />
                <Text className="ml-2 text-xs font-semibold text-warm-black">
                  Show and allow possible duplicates
                </Text>
              </TouchableOpacity>
            )}

            {visibleDuplicateCount > 0 && (
              <Text className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Possible duplicates are visible. Review warnings before selecting them.
              </Text>
            )}

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
          data={visibleCandidates}
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
                      {item.displayPhone && <Text className="text-xs text-gray-500 mt-1">{item.displayPhone}</Text>}
                      {item.duplicateReason && (
                        <Text className="text-xs text-amber-700 mt-2">{item.duplicateReason}</Text>
                      )}
                    </View>
                    <View className={`h-6 w-6 rounded-full border items-center justify-center ${selected ? "bg-sage border-sage" : "bg-white border-gray-300"}`}>
                      {selected && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <EmptyState
              title="No contacts shown"
              description="Try a different search or show possible duplicates."
            />
          }
        />
      ) : null}

      <ConfirmModal
        visible={batchReviewPrompt !== null}
        title={batchReviewPrompt?.failureCount ? "Contacts imported with warnings" : "Contacts imported"}
        message={batchReviewPrompt ? batchReviewMessage(batchReviewPrompt) : ""}
        confirmLabel="Review now"
        cancelLabel="Do it later"
        onConfirm={reviewBatchNow}
        onCancel={reviewBatchLater}
      />
    </Screen>
  )
}
