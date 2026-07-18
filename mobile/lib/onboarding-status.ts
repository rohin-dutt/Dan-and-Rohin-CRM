import AsyncStorage from "@react-native-async-storage/async-storage"
import { DeviceEventEmitter } from "react-native"
import { supabase } from "@/lib/supabase"

export const PEOPLE_CHANGED_EVENT = "peopleChanged"
export const ONBOARDING_COMPLETE_EVENT = "onboardingComplete"

const ONBOARDING_COMPLETE_KEY_PREFIX = "roots:onboarding-complete:"

function onboardingCompleteKey(userId: string) {
  return `${ONBOARDING_COMPLETE_KEY_PREFIX}${userId}`
}

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(onboardingCompleteKey(userId))) === "true"
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  await AsyncStorage.setItem(onboardingCompleteKey(userId), "true")
  DeviceEventEmitter.emit(ONBOARDING_COMPLETE_EVENT, userId)
}

export async function userHasPeople(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("people")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) throw error
  return (count ?? 0) > 0
}
