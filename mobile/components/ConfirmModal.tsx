import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native"
import { SoftCard } from "@/components/RootsUI"
import { colors, fonts } from "@/constants/theme"

type ConfirmModalProps = {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  showCancelButton?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  showCancelButton = true,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onCancel}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      >
        <Pressable onPress={() => {}} style={{ width: "100%" }}>
          <SoftCard style={{ borderRadius: 20, padding: 24, margin: 32, backgroundColor: colors.ivory }}>
            <Text
              style={{ fontFamily: fonts.heading, color: colors.warmBlack, fontWeight: "bold", textAlign: "center" }}
              className="text-[22px]"
            >
              {title}
            </Text>
            <Text
              style={{
                fontFamily: fonts.body,
                color: colors.muted,
                marginTop: 8,
                lineHeight: 20,
                textAlign: "center",
              }}
              className="text-sm"
            >
              {message}
            </Text>
            <View style={{ marginTop: 20, gap: 10 }}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                onPress={onConfirm}
                activeOpacity={0.8}
                style={{
                  height: 44,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: destructive ? colors.error : colors.forest,
                }}
              >
                <Text style={{ fontFamily: fonts.semibold, color: "#FFFFFF" }} className="text-base">
                  {confirmLabel}
                </Text>
              </TouchableOpacity>
              {showCancelButton ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={cancelLabel}
                  onPress={onCancel}
                  activeOpacity={0.8}
                  style={{
                    height: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontFamily: fonts.medium, color: colors.ink }} className="text-base">
                    {cancelLabel}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </SoftCard>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
