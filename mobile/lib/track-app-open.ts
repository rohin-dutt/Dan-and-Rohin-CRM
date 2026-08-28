import { AppState, type AppStateStatus } from "react-native"

import { supabase } from "@/lib/supabase"

// The push reminder job uses settings.last_app_open_at to decide when a user
// has been away long enough for an inactivity nudge, so this only needs to be
// roughly fresh. Skip writes within 5 minutes of the last successful one to
// avoid hammering the settings table on rapid foreground/background cycles.
const MIN_WRITE_INTERVAL_MS = 5 * 60 * 1000

let lastWriteAt = 0
let lastWriteUserId: string | null = null

async function recordAppOpen() {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) return

  const now = Date.now()
  if (lastWriteUserId === userId && now - lastWriteAt < MIN_WRITE_INTERVAL_MS) return
  lastWriteAt = now
  lastWriteUserId = userId

  const { error } = await supabase
    .from("settings")
    .upsert(
      { user_id: userId, last_app_open_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
  // On failure, let the next foreground transition retry immediately.
  if (error) lastWriteAt = 0
}

// Records an app open now and on every future transition to the foreground.
// Fire-and-forget: nothing awaits these writes, so app startup is never
// delayed. Returns a cleanup function that stops listening.
export function installAppOpenTracker() {
  void recordAppOpen().catch(() => {})

  const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
    if (state === "active") void recordAppOpen().catch(() => {})
  })

  return () => subscription.remove()
}
