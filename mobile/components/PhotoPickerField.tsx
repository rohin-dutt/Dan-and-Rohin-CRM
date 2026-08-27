import { useState } from "react"
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, fonts } from "@/constants/theme"
import { pickCompressedPhoto } from "@/lib/photo-upload"

// Optional photo attachment for the log-interaction forms: an "Add a photo"
// button that runs the pick + compress flow, then a small removable thumbnail
// of the local (not yet uploaded) image.
export function PhotoPickerField({
  photoUri,
  onChange,
}: {
  photoUri: string | null
  onChange: (uri: string | null) => void
}) {
  const [picking, setPicking] = useState(false)

  async function handlePick() {
    if (picking) return
    setPicking(true)
    try {
      const uri = await pickCompressedPhoto()
      if (uri) onChange(uri)
    } catch {
      // Cancel/permission cases resolve null; anything else is best-effort.
    } finally {
      setPicking(false)
    }
  }

  if (photoUri) {
    return (
      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        <View>
          <Image
            source={{ uri: photoUri }}
            style={{ width: 72, height: 72, borderRadius: 12 }}
            accessibilityLabel="Attached photo preview"
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            onPress={() => onChange(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.warmBlack,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Add a photo"
      onPress={() => void handlePick()}
      disabled={picking}
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        marginBottom: 20,
        paddingVertical: 6,
        opacity: picking ? 0.6 : 1,
      }}
    >
      {picking ? (
        <ActivityIndicator size="small" color={colors.forest} style={{ marginRight: 8 }} />
      ) : (
        <Ionicons name="camera-outline" size={18} color={colors.forest} style={{ marginRight: 8 }} />
      )}
      <Text style={{ fontFamily: fonts.medium, color: colors.forest, fontSize: 14 }}>
        Add a photo (optional)
      </Text>
    </TouchableOpacity>
  )
}
