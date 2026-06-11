import { Text, TouchableOpacity, View } from "react-native"
import { colors, fonts } from "@/constants/theme"
import { Button } from "@/components/Button"
import { Divider, IconTile, SoftCard } from "@/components/RootsUI"
import { formatDate } from "@roots/shared"
import { formatCompactDate, formatTimelineDate } from "@/lib/format-dates"
import { formatFrequency } from "@/constants/frequencies"
import { DetailEmptyState, InfoList, SectionCard, TagPill, type InfoRow } from "./components"
import { interactionIcon } from "./helpers"
import type { Interaction, ImportantMoment, Person, PersonNote, Tag } from "@/types"

export function TimelineTab({
  interactions,
  onViewAll,
  onLogInteraction,
  onAddNote,
}: {
  interactions: Interaction[]
  onViewAll: () => void
  onLogInteraction: () => void
  onAddNote: () => void
}) {
  return (
    <View className="mt-6">
      {interactions.length > 0 ? (
        <View>
          {interactions.slice(0, 6).map((interaction, index) => (
            <View key={interaction.id} className="flex-row">
              <View className="items-center">
                <IconTile icon={interactionIcon(interaction.type)} size={44} />
                {index < Math.min(interactions.length, 6) - 1 ? <View className="w-px flex-1 bg-stone-200" /> : null}
              </View>
              <View className="ml-4 flex-1 pb-6">
                <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="text-base">
                  {formatTimelineDate(interaction.date)}  ·  {interaction.type}
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
            onPress={onViewAll}
            className="py-4"
          >
            <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-base">
              View all interactions
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <DetailEmptyState title="No interactions yet" body="Log a call, text, or meeting to start this contact's timeline." />
      )}

      <View className="mt-5 flex-row gap-3">
        <View className="flex-1">
          <Button title="Log Interaction" onPress={onLogInteraction} />
        </View>
        <View className="flex-1">
          <Button title="Add Note" onPress={onAddNote} variant="secondary" />
        </View>
      </View>
    </View>
  )
}

export function AboutTab({
  person,
  tags,
  importantMoments,
  onEdit,
}: {
  person: Person
  tags: Tag[]
  importantMoments: ImportantMoment[]
  onEdit: () => void
}) {
  const contactRows: InfoRow[] = []
  if (person.email) contactRows.push({ icon: "mail-outline", label: "Email", value: person.email, actionIcon: "mail-outline" })
  if (person.phone) contactRows.push({ icon: "call-outline", label: "Phone", value: person.phone, actionIcon: "chatbubble-outline" })
  if (person.location) contactRows.push({ icon: "location-outline", label: "Location", value: person.location, actionIcon: "map-outline" })

  const personalRows: InfoRow[] = []
  if (person.birthday) personalRows.push({ icon: "calendar-outline", label: "Birthday", value: formatCompactDate(person.birthday), actionIcon: "chevron-forward", tone: "purple" })
  importantMoments.forEach((moment) => {
    personalRows.push({
      icon: "sparkles-outline",
      label: moment.label,
      value: `${formatCompactDate(moment.date)}${moment.recurs_yearly ? " - yearly" : ""}`,
      actionIcon: "chevron-forward",
      tone: "green",
    })
  })
  if (person.how_met) personalRows.push({ icon: "people-outline", label: "How we met", value: person.how_met, actionIcon: "chevron-forward", tone: "amber" })
  if (person.relationship_type) personalRows.push({ icon: "heart-outline", label: "Relationship type", value: person.relationship_type, actionIcon: "chevron-forward", tone: "red" })
  personalRows.push({ icon: "time-outline", label: "Contact frequency", value: formatFrequency(person.contact_frequency_days), actionIcon: "chevron-forward", tone: "amber" })

  return (
    <View className="mt-5">
      <SectionCard icon="person-outline" title="Overview" onEdit={onEdit}>
        <Text style={{ fontFamily: fonts.body, color: colors.warmBlack }} className="text-base leading-6">
          {person.notes?.trim() || "No overview notes added yet."}
        </Text>
      </SectionCard>

      <SectionCard icon="call-outline" title="Contact information" onEdit={onEdit}>
        <InfoList rows={contactRows} />
      </SectionCard>

      <SectionCard icon="calendar-outline" title="Personal details" onEdit={onEdit}>
        <InfoList rows={personalRows} />
      </SectionCard>

      <SectionCard icon="pricetag-outline" title="Additional info" onEdit={onEdit}>
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
  )
}

export function NotesTab({
  notes,
  onEditNote,
  onDeleteNote,
  onAddNote,
}: {
  notes: PersonNote[]
  onEditNote: (note: PersonNote) => void
  onDeleteNote: (noteId: string) => void
  onAddNote: () => void
}) {
  return (
    <View className="mt-6">
      <Text style={{ fontFamily: fonts.heading, color: colors.forest }} className="mb-4 text-[24px] leading-7">
        Notes ({notes.length})
      </Text>
      {notes.length > 0 ? (
        <View className="gap-4">
          {notes.map((note) => (
            <SoftCard key={note.id} className="p-4">
              <View className="flex-row items-center">
                <IconTile icon="document-text-outline" size={58} />
                <View className="ml-4 flex-1">
                  <Text style={{ fontFamily: fonts.bold, color: colors.warmBlack }} className="text-base">
                    {formatTimelineDate(note.note_date ?? note.created_at)}
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
                  onPress={() => onEditNote(note)}
                  className="flex-1 items-center rounded-xl border border-stone-200 bg-white py-3"
                >
                  <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
                    Edit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Delete note"
                  onPress={() => onDeleteNote(note.id)}
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
  updating,
  onSnooze,
  onDone,
}: {
  followUps: Interaction[]
  updating: boolean
  onSnooze: (interactionId: string) => void
  onDone: (interactionId: string) => void
}) {
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
                  accessibilityLabel={`Snooze ${fu.type} follow-up for 7 days`}
                  disabled={updating}
                  onPress={() => onSnooze(fu.id)}
                  className={`flex-1 items-center rounded-xl border border-stone-200 bg-white py-3 ${updating ? "opacity-50" : ""}`}
                >
                  <Text style={{ fontFamily: fonts.semibold, color: colors.muted }} className="text-sm">
                    Snooze 7d
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${fu.type} follow-up done`}
                  disabled={updating}
                  onPress={() => onDone(fu.id)}
                  className={`flex-1 items-center rounded-xl py-3 ${updating ? "opacity-50" : ""}`}
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
        <DetailEmptyState title="No open follow-ups" body="Open follow-ups from logged interactions will appear here." />
      )}
    </View>
  )
}
