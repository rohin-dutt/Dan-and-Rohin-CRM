import type { Ionicons } from "@expo/vector-icons"
import { getRelationshipStatus, isTouchPoint } from "@roots/shared"
import { colors } from "@/constants/theme"
import type { Interaction, Person, Tag } from "@/types"

export type SortKey = "last_contacted" | "name" | "most_contacted" | "recently_added"
export type CategoryFilter = "All" | "Friends" | "Family" | "Professional"

// Subset of interaction columns the people list actually needs for counts,
// latest-touch sorting, touch-point checks, and follow-up-aware status filters.
export type InteractionSummary = Pick<
  Interaction,
  | "person_id"
  | "type"
  | "date"
  | "created_at"
  | "is_touch_point"
  | "follow_up_needed"
  | "follow_up_date"
  | "follow_up_status"
>

export const INTERACTION_SUMMARY_COLUMNS =
  "person_id, type, date, created_at, is_touch_point, follow_up_needed, follow_up_date, follow_up_status"

export const PEOPLE_CATEGORIES: Array<{ label: CategoryFilter; icon: keyof typeof Ionicons.glyphMap }> = [
  { label: "All", icon: "apps-outline" },
  { label: "Friends", icon: "people-outline" },
  { label: "Family", icon: "home-outline" },
  { label: "Professional", icon: "briefcase-outline" },
]

export const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "last_contacted", label: "Last Contacted" },
  { key: "name", label: "Sort by First Name" },
  { key: "most_contacted", label: "Most Contacted" },
  { key: "recently_added", label: "Recently Added" },
]

export const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "overdue", label: "Overdue" },
  { key: "due_this_week", label: "Due This Week" },
  { key: "coming_up", label: "Coming Up" },
  { key: "not_contacted", label: "Not Yet Contacted" },
]

export function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

export function parseMultiParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : value ?? ""
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

// Location values can contain commas ("Paris, France"), so they are kept
// whole and only split on the explicit "||" separator used between values.
export function parseLocationParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join("||") : value ?? ""
  return raw
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function matchesSearch(person: Person, rawQuery: string) {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return true
  return normalize(person.name).includes(query)
}

export function matchesCategory(person: Person, category: CategoryFilter) {
  if (category === "All") return true
  if (category === "Friends") return normalize(person.relationship_type).includes("friend")
  if (category === "Family") return normalize(person.relationship_type).includes("family")
  return ["professional", "work", "colleague", "business"].some((term) =>
    normalize(`${person.relationship_type ?? ""} ${person.company ?? ""} ${person.role ?? ""}`).includes(term),
  )
}

// Earliest open follow-up date per person, mirroring categorizePeople's
// rules so the People tab buckets match the home tab metric cards.
export function buildOpenFollowUpByPerson(interactions: InteractionSummary[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const interaction of interactions) {
    if (!isTouchPoint(interaction)) continue
    if (!interaction.follow_up_needed || !interaction.follow_up_date) continue
    const status = interaction.follow_up_status ?? "open"
    if (status === "done" || status === "snoozed") continue
    const existing = map.get(interaction.person_id)
    if (!existing || interaction.follow_up_date < existing) {
      map.set(interaction.person_id, interaction.follow_up_date)
    }
  }
  return map
}

export function matchesStatusFilter(
  person: Person,
  filters: string[],
  followUpDate: string | null = null,
): boolean {
  if (filters.length === 0) return true
  const status = getRelationshipStatus(person, new Date(), followUpDate)
  return filters.some((filter) => {
    if (filter === "overdue") return status === "overdue"
    if (filter === "due_this_week") return status === "due_this_week"
    if (filter === "follow_up") return status === "overdue" || status === "due_this_week"
    if (filter === "coming_up") return status === "coming_up"
    if (filter === "not_contacted") return person.last_contacted_at == null
    return false
  })
}

