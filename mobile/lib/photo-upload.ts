import { useEffect, useState } from "react"
import { Alert, Image } from "react-native"
import * as ImagePicker from "expo-image-picker"
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import { File } from "expo-file-system"
import { supabase } from "@/lib/supabase"

const PHOTOS_BUCKET = "photos"
const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.7
const SIGNED_URL_EXPIRY_SECONDS = 3600

// Signed URLs are cached slightly shorter than their real expiry so a cached
// URL is never handed out moments before it stops working.
const SIGNED_URL_CACHE_MS = 50 * 60 * 1000

export type PickedPhoto = {
  uri: string
  width: number | null
  height: number | null
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 1,
}

async function launchCamera(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) {
    Alert.alert("Camera unavailable", "Allow camera access in Settings to take photos.")
    return null
  }
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
  const asset = result.canceled ? null : result.assets[0]
  return asset ? { uri: asset.uri, width: asset.width ?? null, height: asset.height ?? null } : null
}

async function launchLibrary(): Promise<PickedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    Alert.alert("Photos unavailable", "Allow photo library access in Settings to choose photos.")
    return null
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)
  const asset = result.canceled ? null : result.assets[0]
  return asset ? { uri: asset.uri, width: asset.width ?? null, height: asset.height ?? null } : null
}

// Asks the user for a photo source, then runs the matching picker flow.
// Resolves null when the user cancels or a permission is denied.
export function pickPhoto(): Promise<PickedPhoto | null> {
  return new Promise((resolve) => {
    Alert.alert(
      "Add a photo",
      undefined,
      [
        { text: "Take Photo", onPress: () => launchCamera().then(resolve, () => resolve(null)) },
        { text: "Choose from Library", onPress: () => launchLibrary().then(resolve, () => resolve(null)) },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    )
  })
}

function getImageSize(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null),
    )
  })
}

// Re-encodes a photo as JPEG at quality 0.7, downscaling so its longest side
// is at most 1200px. Returns the local uri of the compressed copy.
export async function compressPhoto(photo: PickedPhoto): Promise<string> {
  let { width, height } = photo
  if (width == null || height == null) {
    const measured = await getImageSize(photo.uri)
    width = measured?.width ?? null
    height = measured?.height ?? null
  }

  const context = ImageManipulator.manipulate(photo.uri)
  if (width != null && height != null && Math.max(width, height) > MAX_DIMENSION) {
    context.resize(width >= height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION })
  }
  const rendered = await context.renderAsync()
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY })
  return saved.uri
}

// Convenience wrapper for form flows: pick, then compress. Resolves null when
// the user cancels.
export async function pickCompressedPhoto(): Promise<string | null> {
  const picked = await pickPhoto()
  if (!picked) return null
  return compressPhoto(picked)
}

// Uploads a local (already compressed) image to the private photos bucket at
// `photoPath`, e.g. `{user_id}/interactions/{interaction_id}.jpg` or
// `{user_id}/people/{person_id}.jpg`. Overwrites any existing photo at that
// path so re-uploads (new profile photo) reuse the same object.
export async function uploadPhoto(localUri: string, photoPath: string): Promise<void> {
  const bytes = await new File(localUri).bytes()
  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(photoPath, bytes, { contentType: "image/jpeg", upsert: true })
  if (error) throw error
  signedUrlCache.delete(photoPath)
}

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

// Returns a short-lived signed URL for viewing a photo in the private bucket,
// reusing a cached URL while it is still comfortably within its expiry.
export async function getSignedPhotoUrl(photoPath: string): Promise<string> {
  const cached = signedUrlCache.get(photoPath)
  if (cached && cached.expiresAt > Date.now()) return cached.url

  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(photoPath, SIGNED_URL_EXPIRY_SECONDS)
  if (error) throw error
  signedUrlCache.set(photoPath, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_CACHE_MS,
  })
  return data.signedUrl
}

// Removes photos from storage. Callers treat this as best-effort cleanup and
// decide whether a failure should block the surrounding flow.
export async function deletePhotos(photoPaths: string[]): Promise<void> {
  if (photoPaths.length === 0) return
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(photoPaths)
  if (error) throw error
  for (const path of photoPaths) signedUrlCache.delete(path)
}

// Uploads an already-compressed photo for a saved interaction and stamps its
// photo_path. Returns false instead of throwing so callers can keep the
// interaction save non-blocking when only the photo fails.
export async function attachInteractionPhoto(
  userId: string,
  interactionId: string,
  localUri: string,
): Promise<boolean> {
  const photoPath = `${userId}/interactions/${interactionId}.jpg`
  try {
    await uploadPhoto(localUri, photoPath)
    const { error } = await supabase
      .from("interactions")
      .update({ photo_path: photoPath })
      .eq("id", interactionId)
    if (error) throw error
    return true
  } catch {
    return false
  }
}

// Resolves a photo_path to a displayable signed URL. Returns null while
// loading, when there is no path, or when the fetch fails (callers fall back
// to their non-photo rendering).
export function useSignedPhotoUrl(photoPath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (!photoPath) return null
    const cached = signedUrlCache.get(photoPath)
    return cached && cached.expiresAt > Date.now() ? cached.url : null
  })

  useEffect(() => {
    if (!photoPath) {
      setUrl(null)
      return
    }
    let cancelled = false
    getSignedPhotoUrl(photoPath).then(
      (signedUrl) => {
        if (!cancelled) setUrl(signedUrl)
      },
      () => {
        if (!cancelled) setUrl(null)
      },
    )
    return () => {
      cancelled = true
    }
  }, [photoPath])

  return url
}
