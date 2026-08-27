import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import { supabase } from "@/lib/supabase"
import { BottomSheetModal } from "@/components/BottomSheetModal"
import { DatePickerModal } from "@/components/DatePickerModal"
import { PhotoPickerField } from "@/components/PhotoPickerField"
import { PillButton } from "@/components/PillButton"
import { attachInteractionPhoto } from "@/lib/photo-upload"
import { formatFullDate, toLocalDateString } from "@roots/shared"
import { logGroupHangout } from "@/lib/group-data"
import type { Person } from "@/types"

const HANGOUT_INTERACTION_TYPES = ["Text / Email", "Call", "In Person"] as const
type HangoutInteractionType = (typeof HANGOUT_INTERACTION_TYPES)[number]

// "Log group hangout" sheet: the same form as QuickAddFormSheet's chat mode,
// but with no person picker — all current group members are included and
// shown on a read-only "With:" line.
export function GroupHangoutSheet({
  visible,
  onClose,
  groupId,
  members,
}: {
  visible: boolean
  onClose: () => void
  groupId: string
  members: Person[]
}) {
  const [interactionType, setInteractionType] = useState<HangoutInteractionType>("In Person")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [interactionNotes, setInteractionNotes] = useState("")
  const [followUpEnabled, setFollowUpEnabled] = useState(false)
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null)
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false)
  const [followUpNote, setFollowUpNote] = useState("")
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    setInteractionType("In Person")
    setSelectedDate(new Date())
    setShowDatePicker(false)
    setInteractionNotes("")
    setFollowUpEnabled(false)
    setFollowUpDate(null)
    setShowFollowUpPicker(false)
    setFollowUpNote("")
    setPhotoUri(null)
    setSaving(false)
    setFormError(null)
  }, [visible])

  // Backdrop taps dismiss the open inline date picker first; only when it is
  // closed do they close the whole sheet (same behavior as QuickAddFormSheet).
  function handleSheetDismiss() {
    if (showDatePicker) {
      setShowDatePicker(false)
      return
    }
    onClose()
  }

  async function handleSave() {
    if (saving) return
    if (members.length === 0) {
      setFormError("This group has no members yet")
      return
    }
    if (followUpEnabled && !followUpDate) {
      setFormError("Follow-up date is required when a follow-up is set")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const { firstInteractionId } = await logGroupHangout({
        groupId,
        personIds: members.map((member) => member.id),
        type: interactionType,
        date: toLocalDateString(selectedDate),
        notes: interactionNotes.trim() || null,
        followUpNeeded: followUpEnabled,
        followUpDate: followUpEnabled && followUpDate ? toLocalDateString(followUpDate) : null,
        followUpNote: followUpEnabled ? followUpNote.trim() || null : null,
      })

      // One photo per hangout, attached to the first created row only; a
      // failed upload never fails the saved hangout.
      let photoAttached = true
      if (photoUri && firstInteractionId) {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        photoAttached = session
          ? await attachInteractionPhoto(session.user.id, firstInteractionId, photoUri)
          : false
      }

      onClose()
      if (!photoAttached) {
        Alert.alert("Photo not attached", "Your hangout was saved, but the photo could not be uploaded.")
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheetModal
      visible={visible}
      onClose={handleSheetDismiss}
      backdropOpacity={0.3}
      sheetStyle={{ maxHeight: "90%" }}
      accessibilityLabel="Dismiss group hangout form"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}
      >
        {/* Handle */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <View style={{ height: 6, width: 96, borderRadius: 3, backgroundColor: "#E7E5E4" }} />
        </View>

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontFamily: fonts.bold, color: colors.ink, fontSize: 20, flex: 1 }}>
            How&apos;d it go?
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
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

        {formError ? (
          <Text
            style={{
              fontFamily: fonts.body,
              color: "#B91C1C",
              fontSize: 13,
              backgroundColor: "#FEF2F2",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 16,
            }}
          >
            {formError}
          </Text>
        ) : null}

        {/* Members — read-only confirmation line */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            backgroundColor: colors.mint,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 20,
          }}
        >
          <Ionicons name="people-outline" size={16} color={colors.forest} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={{ fontFamily: fonts.medium, color: colors.forest, fontSize: 14, flex: 1 }}>
            With: {members.map((member) => member.name).join(", ")}
          </Text>
        </View>

        <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 14, marginBottom: 10 }}>
          How did you connect?
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {HANGOUT_INTERACTION_TYPES.map((type) => (
            <PillButton
              key={type}
              label={type}
              selected={interactionType === type}
              onPress={() => setInteractionType(type)}
            />
          ))}
        </View>

        <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 14, marginBottom: 8 }}>
          When?
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Select date"
          onPress={() => setShowDatePicker((v) => !v)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 44,
            borderWidth: 1,
            borderColor: showDatePicker ? colors.forest : "#E7E5E4",
            borderRadius: 12,
            paddingHorizontal: 14,
            backgroundColor: "white",
            marginBottom: showDatePicker ? 0 : 20,
          }}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.forest} style={{ marginRight: 8 }} />
          <Text style={{ fontFamily: fonts.body, color: colors.ink, fontSize: 14, flex: 1 }}>
            {formatFullDate(selectedDate)}
          </Text>
          <Ionicons name={showDatePicker ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
        </TouchableOpacity>

        {showDatePicker ? (
          <View
            style={{
              borderWidth: 1,
              borderTopWidth: 0,
              borderColor: colors.forest,
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              backgroundColor: "white",
              overflow: "hidden",
              marginBottom: 20,
            }}
          >
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              themeVariant="light"
              textColor={colors.ink}
              onChange={(_, date) => {
                if (date) setSelectedDate(date)
              }}
              minimumDate={new Date(new Date().getFullYear() - 100, 0, 1)}
              maximumDate={new Date()}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Done selecting date"
              onPress={() => setShowDatePicker(false)}
              style={{ alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 12 }}
            >
              <Text style={{ fontFamily: fonts.bold, color: colors.forest, fontSize: 15 }}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 14, marginBottom: 8 }}>
          What did you talk about? (optional)
        </Text>
        <TextInput
          value={interactionNotes}
          onChangeText={setInteractionNotes}
          placeholder="Topics, updates, anything worth noting…"
          placeholderTextColor="#9CA3AF"
          multiline
          blurOnSubmit
          returnKeyType="done"
          onSubmitEditing={() => Keyboard.dismiss()}
          numberOfLines={3}
          style={{
            fontFamily: fonts.body,
            color: colors.ink,
            fontSize: 14,
            borderWidth: 1,
            borderColor: "#E7E5E4",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 11,
            backgroundColor: "white",
            minHeight: 84,
            textAlignVertical: "top",
            marginBottom: 20,
          }}
        />

        <PhotoPickerField photoUri={photoUri} onChange={setPhotoUri} />

        {/* Follow-up section */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#F5F4F2",
            paddingTop: 16,
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 14 }}>
                Remind me to reach out
              </Text>
              <Text style={{ fontFamily: fonts.body, color: colors.muted, fontSize: 12, marginTop: 2 }}>
                Remind yourself to follow up with everyone in this group
              </Text>
            </View>
            <Switch
              value={followUpEnabled}
              onValueChange={(value) => {
                setFollowUpEnabled(value)
                if (!value) {
                  setShowFollowUpPicker(false)
                  setFollowUpNote("")
                }
              }}
              trackColor={{ false: "#D6D3D1", true: colors.forest }}
              thumbColor="#FFFFFF"
            />
          </View>

          {followUpEnabled ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Select follow-up date"
              onPress={() => setShowFollowUpPicker(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                height: 44,
                borderWidth: 1,
                borderColor: "#E7E5E4",
                borderRadius: 12,
                paddingHorizontal: 14,
                backgroundColor: "white",
                marginTop: 14,
              }}
            >
              <Ionicons name="flag-outline" size={16} color={colors.forest} style={{ marginRight: 8 }} />
              <Text style={{ fontFamily: fonts.body, color: followUpDate ? colors.ink : "#9CA3AF", fontSize: 14, flex: 1 }}>
                {followUpDate ? formatFullDate(followUpDate) : "Select follow-up date"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : null}

          {followUpEnabled ? (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontFamily: fonts.medium, color: colors.ink, fontSize: 14, marginBottom: 8 }}>
                Follow-up note (optional)
              </Text>
              <TextInput
                value={followUpNote}
                onChangeText={setFollowUpNote}
                placeholder="What do you want to remember to ask or do?"
                placeholderTextColor="#9CA3AF"
                multiline
                blurOnSubmit
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                numberOfLines={3}
                style={{
                  fontFamily: fonts.body,
                  color: colors.ink,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: "#E7E5E4",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  backgroundColor: "white",
                  minHeight: 84,
                  textAlignVertical: "top",
                }}
              />
            </View>
          ) : null}
        </View>

        <DatePickerModal
          visible={showFollowUpPicker}
          title="Select follow-up date"
          date={followUpDate}
          minimumDate={new Date()}
          onConfirm={(picked) => {
            setFollowUpDate(picked)
            setShowFollowUpPicker(false)
          }}
          onCancel={() => setShowFollowUpPicker(false)}
        />

        {/* Save button */}
        <TouchableOpacity
          onPress={() => void handleSave()}
          disabled={saving}
          activeOpacity={0.8}
          style={{
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            backgroundColor: colors.forest,
            opacity: saving ? 0.7 : 1,
            marginBottom: 4,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={{ fontFamily: fonts.bold, color: "white", fontSize: 16 }}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </BottomSheetModal>
  )
}
