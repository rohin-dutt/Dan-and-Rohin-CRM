import {
  categorizePeople,
  getFollowUpQueue,
  getMostContacted,
  getNextDueDays,
  getOnTimeRate,
  getUpcomingMoments,
  type Interaction,
  type UpcomingMomentItem,
} from "@roots/shared"
import type { ImportantMoment, Person } from "@/types"

// Interaction columns the dashboard needs for stats and explicit follow-up queues.
export type DashboardInteraction = Pick<
  Interaction,
  | "id"
  | "person_id"
  | "type"
  | "date"
  | "notes"
  | "is_touch_point"
  | "follow_up_needed"
  | "follow_up_date"
  | "follow_up_status"
  | "follow_up_snoozed_until"
  | "created_at"
  | "updated_at"
>

export const DASHBOARD_INTERACTION_COLUMNS =
  "id, person_id, type, date, notes, is_touch_point, follow_up_needed, follow_up_date, follow_up_status, follow_up_snoozed_until, created_at, updated_at"

export type DashboardModel = {
  cadenceOverdueList: Person[]
  cadenceDueThisWeekList: Person[]
  comingUpList: Person[]
  cadenceCheckIns: Person[]
  cadenceCheckInExtraCount: number
  explicitFollowUps: Array<{ interaction: DashboardInteraction; person: Person }>
  explicitFollowUpExtraCount: number
  upcomingMoments: UpcomingMomentItem[]
  onTimeRate: number | null
  mostContacted: Person | null
}

// Pure derivation of the dashboard sections from loaded rows. Cadence
// check-ins and explicit follow-ups stay separate so completed/snoozed
// follow-ups do not make cadence cards look like urgent follow-up tasks.
export function buildDashboardModel(input: {
  people: Person[]
  interactions: DashboardInteraction[]
  importantMoments: ImportantMoment[]
}): DashboardModel {
  const { people, interactions, importantMoments } = input
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const sections = categorizePeople(people, new Date())

  const followUpQueue = getFollowUpQueue(interactions, new Date())
  const explicitFollowUpList = [...followUpQueue.overdue, ...followUpQueue.due_today, ...followUpQueue.due]
    .map((interaction) => {
      const person = peopleById.get(interaction.person_id)
      return person ? { interaction, person } : null
    })
    .filter((item): item is { interaction: DashboardInteraction; person: Person } => item != null)

  const cadenceCheckInList = [...sections.overdue, ...sections.dueThisWeek]

  return {
    cadenceOverdueList: sections.overdue,
    cadenceDueThisWeekList: sections.dueThisWeek,
    comingUpList: sections.comingUp,
    cadenceCheckIns: cadenceCheckInList.slice(0, 3),
    cadenceCheckInExtraCount: Math.max(0, cadenceCheckInList.length - 3),
    explicitFollowUps: explicitFollowUpList.slice(0, 3),
    explicitFollowUpExtraCount: Math.max(0, explicitFollowUpList.length - 3),
    upcomingMoments: getUpcomingMoments(people, importantMoments, new Date(), 14),
    onTimeRate: getOnTimeRate(people),
    mostContacted: getMostContacted(people, interactions),
  }
}

export function statusDotForPerson(person: Person): "red" | "amber" | "green" | "gray" {
  const days = getNextDueDays(person)
  if (days == null) return "gray"
  if (days <= 0) return "red"
  if (days <= 7) return "amber"
  return "green"
}
