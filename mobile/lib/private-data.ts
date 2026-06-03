import AsyncStorage from "@react-native-async-storage/async-storage"

const PRIVATE_CACHE_KEYS = [
  "roots:offline-cache",
  "roots:contacts-import-draft",
  "roots:push-token",
]

export async function clearLocalPrivateData() {
  await AsyncStorage.multiRemove(PRIVATE_CACHE_KEYS)
}
