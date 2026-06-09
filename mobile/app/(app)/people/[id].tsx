import { useCallback, useMemo, useState } from "react"
import { Alert, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router"
import { Screen } from "@/components/Screen"
import { Button } from "@/components/Button"
import { Divider, IconTile, PersonAvatar, SoftCard } from "@/components/RootsUI"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { supabase } from "@/lib/supabase"
import { loadImportantMomentsForPerson } from "@/lib/important-moments"
import { loadPersonNotesForPerson } from "@/lib/person-notes"
import type { ImportantMoment, Person, Interaction, PersonNote, Tag } from "@/types"
import { colors, fonts } from "@/constants/theme"
import { formatDate, getNextDueDays, getFollowUpState, isTouchPoint } from "@roots/shared"

type ProfileTab = "Timeline" | "About" | "Notes" | "Follow-ups"

type PersonTagRow = {
  tags: Tag | Tag[] | null
}

type DetailPerson = Person & {
  photo_url?: string | null
  avatar_url?: string | null
  image_url?: string | null
}

type InfoRow = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  actionIcon?: keyof typeof Ionicons.glyphMap
  tone?: "green" | "purple" | "amber" | "red"
}

const PROFILE_TABS: ProfileTab[] = ["Timeline", "About", "Notes", "Follow-ups"]

const toneColors = {
  green: { color: colors.forest, background: colors.mint },
  purple: { color: colors.purple, background: "#F0EAFB" },
  amber: { color: colors.amber, background: "#FFF3DE" },
  red: { color: "#CF2D2D", background: "#FEECEC" },
}

function getTagFromJoin(row: PersonTagRow): Tag | null {
  if (Array.isArray(row.tags)) return row.tags[0] ?? null
  return row.tags
}

function personImageUrl(person: Person) {
  const maybePerson = person as DetailPerson
  return maybePerson.photo_url ?? maybePerson.avatar_url ?? maybePerson.image_url ?? null
}

function compactDate(value: string | null | undefined) {
  if (!value) return "Not set"
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

function displayDate(value: string | null | undefined) {
  if (!value) return "No date"
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

function daysSince(value: string | null) {
  if (!value) return null
  const then = new Date(value)
  if (Number.isNaN(then.getTime())) return null
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86_400_000))
}

function formatLastTalked(value: string | null) {
  const days = daysSince(value)
  if (days == null) return "Not yet"
  if (days === 0) return "Today"
  if (days === 1) return "1 day ago"
  return `${days} days ago`
}

function formatNextAction(days: number | null) {
  if (days == null) return "No cadence"
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return "Due today"
  if (days === 1) return "Due tomorrow"
  return `Due in ${days}d`
}

function formatFrequency(days: number | null | undefined) {
  if (!days) return "Not set"
  if (days === 7) return "Every week"
  if (days === 14) return "Every 2 weeks"
  if (days === 30) return "Every month"
  if (days === 90) return "Every 3 months"
  if (days === 180) return "Every 6 months"
  if (days === 365) return "Once a year"
  return `Every ${days} days`
}

