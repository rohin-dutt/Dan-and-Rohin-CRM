import AsyncStorage from "@react-native-async-storage/async-storage"

const NOTIFICATION_PROMPT_ELIGIBLE_KEY_PREFIX =
  "roots:onboarding-notification-eligible:"

function notificationPromptEligibleKey(userId: string) {
  return `${NOTIFICATION_PROMPT_ELIGIBLE_KEY_PREFIX}${userId}`
}

export async function markOnboardingNotificationPromptEligible(
  userId: string,
): Promise<void> {
  await AsyncStorage.setItem(notificationPromptEligibleKey(userId), "true")
}

export async function shouldShowOnboardingNotificationPrompt(
  userId: string,
): Promise<boolean> {
  return (
    (await AsyncStorage.getItem(notificationPromptEligibleKey(userId))) ===
    "true"
  )
}

export async function markOnboardingNotificationPromptHandled(
  userId: string,
): Promise<void> {
  await AsyncStorage.removeItem(notificationPromptEligibleKey(userId))
}
