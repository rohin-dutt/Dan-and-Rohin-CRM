import AsyncStorage from "@react-native-async-storage/async-storage"

export const FIRST_DOWNLOAD_INTRO_COMPLETE_EVENT = "firstDownloadIntroComplete"

const FIRST_DOWNLOAD_INTRO_COMPLETE_KEY = "roots:first-download-intro-complete"

export async function hasCompletedFirstDownloadIntro(): Promise<boolean> {
  return (await AsyncStorage.getItem(FIRST_DOWNLOAD_INTRO_COMPLETE_KEY)) === "true"
}

export async function markFirstDownloadIntroComplete(): Promise<void> {
  await AsyncStorage.setItem(FIRST_DOWNLOAD_INTRO_COMPLETE_KEY, "true")
}
