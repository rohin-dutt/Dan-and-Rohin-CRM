import {
  categorizePeople,
  getMostContacted,
  getUpcomingMoments,
  type Interaction,
  type UpcomingMomentItem,
} from "@roots/shared"
import type { Person } from "@/types"

// Interaction columns the dashboard needs — includes follow-up fields so
// categorizePeople can bucket people correctly (not just cadence-based).
export type DashboardInteraction = Pick<
  Interaction,
  "person_id" | "type" | "is_touch_point" | "follow_up_needed" | "follow_up_date" | "follow_up_status"
>

export const DASHBOARD_INTERACTION_COLUMNS =
  "person_id, type, is_touch_point, follow_up_needed, follow_up_date, follow_up_status"

export type EnrichmentNudge = {
  person: Person
  reason: "missing_details" | "no_interactions"
}

export type DashboardModel = {
  overdueList: Person[]
  dueThisWeekList: Person[]
  comingUpList: Person[]
  followUps: Person[]
  followUpExtraCount: number
  upcomingBirthdays: UpcomingMomentItem[]
  mostContacted: Person | null
  enrichmentNudge: EnrichmentNudge | null
}

// Fields that count toward "we know enough about this person", by
// relationship type. Professional contacts are judged on work details;
// everyone else on personal details.
const PROFESSIONAL_ENRICHMENT_FIELDS = ["company", "role", "location", "notes"] as const
const PERSONAL_ENRICHMENT_FIELDS = ["birthday", "location", "how_met", "notes"] as const

function countFilledEnrichmentFields(person: Person): number {
  const fields =
    person.relationship_type === "Professional"
      ? PROFESSIONAL_ENRICHMENT_FIELDS
      : PERSONAL_ENRICHMENT_FIELDS
  return fields.filter((field) => (person[field] ?? "").trim().length > 0).length
}

// One person per day who could use richer data: missing details takes
// priority over never-contacted. Rotates daily so the nudge stays fresh
// without changing within a day.
function pickEnrichmentNudge(people: Person[]): EnrichmentNudge | null {
  const pool: EnrichmentNudge[] = []
  for (const person of people) {
    if (countFilledEnrichmentFields(person) < 2) {
      pool.push({ person, reason: "missing_details" })
    } else if (person.last_contacted_at == null) {
      pool.push({ person, reason: "no_interactions" })
    }
  }
  if (pool.length === 0) return null
  return pool[Math.floor(Date.now() / 86400000) % pool.length]
}

// Pure derivation of the dashboard sections from loaded rows; isolated so a
// future server-side summary can replace it without touching the screen.
export function buildDashboardModel(input: {
  people: Person[]
  interactions: DashboardInteraction[]
}): DashboardModel {
  const { people, interactions } = input

  // categorizePeople accounts for explicit follow-ups (follow_up_needed +
  // follow_up_date) in addition to cadence, so people with an open follow-up
  // appear in the right bucket even if they have no cadence set.
  const sections = categorizePeople(
    people,
    new Date(),
    interactions as unknown as Interaction[],
  )

  const overdueList = sections.overdue
  const dueThisWeekList = sections.dueThisWeek
  const comingUpList = sections.comingUp
  const followUpList = [...overdueList, ...dueThisWeekList]

  return {
    overdueList,
    dueThisWeekList,
    comingUpList,
    followUps: followUpList.slice(0, 3),
    followUpExtraCount: Math.max(0, followUpList.length - 3),
    // No important moments passed: the home tab only surfaces birthdays.
    upcomingBirthdays: getUpcomingMoments(people, [], new Date(), 14),
    mostContacted: getMostContacted(people, interactions),
    enrichmentNudge: pickEnrichmentNudge(people),
  }
}
