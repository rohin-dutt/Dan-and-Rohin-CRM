import { useRef, useState } from "react"
import { Alert, Modal, Pressable, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Screen } from "@/components/Screen"
import { PersonAvatar } from "@/components/RootsUI"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { personImageUrl } from "@/lib/person-display"
import { formatDaysAgo } from "@/lib/format-dates"
import { colors, fonts } from "@/constants/theme"
import { getNextDueDays } from "@roots/shared"
import { StatStrip, TabBar, TagPill, type ProfileTab } from "@/features/person-detail/components"
import { AboutTab, FollowUpsTab, NotesTab, TimelineTab } from "@/features/person-detail/tabs"
import { formatNextAction } from "@/features/person-detail/helpers"
import { usePersonDetail } from "@/features/person-detail/use-person-detail"
import type { PersonNote } from "@/types"

export default function PersonDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<ProfileTab>("Timeline")
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
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
          if (deleted) router.back()
        },
      },
    ])
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
        onPress: () => void deletePersonNote(noteId),
      },
    ])
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
            onPress={() => router.back()}
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
          nextAction={formatNextAction(nextDueDays)}
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
    </Screen>
  )
}
