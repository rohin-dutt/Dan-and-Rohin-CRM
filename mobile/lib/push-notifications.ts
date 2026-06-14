import AsyncStorage from "@react-native-async-storage/async-storage"
import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"
import { callTrustedApi } from "@/lib/trusted-api"

const INSTALL_ID_KEY = "roots:app-install-id"
const PUSH_TOKEN_KEY = "roots:push-token"

type NotificationRouter = {
  push: (href: string) => void
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

function randomInstallId() {
  return `install-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function getInstallId() {
  const existing = await AsyncStorage.getItem(INSTALL_ID_KEY)
  if (existing) return existing
  const created = randomInstallId()
  await AsyncStorage.setItem(INSTALL_ID_KEY, created)
  return created
}

async function getExistingInstallId() {
  return AsyncStorage.getItem(INSTALL_ID_KEY)
}

function getDeviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null
}

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  )
}

export async function registerPushToken() {
  if (Platform.OS === "web") {
    throw new Error("Push notifications require a native build.")
  }

  const existingPermission = await Notifications.getPermissionsAsync()
  let status = existingPermission.status
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }

  if (status !== "granted") {
    throw new Error("Notifications permission was not granted.")
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({
    projectId: getProjectId(),
  })
  const token = tokenResult.data
  const appInstallId = await getInstallId()

  await callTrustedApi("/api/mobile/push-token", {
    method: "POST",
    body: {
      token,
      provider: "expo",
      platform: Platform.OS,
      app_install_id: appInstallId,
      app_version: Constants.expoConfig?.version ?? null,
      build_number: Constants.expoConfig?.ios?.buildNumber ?? null,
      environment: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
      notification_timezone: getDeviceTimezone(),
    },
  })

  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token)
  return token
}

export async function getPushRegistrationStatus() {
  const [token, appInstallId] = await Promise.all([
    AsyncStorage.getItem(PUSH_TOKEN_KEY),
    getExistingInstallId(),
  ])

  if (!token && !appInstallId) return false

  const params = new URLSearchParams()
  if (token) params.set("token", token)
  if (appInstallId) params.set("app_install_id", appInstallId)

  const result = await callTrustedApi(`/api/mobile/push-token?${params.toString()}`, {
    method: "GET",
  })

  return Boolean(result?.active)
}

export async function revokePushToken() {
  const [token, appInstallId] = await Promise.all([
    AsyncStorage.getItem(PUSH_TOKEN_KEY),
    getExistingInstallId(),
  ])

  if (token || appInstallId) {
    await callTrustedApi("/api/mobile/push-token", {
      method: "DELETE",
      body: {
        token,
        app_install_id: appInstallId,
      },
    })
  }

  await AsyncStorage.removeItem(PUSH_TOKEN_KEY)
}

function stringFromData(data: Record<string, unknown>, key: string) {
  const value = data[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function routeForNotificationData(data: Record<string, unknown>) {
  if (stringFromData(data, "type") !== "roots_notification") return null

  const personId = stringFromData(data, "personId")
  if (personId) return `/people/${encodeURIComponent(personId)}`

  const kind = stringFromData(data, "kind")
  if (kind === "follow_up_due" || kind === "follow_up_overdue") {
    return "/people?status=overdue&status=due_this_week"
  }

  return "/(app)/(tabs)/dashboard"
}

export function installNotificationResponseHandler(router: NotificationRouter) {
  if (Platform.OS === "web") return () => undefined

  function handleResponse(response: Notifications.NotificationResponse | null) {
    const data = response?.notification.request.content.data
    if (!data) return
    const route = routeForNotificationData(data)
    if (route) {
      router.push(route)
      Notifications.clearLastNotificationResponse()
    }
  }

  handleResponse(Notifications.getLastNotificationResponse())
  const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse)

  return () => subscription.remove()
}
