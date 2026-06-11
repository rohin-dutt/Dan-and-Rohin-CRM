import { useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import { Divider, IconTile } from "@/components/RootsUI"
import { BottomSheetModal } from "@/components/BottomSheetModal"
import { QuickAddFormSheet, type QuickAddMode } from "@/features/quick-add/QuickAddFormSheet"

export function QuickAddMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter()
  const [pickerMode, setPickerMode] = useState<QuickAddMode | null>(null)

  function openForm(mode: QuickAddMode) {
    onClose()
    setPickerMode(mode)
  }

  return (
    <>
      {/* ── Action sheet ──────────────────────────────────────────── */}
      <BottomSheetModal
        visible={visible}
        onClose={onClose}
        animationType="fade"
        backdropOpacity={0.45}
        avoidKeyboard={false}
        accessibilityLabel="Dismiss quick add menu"
      >
        <View className="px-6 pt-6">
          <View className="mb-8 items-center">
            <View className="h-1.5 w-24 rounded-full bg-stone-200" />
          </View>
          <QuickAddAction
            icon="person-outline"
            label="Add someone new"
            description="Add someone new to your Roots"
            color={colors.forest}
            background={colors.mint}
            onPress={() => {
              onClose()
              router.push("/people/new")
            }}
          />
          <Divider />
          <QuickAddAction
            icon="chatbubble-outline"
            label="Log interaction"
            description="Log a chat, call, or meeting"
            color="#98520B"
            background="#FBF1E9"
            onPress={() => openForm("chat")}
          />
          <Divider />
          <QuickAddAction
            icon="pencil-outline"
            label="Add note"
            description="Save a note about someone"
            color={colors.purple}
            background="#F2EEFA"
            onPress={() => openForm("note")}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cancel quick add"
            onPress={onClose}
            activeOpacity={0.8}
            className="mt-8 min-h-16 items-center justify-center rounded-2xl bg-stone-100"
          >
            <Text style={{ fontFamily: fonts.bold, color: colors.forest }} className="text-xl">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

      {/* ── Single-step form modal ─────────────────────────────────── */}
      <QuickAddFormSheet mode={pickerMode} onClose={() => setPickerMode(null)} />
    </>
  )
}

function QuickAddAction({
  icon,
  label,
  description,
  color,
  background,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  description: string
  color: string
  background: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      activeOpacity={0.76}
      className="min-h-20 flex-row items-center py-4"
    >
      <IconTile icon={icon} color={color} background={background} size={52} />
      <View className="ml-4 flex-1">
        <Text style={{ fontFamily: fonts.bold, color: colors.ink }} className="text-[17px]">
          {label}
        </Text>
        <Text style={{ fontFamily: fonts.body, color: colors.muted }} className="mt-1 text-sm">
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
