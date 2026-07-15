import type { Ionicons } from "@expo/vector-icons"
import type { Tag } from "@/types"

export type PersonTagRow = {
  tags: Tag | Tag[] | null
}

export function getTagFromJoin(row: PersonTagRow): Tag | null {
  if (Array.isArray(row.tags)) return row.tags[0] ?? null
  return row.tags
}

export function formatNextAction(days: number | null): string {
  if (days == null) return "—"
  if (days < 0) return "Overdue"
  if (days === 0) return "Today"
  const due = new Date()
  due.setDate(due.getDate() + days)
  return `by ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(due)}`
}

// Interaction type recorded when a follow-up is completed and the user opts
// to count it as an interaction. Rendered without a type badge in the
// timeline; the interactions.type check constraint only requires non-empty.
export const FOLLOW_UP_COMPLETED_TYPE = "follow_up_completed"

export function interactionIcon(type: string): keyof typeof Ionicons.glyphMap {
  const normalized = type.trim().toLowerCase()
  if (normalized === FOLLOW_UP_COMPLETED_TYPE) return "checkmark-done-outline"
  if (normalized.includes("in person") || normalized.includes("in-person")) return "people-outline"
  if (normalized.includes("call") || normalized.includes("phone")) return "call-outline"
  if (normalized.includes("text") || normalized.includes("message")) return "chatbubble-outline"
  if (normalized.includes("coffee")) return "cafe-outline"
  if (normalized.includes("meeting") || normalized.includes("meet")) return "people-outline"
  if (normalized.includes("email")) return "mail-outline"
  if (normalized.includes("note")) return "document-text-outline"
  return "chatbubbles-outline"
}
