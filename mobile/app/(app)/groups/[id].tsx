import { useRef, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Screen } from "@/components/Screen"
import { PersonAvatar } from "@/components/RootsUI"
import { ConfirmModal } from "@/components/ConfirmModal"
import { LoadingState } from "@/components/LoadingState"
import { ErrorBanner } from "@/components/ErrorBanner"
import { BottomSheetModal } from "@/components/BottomSheetModal"
import { colors, fonts } from "@/constants/theme"
import { TimelineTab } from "@/features/person-detail/tabs"
import { GroupAvatarStack } from "@/features/groups/GroupAvatarStack"
import { GroupHangoutSheet } from "@/features/groups/GroupHangoutSheet"
import { PeopleMultiSelect } from "@/features/groups/PeopleMultiSelect"
import { useGroupDetail } from "@/features/groups/use-group-detail"

const GROUP_TABS = ["Timeline", "Members"] as const
type GroupTab = (typeof GROUP_TABS)[number]

export default function GroupDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<GroupTab>("Timeline")
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const menuButtonRef = useRef<View>(null)
  const [hangoutVisible, setHangoutVisible] = useState(false)
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false)
  const [editMembersVisible, setEditMembersVisible] = useState(false)
  const [editIds, setEditIds] = useState<string[]>([])
  const [savingMembers, setSavingMembers] = useState(false)

  const {
    loading,
    error,
    group,
    members,
    memberIds,
    timelineInteractions,
    deleteGroup,
    saveMembers,
  } = useGroupDetail(id)

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

  function openEditMembers() {
    setEditIds(memberIds)
    setEditMembersVisible(true)
  }

  function toggleEditPerson(personId: string) {
    setEditIds((current) =>
      current.includes(personId)
        ? current.filter((existing) => existing !== personId)
        : [...current, personId],
    )
  }

  async function handleSaveMembers() {
    if (savingMembers) return
    setSavingMembers(true)
    try {
      const saved = await saveMembers(editIds)
      if (saved) setEditMembersVisible(false)
    } finally {
      setSavingMembers(false)
    }
  }

  async function handleConfirmDelete() {
    setConfirmDeleteVisible(false)
    const deleted = await deleteGroup()
    if (deleted) router.back()
  }

  if (loading) return <LoadingState />

  if (!group) {
    return (
      <Screen>
        <ErrorBanner message={error ?? "Group not found"} />
      </Screen>
    )
  }

  const countLabel = members.length === 1 ? "1 person" : `${members.length} people`

  return (
    <Screen scrollable={false}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
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
                accessibilityLabel="Open group actions"
                onPress={showMenu}
                className="h-10 w-10 items-end justify-center"
              >
                <Ionicons name="ellipsis-vertical" size={22} color={colors.warmBlack} />
              </TouchableOpacity>
            </View>
          </View>

          {error != null && <ErrorBanner message={error} />}

          {/* Header */}
          <View className="mt-5">
            <Text
              style={{ fontFamily: fonts.heading, color: colors.forest }}
              className="text-[34px] leading-[38px]"
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={2}
            >
              {group.name}
            </Text>
            <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-base leading-5">
              {countLabel}
            </Text>
            {members.length > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Show group members"
                onPress={() => setActiveTab("Members")}
                activeOpacity={0.78}
                className="mt-4 flex-row items-center"
              >
                <GroupAvatarStack people={members} size={40} max={4} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Tabs (same visual pattern as the person detail tab bar) */}
          <View className="mt-5 border-b border-stone-200">
            <View className="flex-row">
              {GROUP_TABS.map((tab) => {
                const isActive = activeTab === tab
                return (
                  <TouchableOpacity
                    key={tab}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${tab} tab`}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.78}
                    className="flex-1 items-center px-1 pb-3"
                  >
                    <Text
                      style={{
                        fontFamily: isActive ? fonts.semibold : fonts.medium,
                        color: isActive ? colors.forest : colors.muted,
                      }}
                      className="text-[15px]"
                      numberOfLines={1}
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

          {activeTab === "Timeline" ? (
            <TimelineTab interactions={timelineInteractions} notes={[]} firstName={group.name} />
          ) : null}

          {activeTab === "Members" ? (
            <View className="mt-6">
              {members.length === 0 ? (
                <View className="rounded-2xl border border-stone-200 bg-white p-5">
                  <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} className="text-base">
                    No members yet
                  </Text>
                  <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-2 text-sm leading-5">
                    Add people to this group to start logging hangouts together.
                  </Text>
                </View>
              ) : (
                <View className="rounded-2xl border border-stone-200 bg-white px-4">
                  {members.map((member, index) => (
                    <TouchableOpacity
                      key={member.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${member.name}`}
                      onPress={() => router.push(`/people/${member.id}`)}
                      activeOpacity={0.76}
                      className={`flex-row items-center py-3 ${index < members.length - 1 ? "border-b border-stone-100" : ""}`}
                    >
                      <PersonAvatar name={member.name} size={44} photoPath={member.photo_path ?? null} />
                      <View className="ml-3 flex-1">
                        <Text style={{ fontFamily: fonts.semibold, color: colors.ink }} numberOfLines={1} className="text-base">
                          {member.name}
                        </Text>
                        {member.relationship_type ? (
                          <Text style={{ fontFamily: fonts.body, color: colors.muted }} numberOfLines={1} className="mt-0.5 text-xs">
                            {member.relationship_type}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Edit members"
                onPress={openEditMembers}
                className="mt-4 min-h-11 flex-row items-center justify-center rounded-2xl border bg-white"
                style={{ borderColor: colors.forest }}
              >
                <Ionicons name="person-add-outline" size={16} color={colors.forest} style={{ marginRight: 7 }} />
                <Text style={{ fontFamily: fonts.semibold, color: colors.forest }} className="text-sm">
                  Edit members
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Floating action bar — same style as the person detail "Log a chat" */}
      <View
        className="border-t border-stone-200 px-5 pt-3 pb-2"
        style={{ backgroundColor: colors.ivory }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Log group hangout"
          onPress={() => setHangoutVisible(true)}
          activeOpacity={0.8}
          className="min-h-12 flex-row items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.forest }}
        >
          <Ionicons name="chatbubbles-outline" size={17} color="#FFFFFF" style={{ marginRight: 7 }} />
          <Text style={{ fontFamily: fonts.semibold, color: "#FFFFFF" }} className="text-base">
            Log group hangout
          </Text>
        </TouchableOpacity>
      </View>

      <GroupHangoutSheet
        visible={hangoutVisible}
        onClose={() => setHangoutVisible(false)}
        groupId={group.id}
        members={members}
      />

      {/* Edit members sheet */}
      <BottomSheetModal
        visible={editMembersVisible}
        onClose={() => setEditMembersVisible(false)}
        backdropOpacity={0.3}
        sheetStyle={{ maxHeight: "90%" }}
        accessibilityLabel="Dismiss edit members"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 }}
        >
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View style={{ height: 6, width: 96, borderRadius: 3, backgroundColor: "#E7E5E4" }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 20, flex: 1 }}>
              Edit members
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setEditMembersVisible(false)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#F5F5F4",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={18} color={colors.warmBlack} />
            </TouchableOpacity>
          </View>

          <PeopleMultiSelect selectedIds={editIds} onToggle={toggleEditPerson} />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Save members"
            onPress={() => void handleSaveMembers()}
            disabled={savingMembers}
            activeOpacity={0.8}
            style={{
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              backgroundColor: colors.forest,
              opacity: savingMembers ? 0.7 : 1,
              marginTop: 20,
            }}
          >
            {savingMembers ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ fontFamily: fonts.bold, color: "white", fontSize: 16 }}>Save members</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </BottomSheetModal>

      {/* 3-dot menu */}
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
              accessibilityLabel="Edit members"
              onPress={() => {
                setMenuVisible(false)
                openEditMembers()
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
              <Ionicons name="person-add-outline" size={17} color={colors.forest} style={{ marginRight: 10 }} />
              <Text style={{ fontFamily: fonts.medium, color: colors.forest, fontSize: 14 }}>Edit members</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Delete group"
              onPress={() => {
                setMenuVisible(false)
                setConfirmDeleteVisible(true)
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 13,
              }}
            >
              <Ionicons name="trash-outline" size={17} color={colors.error} style={{ marginRight: 10 }} />
              <Text style={{ fontFamily: fonts.medium, color: colors.error, fontSize: 14 }}>Delete group</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmModal
        visible={confirmDeleteVisible}
        title={`Delete ${group.name}?`}
        message="This will remove the group but your people and their interaction history will be preserved."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </Screen>
  )
}
