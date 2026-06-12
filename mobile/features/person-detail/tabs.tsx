import { useState } from "react"
import { Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import { Button } from "@/components/Button"
import { IconTile, SoftCard } from "@/components/RootsUI"
import { formatDate } from "@roots/shared"
import { formatCompactDate, formatTimelineDate } from "@/lib/format-dates"
import { formatFrequency } from "@/constants/frequencies"
import { DetailEmptyState, InfoList, SectionCard, TagPill, type InfoRow } from "./components"
import { FOLLOW_UP_COMPLETED_TYPE, interactionIcon } from "./helpers"
import type { Interaction, Person, PersonNote, Tag } from "@/types"

export function TimelineTab({ interactions }: { interactions: Interaction[] }) {
  const [expanded, setExpanded] = useState(false)

  if (interactions.length === 0) {
    return (
      <View className="mt-6">
        <DetailEmptyState title="No interactions yet" body="Log a call, text, or meeting to start this contact's timeline." />
      </View>
    )
  }

  const visible = expanded ? interactions : interactions.slice(0, 3)
  const extraCount = interactions.length - 3

  return (
    <View className="mt-6">
      {visible.map((interaction, index) => {
        // Completed follow-ups are logged without a type badge; the timeline
        // shows a fixed description instead.
        const isFollowUpCompleted = interaction.type === FOLLOW_UP_COMPLETED_TYPE
        return (
          <View key={interaction.id} className="flex-row">
            <View className="items-center">
              <IconTile icon={interactionIcon(interaction.type)} size={44} />
              {index < visible.length - 1 ? <View className="w-px flex-1 bg-stone-200" /> : null}
            </View>
            <View className="ml-4 flex-1 pb-6">
              <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="text-base">
                {isFollowUpCompleted
                  ? formatTimelineDate(interaction.date)
                  : `${formatTimelineDate(interaction.date)}  ·  ${interaction.type}`}
              </Text>
              {isFollowUpCompleted ? (
                <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-base leading-6">
                  Follow up completed
                </Text>
              ) : interaction.notes ? (
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
        )
      })}
      {!expanded && extraCount > 0 ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Show ${extraCount} more interactions`}
          onPress={() => setExpanded(true)}
          className="py-2"
        >
          <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
            {extraCount} more
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

export function AboutTab({ person, tags }: { person: Person; tags: Tag[] }) {
  const overview = person.notes?.trim()

  const contactRows: InfoRow[] = []
  if (person.phone) contactRows.push({ icon: "call-outline", label: "Phone", value: person.phone })
  if (person.location) contactRows.push({ icon: "location-outline", label: "Location", value: person.location })

  const personalRows: InfoRow[] = []
  if (person.birthday) {
    personalRows.push({ icon: "calendar-outline", label: "Birthday", value: formatCompactDate(person.birthday), tone: "purple" })
  }
  if (person.how_met) {
    personalRows.push({
      icon: "people-outline",
      label: person.relationship_type === "Family" ? "Relationship" : "How we met",
      value: person.how_met,
      tone: "amber",
    })
  }
  if (person.relationship_type) {
    personalRows.push({ icon: "heart-outline", label: "Relationship type", value: person.relationship_type, tone: "red" })
  }
  if (person.contact_frequency_days) {
    personalRows.push({ icon: "time-outline", label: "Contact frequency", value: formatFrequency(person.contact_frequency_days), tone: "green" })
  }

  const work = [person.role, person.company].filter(Boolean).join(" at ")
  const hasAdditionalInfo = Boolean(work) || tags.length > 0
  const hasAnything = Boolean(overview) || contactRows.length > 0 || personalRows.length > 0 || hasAdditionalInfo

  if (!hasAnything) {
    return (
      <View className="mt-5">
        <DetailEmptyState title="Nothing here yet" body="Details you add about this person will appear here." />
      </View>
    )
  }

  return (
    <View className="mt-5">
      {overview ? (
        <SectionCard icon="person-outline" title="Overview">
          <Text style={{ fontFamily: fonts.body, color: colors.warmBlack }} className="text-base leading-6">
            {overview}
          </Text>
        </SectionCard>
      ) : null}

      {contactRows.length > 0 ? (
        <SectionCard icon="call-outline" title="Contact information">
          <InfoList rows={contactRows} />
        </SectionCard>
      ) : null}

      {personalRows.length > 0 ? (
        <SectionCard icon="calendar-outline" title="Personal details">
          <InfoList rows={personalRows} />
        </SectionCard>
      ) : null}

      {hasAdditionalInfo ? (
        <SectionCard icon="pricetag-outline" title="Additional info">
          {work ? (
            <View className={tags.length > 0 ? "mb-3" : ""}>
              <Text style={{ fontFamily: fonts.semibold, color: colors.warmBlack }} className="text-sm">
                Work
              </Text>
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-0.5 text-sm">
                {work}
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
          ) : null}
        </SectionCard>
      ) : null}
    </View>
  )
}

export function NotesTab({
  notes,
  onUpdateNote,
  onDeleteNote,
  onAddNote,
}: {
  notes: PersonNote[]
  onUpdateNote: (noteId: string, body: string) => Promise<void>
  onDeleteNote: (noteId: string) => void
  onAddNote: () => void
}) {
  const [menuNoteId, setMenuNoteId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [draftBody, setDraftBody] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  const sortedNotes = [...notes].sort((a, b) =>
    String(b.note_date ?? b.created_at).localeCompare(String(a.note_date ?? a.created_at)),
  )

  function startEditing(note: PersonNote) {
    setMenuNoteId(null)
    setEditingNoteId(note.id)
    setDraftBody(note.body)
  }

  async function saveEdit(noteId: string) {
    if (savingNote || !draftBody.trim()) return
    setSavingNote(true)
    try {
      await onUpdateNote(noteId, draftBody)
      setEditingNoteId(null)
      setDraftBody("")
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <View className="mt-6">
      <Text style={{ fontFamily: fonts.heading, color: colors.forest }} className="mb-4 text-[24px] leading-7">
        Notes ({notes.length})
      </Text>
      {sortedNotes.length > 0 ? (
        <View className="gap-4">
          {sortedNotes.map((note) => {
            const isEditing = editingNoteId === note.id
            const menuOpen = menuNoteId === note.id
            return (
              <SoftCard key={note.id} className="p-4">
                <View className="flex-row items-start justify-between">
                  <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="flex-1 text-base">
                    {formatTimelineDate(note.note_date ?? note.created_at)}
                  </Text>
                  {!isEditing ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Note options"
                      onPress={() => setMenuNoteId(menuOpen ? null : note.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      className="ml-3"
                    >
                      <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {isEditing ? (
                  <>
                    <TextInput
                      accessibilityLabel="Edit note text"
                      value={draftBody}
                      onChangeText={setDraftBody}
                      multiline
                      autoFocus
                      className="mt-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base"
                      style={{
                        fontFamily: fonts.body,
                        color: colors.ink,
                        minHeight: 90,
                        textAlignVertical: "top",
                        lineHeight: 22,
                      }}
                    />
                    <View className="mt-3 flex-row gap-2">
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Cancel editing note"
                        disabled={savingNote}
                        onPress={() => {
                          setEditingNoteId(null)
                          setDraftBody("")
                        }}
                        className="flex-1 items-center rounded-xl border border-stone-200 bg-white py-3"
                      >
                        <Text style={{ fontFamily: fonts.semibold, color: colors.muted }} className="text-sm">
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Save note"
                        disabled={savingNote || !draftBody.trim()}
                        onPress={() => void saveEdit(note.id)}
                        className={`flex-1 items-center rounded-xl py-3 ${savingNote || !draftBody.trim() ? "opacity-50" : ""}`}
                        style={{ backgroundColor: colors.forest }}
                      >
                        <Text style={{ fontFamily: fonts.semibold, color: "white" }} className="text-sm">
                          {savingNote ? "Saving" : "Save"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-base leading-6">
                      {note.body}
                    </Text>
                    {menuOpen ? (
                      <View className="mt-4 flex-row gap-2">
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Edit note"
                          onPress={() => startEditing(note)}
                          className="flex-1 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white py-3"
                        >
                          <Ionicons name="create-outline" size={16} color={colors.forest} style={{ marginRight: 6 }} />
                          <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
                            Edit
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Delete note"
                          onPress={() => {
                            setMenuNoteId(null)
                            onDeleteNote(note.id)
                          }}
                          className="flex-1 flex-row items-center justify-center rounded-xl border border-stone-200 bg-white py-3"
                        >
                          <Ionicons name="trash-outline" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
                          <Text style={{ fontFamily: fonts.semibold, color: "#B91C1C" }} className="text-sm">
                            Delete
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                )}
              </SoftCard>
            )
          })}
        </View>
      ) : (
        <DetailEmptyState title="No notes yet" body="Notes you save about this person will appear here." />
      )}
      <View className="mt-6">
        <Button title="Add Note" onPress={onAddNote} />
      </View>
    </View>
  )
}

export function FollowUpsTab({
  followUps,
  completedFollowUps,
  updating,
  onDelete,
  onComplete,
}: {
  followUps: Interaction[]
  completedFollowUps: Interaction[]
  updating: boolean
  onDelete: (interactionId: string) => void
  onComplete: (interactionId: string) => void
}) {
  const [completedExpanded, setCompletedExpanded] = useState(false)

  return (
    <View className="mt-6">
      {followUps.length > 0 ? (
        <View className="gap-3">
          {followUps.map((fu) => (
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
                  accessibilityLabel={`Delete ${fu.type} follow-up`}
                  disabled={updating}
                  onPress={() => onDelete(fu.id)}
                  className={`flex-1 items-center rounded-xl border border-stone-200 bg-white py-3 ${updating ? "opacity-50" : ""}`}
                >
                  <Text style={{ fontFamily: fonts.semibold, color: "#B91C1C" }} className="text-sm">
                    Delete
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${fu.type} follow-up as complete`}
                  disabled={updating}
                  onPress={() => onComplete(fu.id)}
                  className={`flex-1 items-center rounded-xl py-3 ${updating ? "opacity-50" : ""}`}
                  style={{ backgroundColor: colors.forest }}
                >
                  <Text style={{ fontFamily: fonts.semibold, color: "white" }} className="text-sm">
                    Mark as Complete
                  </Text>
                </TouchableOpacity>
              </View>
            </SoftCard>
          ))}
        </View>
      ) : (
        <DetailEmptyState title="No open follow-ups" body="Open follow-ups from logged interactions will appear here." />
      )}

      {completedFollowUps.length > 0 ? (
        <View className="mt-5">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: completedExpanded }}
            accessibilityLabel={completedExpanded ? "Collapse completed follow-ups" : "Expand completed follow-ups"}
            onPress={() => setCompletedExpanded((value) => !value)}
            className="flex-row items-center justify-between py-2"
          >
            <Text style={{ fontFamily: fonts.semibold, color: colors.muted }} className="text-sm">
              Completed ({completedFollowUps.length})
            </Text>
            <Ionicons name={completedExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
          </TouchableOpacity>

          {completedExpanded ? (
            <View className="mt-2 gap-3">
              {completedFollowUps.map((fu) => (
                <SoftCard key={fu.id} className="p-4 opacity-70">
                  <View className="flex-row items-start">
                    <IconTile icon="checkmark-circle-outline" size={42} background={colors.mint} color={colors.forest} />
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
                </SoftCard>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
