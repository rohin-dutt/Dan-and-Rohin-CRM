import { useRef, useState } from "react"
import { Alert, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Screen } from "@/components/Screen"
import { PersonAvatar } from "@/components/RootsUI"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { personImageUrl } from "@/lib/person-display"
import { safeBack } from "@/lib/navigation"
import { formatDaysAgo } from "@/lib/format-dates"
import { colors, fonts } from "@/constants/theme"
import { getNextDueDays } from "@roots/shared"
import { StatStrip, TabBar, TagPill, type ProfileTab } from "@/features/person-detail/components"
import { AboutTab, FollowUpsTab, NotesTab, TimelineTab } from "@/features/person-detail/tabs"
import { formatCadenceAction } from "@/features/person-detail/helpers"
import { usePersonDetail } from "@/features/person-detail/use-person-detail"
import type { PersonNote } from "@/types"

export default function PersonDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<ProfileTab>("Timeline")
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [editingNote, setEditingNote] = useState<PersonNote | null>(null)
  const [editingNoteBody, setEditingNoteBody] = useState("")
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const menuButtonRef = useRef<View>(null)

  const {
    loading,
    error,
    person,
    personNotes,
    importantMoments,
    tags,
    openFollowUps,
    touchPointInteractions,
    followUpUpdating,
    deletePerson,
    markFollowUpDone,
    snoozeFollowUp,
    updatePersonNote,
    deletePersonNote,
  } = usePersonDetail(id)

  function showMenu() {
    if (menuVisible) {
      setMenuVisible(false)
      return
    }
    menuButtonRef.current?.measure((_, __, ___, height, pageX, pageY) => {
      setMenuPos({ x: pageX, y: pageY + height })
      setMenuVisible(true)
    })
  }

  function confirmDeletePerson() {
    Alert.alert("Delete person", `Delete ${person?.name}? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const deleted = await deletePerson()
          if (deleted) safeBack(router, "/people")
        },
      },
    ])
  }

  function promptEditNote(note: PersonNote) {
    setEditingNote(note)
    setEditingNoteBody(note.body)
  }

  function confirmDeleteNote(noteId: string) {
    setDeletingNoteId(noteId)
  }

  async function saveEditedNote() {
    if (!editingNote) return
    const body = editingNoteBody.trim()
    if (!body) return
    const noteId = editingNote.id
    setEditingNote(null)
    setEditingNoteBody("")
    await updatePersonNote(noteId, body)
  }

  async function deleteSelectedNote() {
    if (!deletingNoteId) return
    const noteId = deletingNoteId
    setDeletingNoteId(null)
    await deletePersonNote(noteId)
  }

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

  return (
    <Screen>
      <View className="px-5 pt-4 pb-8">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => safeBack(router, "/people")}
            className="h-10 w-10 items-start justify-center"
          >
            <Ionicons name="arrow-back" size={26} color={colors.warmBlack} />
          </TouchableOpacity>
          <View ref={menuButtonRef}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open contact actions"
              onPress={showMenu}
              className="h-10 w-10 items-end justify-center"
            >
              <Ionicons name="ellipsis-vertical" size={22} color={colors.warmBlack} />
            </TouchableOpacity>
          </View>
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
          lastTalked={formatDaysAgo(person.last_contacted_at)}
          nextAction={formatCadenceAction(nextDueDays)}
          interactionsCount={touchPointInteractions.length}
          openFollowUpsCount={openFollowUps.length}
        />

        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "Timeline" ? (
          <TimelineTab
            interactions={touchPointInteractions}
            onViewAll={() => router.push(`/people/${id}/log`)}
            onLogInteraction={() => router.push(`/people/${id}/log`)}
            onAddNote={() => router.push(`/people/${id}/log?action=note`)}
          />
        ) : null}

        {activeTab === "About" ? (
          <AboutTab
            person={person}
            tags={tags}
            importantMoments={importantMoments}
            onEdit={() => router.push(`/people/${id}/edit`)}
          />
        ) : null}

        {activeTab === "Notes" ? (
          <NotesTab
            notes={personNotes}
            onEditNote={promptEditNote}
            onDeleteNote={confirmDeleteNote}
            onAddNote={() => router.push(`/people/${id}/log?action=note`)}
          />
        ) : null}

        {activeTab === "Follow-ups" ? (
          <FollowUpsTab
            followUps={openFollowUps}
            updating={followUpUpdating}
            onSnooze={(interactionId) => void snoozeFollowUp(interactionId)}
            onDone={(interactionId) => void markFollowUpDone(interactionId)}
          />
        ) : null}
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setMenuVisible(false)}>
          <Pressable
            style={{
              position: "absolute",
              top: menuPos.y + 4,
              right: 20,
              backgroundColor: "white",
              borderRadius: 12,
              minWidth: 180,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 8,
              overflow: "hidden",
            }}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Edit person"
              onPress={() => {
                setMenuVisible(false)
                router.push(`/people/${id}/edit`)
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 13,
                borderBottomWidth: 1,
                borderBottomColor: "#F5F4F2",
              }}
            >
              <Ionicons name="create-outline" size={17} color={colors.forest} style={{ marginRight: 10 }} />
              <Text style={{ fontFamily: fonts.medium, color: colors.forest, fontSize: 14 }}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Delete person"
              onPress={() => {
                setMenuVisible(false)
                confirmDeletePerson()
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 13,
              }}
            >
              <Ionicons name="trash-outline" size={17} color={colors.error} style={{ marginRight: 10 }} />
              <Text style={{ fontFamily: fonts.medium, color: colors.error, fontSize: 14 }}>Delete</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {editingNote != null ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setEditingNote(null)}
        >
          <View className="flex-1 justify-center bg-black/35 px-5">
            <View className="rounded-2xl bg-white p-5">
              <Text style={{ fontFamily: fonts.heading, color: colors.forest }} className="text-2xl">
                Edit note
              </Text>
              <TextInput
                accessibilityLabel="Note body"
                value={editingNoteBody}
                onChangeText={setEditingNoteBody}
                multiline
                className="mt-4 min-h-32 rounded-xl border border-stone-200 px-4 py-3 text-base text-warm-black"
                textAlignVertical="top"
              />
              <View className="mt-5 flex-row gap-3">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Cancel edit note"
                  onPress={() => setEditingNote(null)}
                  className="flex-1 items-center rounded-xl border border-stone-200 py-3"
                >
                  <Text style={{ fontFamily: fonts.semibold, color: colors.muted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Save edited note"
                  onPress={() => void saveEditedNote()}
                  className="flex-1 items-center rounded-xl bg-forest py-3"
                >
                  <Text style={{ fontFamily: fonts.semibold, color: "white" }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {deletingNoteId != null ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setDeletingNoteId(null)}
        >
          <View className="flex-1 justify-center bg-black/35 px-5">
            <View className="rounded-2xl bg-white p-5">
              <Text style={{ fontFamily: fonts.heading, color: colors.forest }} className="text-2xl">
                Delete note?
              </Text>
              <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-base">
                This note will be permanently removed.
              </Text>
              <View className="mt-5 flex-row gap-3">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Cancel delete note"
                  onPress={() => setDeletingNoteId(null)}
                  className="flex-1 items-center rounded-xl border border-stone-200 py-3"
                >
                  <Text style={{ fontFamily: fonts.semibold, color: colors.muted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Confirm delete note"
                  onPress={() => void deleteSelectedNote()}
                  className="flex-1 items-center rounded-xl bg-red-700 py-3"
                >
                  <Text style={{ fontFamily: fonts.semibold, color: "white" }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </Screen>
  )
}