export function followUpBadgeForPerson(
  person: Person,
  followUpDate: string | null = null,
): { label: string; bg: string; text: string } | null {
  const status = getRelationshipStatus(person, new Date(), followUpDate)
  if (status === "overdue") return { label: "Overdue", bg: colors.mint, text: colors.forest }
  if (status === "due_this_week") return { label: "This week", bg: "#FFF3DE", text: colors.amber }
  return null
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function formatLastInteraction(dateStr: string | null | undefined, personName?: string): string {
  if (!dateStr) {
    const firstName = personName?.split(" ")[0]
    return firstName ? `Say hello to ${firstName} 👋` : "Say hello 👋"
  }
  const [yearPart, monthPart, dayPart] = dateStr.slice(0, 10).split("-").map(Number)
  const date = new Date(yearPart, monthPart - 1, dayPart)
  const currentYear = new Date().getFullYear()
  const month = MONTH_SHORT[date.getMonth()]
  const day = date.getDate()
  if (date.getFullYear() === currentYear) {
    return `Last talked ${month} ${day}`
  }
  return `Last talked ${month} ${day}, ${date.getFullYear()}`
}

export function buildInteractionCounts(interactions: InteractionSummary[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const interaction of interactions) {
    if (!isTouchPoint(interaction)) continue
    counts.set(interaction.person_id, (counts.get(interaction.person_id) ?? 0) + 1)
  }
  return counts
}

export function buildLatestTouchByPerson(
  interactions: InteractionSummary[],
): Map<string, InteractionSummary> {
  const latest = new Map<string, InteractionSummary>()
  for (const interaction of interactions) {
    if (!isTouchPoint(interaction)) continue
    const current = latest.get(interaction.person_id)
    if (!current) {
      latest.set(interaction.person_id, interaction)
      continue
    }
    const interactionDateTime = new Date(`${interaction.date}T12:00:00`).getTime()
    const currentDateTime = new Date(`${current.date}T12:00:00`).getTime()
    if (
      interactionDateTime > currentDateTime ||
      (interactionDateTime === currentDateTime &&
        new Date(interaction.created_at).getTime() > new Date(current.created_at).getTime())
    ) {
      latest.set(interaction.person_id, interaction)
    }
  }
  return latest
}

export function filterAndSortPeople(input: {
  people: Person[]
  search: string
  category: CategoryFilter
  statusFilters: string[]
  tagFilters: string[]
  locationFilters: string[]
  momentsUpcomingOnly: boolean
  upcomingMomentPersonIds: Set<string>
  tagsByPerson: Map<string, Tag[]>
  sort: SortKey
  interactionCounts: Map<string, number>
  latestTouchByPerson: Map<string, InteractionSummary>
  followUpByPerson: Map<string, string>
}): Person[] {
  const {
    people,
    search,
    category,
    statusFilters,
    tagFilters,
    locationFilters,
    momentsUpcomingOnly,
    upcomingMomentPersonIds,
    tagsByPerson,
    sort,
    interactionCounts,
    latestTouchByPerson,
    followUpByPerson,
  } = input

  const filtered = people.filter((person) => {
    if (!matchesSearch(person, search)) return false
    if (!matchesCategory(person, category)) return false
    if (!matchesStatusFilter(person, statusFilters, followUpByPerson.get(person.id) ?? null)) return false
    if (momentsUpcomingOnly && !upcomingMomentPersonIds.has(person.id)) return false
    if (tagFilters.length > 0) {
      const assignedTagIds = new Set((tagsByPerson.get(person.id) ?? []).map((tag) => tag.id))
      if (!tagFilters.some((tagId) => assignedTagIds.has(tagId))) return false
    }
    if (locationFilters.length > 0 && !locationFilters.some((loc) => normalize(person.location) === normalize(loc))) return false
    return true
  })

  return [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    if (sort === "most_contacted") {
      return (interactionCounts.get(b.id) ?? 0) - (interactionCounts.get(a.id) ?? 0)
    }
    if (sort === "recently_added") {
      if (!a.created_at && !b.created_at) return 0
      if (!a.created_at) return 1
      if (!b.created_at) return -1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    const aLatest = latestTouchByPerson.get(a.id)
    const bLatest = latestTouchByPerson.get(b.id)
    if (!aLatest && !bLatest) return a.name.localeCompare(b.name)
    if (!aLatest) return 1
    if (!bLatest) return -1
    const bDateTime = new Date(`${bLatest.date}T12:00:00`).getTime()
    const aDateTime = new Date(`${aLatest.date}T12:00:00`).getTime()
    if (bDateTime !== aDateTime) return bDateTime - aDateTime
    return new Date(bLatest.created_at).getTime() - new Date(aLatest.created_at).getTime()
  })
}
