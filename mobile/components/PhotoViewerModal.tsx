import { useEffect, useState } from "react"
import { ActivityIndicator, Image, Modal, Text, TouchableOpacity, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { fonts } from "@/constants/theme"
import { getSignedPhotoUrl } from "@/lib/photo-upload"

// Full-screen viewer for a photo stored in the private photos bucket. The
// signed URL is fetched lazily when the modal opens (photoPath becomes
// non-null), never upfront for whole lists.
export function PhotoViewerModal({
  photoPath,
  onClose,
}: {
  photoPath: string | null
  onClose: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    setUrl(null)
    setError(null)
    if (!photoPath) return
    let cancelled = false
    getSignedPhotoUrl(photoPath).then(
      (signedUrl) => {
        if (!cancelled) setUrl(signedUrl)
      },
      () => {
        if (!cancelled) setError("Could not load this photo. Please try again.")
      },
    )
    return () => {
      cancelled = true
    }
  }, [photoPath])

  return (
    <Modal
      visible={photoPath != null}
      animationType="fade"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        {url ? (
          <Image
            source={{ uri: url }}
            resizeMode="contain"
            style={{ flex: 1 }}
            accessibilityLabel="Attached photo"
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            {error ? (
              <Text
                style={{ fontFamily: fonts.body, color: "#FFFFFF", fontSize: 15, textAlign: "center" }}
              >
                {error}
              </Text>
            ) : (
              <ActivityIndicator color="#FFFFFF" size="large" />
            )}
          </View>
        )}
        <View style={{ position: "absolute", top: insets.top + 8, right: 16 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            onPress={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