function interactionIcon(type: string): keyof typeof Ionicons.glyphMap {
  const normalized = type.trim().toLowerCase()
  if (normalized.includes("call") || normalized.includes("phone")) return "call-outline"
  if (normalized.includes("text") || normalized.includes("message")) return "chatbubble-outline"
  if (normalized.includes("coffee")) return "cafe-outline"
  if (normalized.includes("meeting") || normalized.includes("meet")) return "people-outline"
  if (normalized.includes("email")) return "mail-outline"
  if (normalized.includes("note")) return "document-text-outline"
  return "chatbubbles-outline"
}

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: ProfileTab
  onChange: (tab: ProfileTab) => void
}) {
  return (
    <View className="mt-5 border-b border-stone-200">
      <View className="flex-row">
        {PROFILE_TABS.map((tab) => {
          const isActive = activeTab === tab
          return (
            <TouchableOpacity
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab} tab`}
              onPress={() => onChange(tab)}
              activeOpacity={0.78}
              className="flex-1 items-center px-1 pb-3"
            >
              <Text
                style={{ fontFamily: isActive ? fonts.semibold : fonts.medium, color: isActive ? colors.forest : colors.muted }}
                className="text-[15px]"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {tab}
              </Text>
              <View
                className="absolute bottom-[-1px] h-0.5 rounded-full"
                style={{ width: 78, backgroundColor: isActive ? colors.forest : "transparent" }}
              />
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function TagPill({ tag, highlighted = false }: { tag: Pick<Tag, "id" | "name">; highlighted?: boolean }) {
  return (
    <View
      className="rounded-lg px-3 py-1.5"
      style={{ backgroundColor: highlighted ? "#E9F1FF" : colors.mint }}
    >
      <Text
        style={{ fontFamily: fonts.semibold, color: highlighted ? colors.blue : colors.forest }}
        className="text-xs"
      >
        {tag.name}
      </Text>
    </View>
  )
}

function StatStrip({
  lastTalked,
  nextAction,
  interactionsCount,
  openFollowUpsCount,
}: {
  lastTalked: string
  nextAction: string
  interactionsCount: number
  openFollowUpsCount: number
}) {
  const stats = [
    ["Last talked", lastTalked],
    ["Next action", nextAction],
    ["Interactions", String(interactionsCount)],
    ["Open follow-ups", String(openFollowUpsCount)],
  ]

  return (
    <SoftCard className="mt-5 flex-row px-2 py-4">
      {stats.map(([label, value], index) => (
        <View
          key={label}
          className={`flex-1 items-center px-1 ${index > 0 ? "border-l border-stone-200" : ""}`}
        >
          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-[11px]" numberOfLines={1}>
            {label}
          </Text>
          <Text
            style={{ fontFamily: fonts.semibold, color: colors.ink }}
            className="mt-2 text-[13px]"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {value}
          </Text>
        </View>
      ))}
    </SoftCard>
  )
}

function SectionCard({
  icon,
  title,
  children,
  onEdit,
}: {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  children: React.ReactNode
  onEdit?: () => void
}) {
  return (
    <SoftCard className="mb-4 p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <IconTile icon={icon} size={36} />
          <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="ml-3 text-lg">
            {title}
          </Text>
        </View>
        {onEdit ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit ${title}`} onPress={onEdit} className="px-2 py-1">
            <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
              Edit
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </SoftCard>
  )
}

function InfoList({ rows }: { rows: InfoRow[] }) {
  if (rows.length === 0) {
    return <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">Nothing added yet.</Text>
  }

  return (
    <View>
      {rows.map((row, index) => {
        const tone = toneColors[row.tone ?? "green"]
        return (
          <View key={`${row.label}-${row.value}`} className={index > 0 ? "border-t border-stone-100 pt-3 mt-3" : ""}>
            <View className="flex-row items-center">
              <IconTile icon={row.icon} color={tone.color} background={tone.background} size={38} />
              <View className="ml-3 flex-1">
                <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="text-sm">
                  {row.label}
                </Text>
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-0.5 text-sm">
                  {row.value}
                </Text>
              </View>
              {row.actionIcon ? <Ionicons name={row.actionIcon} size={22} color={colors.forest} /> : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <SoftCard className="p-5">
      <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} className="text-base">
        {title}
      </Text>
      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm leading-5">
        {body}
      </Text>
    </SoftCard>
  )
}

export default function PersonDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [person, setPerson] = useState<Person | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [personNotes, setPersonNotes] = useState<PersonNote[]>([])
  const [importantMoments, setImportantMoments] = useState<ImportantMoment[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [activeTab, setActiveTab] = useState<ProfileTab>("Timeline")

  const load = useCallback(async () => {
    try {
      setError(null)
      const [personRes, interactionsRes, tagsRes, loadedMoments, loadedNotes] = await Promise.all([
        supabase.from("people").select("*").eq("id", id).single(),
        supabase
          .from("interactions")
          .select("*")
          .eq("person_id", id)
          .order("date", { ascending: false }),
        supabase.from("person_tags").select("tag_id, tags(*)").eq("person_id", id),
        loadImportantMomentsForPerson(id),
        loadPersonNotesForPerson(id),
      ])
      if (personRes.error) throw personRes.error
      setPerson(personRes.data)
      setInteractions(interactionsRes.data ?? [])
      setImportantMoments(loadedMoments)
      setPersonNotes(loadedNotes)
      setTags(
        ((tagsRes.data ?? []) as PersonTagRow[])
          .map(getTagFromJoin)
          .filter((tag): tag is Tag => tag != null),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load person")
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load]),
  )

  function showMenu() {
    Alert.alert(person?.name ?? "Options", undefined, [
      { text: "Edit", onPress: () => router.push(`/people/${id}/edit`) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete person", `Delete ${person?.name}? This cannot be undone.`, [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                await supabase.from("people").delete().eq("id", id)
                router.back()
              },
            },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ])
  }

  async function markFollowUpDone(interactionId: string) {
    await supabase
      .from("interactions")
      .update({ follow_up_status: "done" })
      .eq("id", interactionId)
    load()
  }

  async function snoozeFollowUp(interactionId: string) {
    const snoozeDate = new Date()
    snoozeDate.setDate(snoozeDate.getDate() + 7)
    const snoozedUntil = snoozeDate.toISOString().split("T")[0]
    await supabase
      .from("interactions")
      .update({ follow_up_status: "snoozed", follow_up_snoozed_until: snoozedUntil })
      .eq("id", interactionId)
    load()
  }

  async function updatePersonNote(noteId: string, body: string) {
    const trimmed = body.trim()
    if (!trimmed) return
    const { data, error: noteError } = await supabase
      .from("person_notes")
      .update({ body: trimmed, updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .select("*")
      .single()
    if (noteError) {
      setError(noteError.message)
      return
    }
    setPersonNotes((prev) => prev.map((note) => (note.id === noteId ? data : note)))
  }

  function promptEditNote(note: PersonNote) {
    Alert.prompt(
      "Edit note",
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: (value: string | undefined) => {
            if (value != null) void updatePersonNote(note.id, value)
          },
        },
      ],
      "plain-text",
      note.body,
    )
  }

  function confirmDeleteNote(noteId: string) {
    Alert.alert("Delete note", "Delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error: noteError } = await supabase.from("person_notes").delete().eq("id", noteId)
          if (noteError) {
            setError(noteError.message)
            return
          }
          setPersonNotes((prev) => prev.filter((note) => note.id !== noteId))
        },
      },
    ])
  }

  const openFollowUps = useMemo(
    () => interactions.filter((i) => isTouchPoint(i) && i.follow_up_needed && getFollowUpState(i) !== "done"),
    [interactions],
  )

  const touchPointInteractions = useMemo(() => interactions.filter(isTouchPoint), [interactions])

  const noteItems = useMemo(() => personNotes, [personNotes])

  if (loading) return <LoadingState />

  if (!person) {
    return (
      <Screen>
        <ErrorBanner message={error ?? "Person not found"} />
      </Screen>
    )
  }

  const nextDueDays = getNextDueDays(person)
  const subtitle = [person.role, person.company].filter(Boolean).join(" at ")
  const topTags = tags.slice(0, 3)
  const contactRows: InfoRow[] = []
  if (person.email) contactRows.push({ icon: "mail-outline", label: "Email", value: person.email, actionIcon: "mail-outline" })
  if (person.phone) contactRows.push({ icon: "call-outline", label: "Phone", value: person.phone, actionIcon: "chatbubble-outline" })
  if (person.location) contactRows.push({ icon: "location-outline", label: "Location", value: person.location, actionIcon: "map-outline" })

  const personalRows: InfoRow[] = []
  if (person.birthday) personalRows.push({ icon: "calendar-outline", label: "Birthday", value: compactDate(person.birthday), actionIcon: "chevron-forward", tone: "purple" })
  importantMoments.forEach((moment) => {
    personalRows.push({
      icon: "sparkles-outline",
      label: moment.label,
      value: `${compactDate(moment.date)}${moment.recurs_yearly ? " - yearly" : ""}`,
      actionIcon: "chevron-forward",
      tone: "green",
    })
  })
  if (person.how_met) personalRows.push({ icon: "people-outline", label: "How we met", value: person.how_met, actionIcon: "chevron-forward", tone: "amber" })
  if (person.relationship_type) personalRows.push({ icon: "heart-outline", label: "Relationship type", value: person.relationship_type, actionIcon: "chevron-forward", tone: "red" })
  personalRows.push({ icon: "time-outline", label: "Contact frequency", value: formatFrequency(person.contact_frequency_days), actionIcon: "chevron-forward", tone: "amber" })

  return (
    <Screen>
      <View className="px-5 pt-4 pb-8">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            className="h-10 w-10 items-start justify-center"
          >
            <Ionicons name="arrow-back" size={26} color={colors.warmBlack} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open contact actions"
            onPress={showMenu}
            className="h-10 w-10 items-end justify-center"
          >
            <Ionicons name="ellipsis-vertical" size={22} color={colors.warmBlack} />
          </TouchableOpacity>
        </View>

        {error != null && <ErrorBanner message={error} />}

        <View className="mt-5 flex-row items-center">
          <PersonAvatar name={person.name} size={92} imageUrl={personImageUrl(person)} />
          <View className="ml-4 flex-1">
            <Text
              style={{ fontFamily: fonts.heading, color: colors.forest }}
              className="text-[34px] leading-[38px]"
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={2}
            >
              {person.name}
            </Text>
            {subtitle ? (
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-base leading-5">
                {subtitle}
              </Text>
            ) : null}
            {topTags.length > 0 ? (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {topTags.map((tag, index) => (
                  <TagPill key={tag.id} tag={tag} highlighted={index === 0} />
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <StatStrip
          lastTalked={formatLastTalked(person.last_contacted_at)}
          nextAction={formatNextAction(nextDueDays)}
          interactionsCount={touchPointInteractions.length}
          openFollowUpsCount={openFollowUps.length}
        />

        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "Timeline" ? (
          <View className="mt-6">
            {touchPointInteractions.length > 0 ? (
              <View>
                {touchPointInteractions.slice(0, 6).map((interaction, index) => (
                  <View key={interaction.id} className="flex-row">
                    <View className="items-center">
                      <IconTile icon={interactionIcon(interaction.type)} size={44} />
                      {index < Math.min(touchPointInteractions.length, 6) - 1 ? <View className="w-px flex-1 bg-stone-200" /> : null}
                    </View>
                    <View className="ml-4 flex-1 pb-6">
                      <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="text-base">
                        {displayDate(interaction.date)}  ·  {interaction.type}
                      </Text>
                      {interaction.notes ? (
                        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-base leading-6">
                          {interaction.notes}
                        </Text>
                      ) : (
                        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm">
                          No notes for this interaction.
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
                <Divider />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="View all interactions"
                  onPress={() => router.push(`/people/${id}/log`)}
                  className="py-4"
                >
                  <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-base">
                    View all interactions
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <EmptyState title="No interactions yet" body="Log a call, text, or meeting to start this contact's timeline." />
            )}

            <View className="mt-5 flex-row gap-3">
              <View className="flex-1">
                <Button title="Log Interaction" onPress={() => router.push(`/people/${id}/log`)} />
              </View>
              <View className="flex-1">
                <Button title="Add Note" onPress={() => router.push(`/people/${id}/log?action=note`)} variant="secondary" />
              </View>
            </View>
          </View>
        ) : null}

        {activeTab === "About" ? (
          <View className="mt-5">
            <SectionCard icon="person-outline" title="Overview" onEdit={() => router.push(`/people/${id}/edit`)}>
              <Text style={{ fontFamily: fonts.body, color: colors.warmBlack }} className="text-base leading-6">
                {person.notes?.trim() || "No overview notes added yet."}
              </Text>
            </SectionCard>

            <SectionCard icon="call-outline" title="Contact information" onEdit={() => router.push(`/people/${id}/edit`)}>
              <InfoList rows={contactRows} />
            </SectionCard>

            <SectionCard icon="calendar-outline" title="Personal details" onEdit={() => router.push(`/people/${id}/edit`)}>
              <InfoList rows={personalRows} />
            </SectionCard>

            <SectionCard icon="pricetag-outline" title="Additional info" onEdit={() => router.push(`/people/${id}/edit`)}>
              {person.company || person.role ? (
                <View className="mb-3">
                  <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="text-sm">
                    Work
                  </Text>
                  <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-0.5 text-sm">
                    {[person.role, person.company].filter(Boolean).join(" at ")}
                  </Text>
                </View>
              ) : null}
              {tags.length > 0 ? (
                <View>
                  <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="text-sm">
                    Tags
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {tags.map((tag) => (
                      <TagPill key={tag.id} tag={tag} />
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="text-sm">
                  No tags or extra work details added yet.
                </Text>
              )}
            </SectionCard>
          </View>
        ) : null}

        {activeTab === "Notes" ? (
          <View className="mt-6">
            <Text style={{ fontFamily: fonts.heading, color: colors.forest }} className="mb-4 text-[24px] leading-7">
              Notes ({noteItems.length})
            </Text>
            {noteItems.length > 0 ? (
              <View className="gap-4">
                {noteItems.map((note) => (
                  <SoftCard key={note.id} className="p-4">
                    <View className="flex-row items-center">
                    <IconTile icon="document-text-outline" size={58} />
                    <View className="ml-4 flex-1">
                      <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="text-base">
                        {displayDate(note.note_date ?? note.created_at)}
                      </Text>
                      <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-base leading-6" numberOfLines={3}>
                        {note.body}
                      </Text>
                    </View>
                    </View>
                    <View className="mt-4 flex-row gap-2">
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Edit note"
                        onPress={() => promptEditNote(note)}
                        className="flex-1 items-center rounded-xl border border-stone-200 bg-white py-3"
                      >
                        <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Delete note"
                        onPress={() => confirmDeleteNote(note.id)}
                        className="flex-1 items-center rounded-xl border border-stone-200 bg-white py-3"
                      >
                        <Text style={{ fontFamily: fonts.semibold, color: "#B91C1C" }} className="text-sm">
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </SoftCard>
                ))}
              </View>
            ) : (
              <EmptyState title="No notes yet" body="Notes you save about this person will appear here." />
            )}
            <View className="mt-6">
              <Button title="Add Note" onPress={() => router.push(`/people/${id}/log?action=note`)} />
            </View>
          </View>
        ) : null}

        {activeTab === "Follow-ups" ? (
          <View className="mt-6">
            {openFollowUps.length > 0 ? (
              <View className="gap-3">
                {openFollowUps.map((fu) => (
                  <SoftCard key={fu.id} className="p-4">
                    <View className="flex-row items-start">
                      <IconTile icon="flag-outline" size={42} background="#FFF3DE" color={colors.amber} />
                      <View className="ml-3 flex-1">
                        <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="text-base">
                          {fu.type}
                        </Text>
                        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
                          {fu.follow_up_date ? formatDate(fu.follow_up_date) : "No due date"}
                        </Text>
                        {fu.notes ? (
                          <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm leading-5">
                            {fu.notes}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View className="mt-4 flex-row gap-2">
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Snooze ${fu.type} follow-up for 7 days`}
                        onPress={() => snoozeFollowUp(fu.id)}
                        className="flex-1 items-center rounded-xl border border-stone-200 bg-white py-3"
                      >
                        <Text style={{ fontFamily: fonts.semibold, color: colors.muted }} className="text-sm">
                          Snooze 7d
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Mark ${fu.type} follow-up done`}
                        onPress={() => markFollowUpDone(fu.id)}
                        className="flex-1 items-center rounded-xl py-3"
                        style={{ backgroundColor: colors.forest }}
                      >
                        <Text style={{ fontFamily: fonts.semibold, color: "white" }} className="text-sm">
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </SoftCard>
                ))}
              </View>
            ) : (
              <EmptyState title="No open follow-ups" body="Open follow-ups from logged interactions will appear here." />
            )}
          </View>
        ) : null}
      </View>
    </Screen>
  )
}
