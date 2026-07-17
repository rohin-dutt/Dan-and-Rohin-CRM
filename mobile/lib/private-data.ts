import AsyncStorage from "@react-native-async-storage/async-storage"
import { clearCrmCache } from "@/lib/crm-cache"

const PRIVATE_CACHE_KEYS = [
  "roots:offline-cache",
  "roots:contacts-import-draft",
  "roots:push-token",
]

export async function clearLocalPrivateData() {
  await Promise.all([
    AsyncStorage.multiRemove(PRIVATE_CACHE_KEYS),
    clearCrmCache(),
  ])
}
