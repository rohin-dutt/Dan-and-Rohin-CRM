import {
  categorizePeople,
  getMostContacted,
  getNextDueDays,
  getOnTimeRate,
  getUpcomingMoments,
  type Interaction,
  type UpcomingMomentItem,
} from "@roots/shared"
import type { ImportantMoment, Person } from "@/types"

// Interaction columns the dashboard needs — includes follow-up fields so
// categorizePeople can bucket people correctly (not just cadence-based).
export type DashboardInteraction = Pick<
  Interaction,
  "person_id" | "type" | "is_touch_point" | "follow_up_needed" | "follow_up_date" | "follow_up_status"
>

export const DASHBOARD_INTERACTION_COLUMNS =
  "person_id, type, is_touch_point, follow_up_needed, follow_up_date, follow_up_status"

export type DashboardModel = {
  overdueList: Person[]
  dueThisWeekList: Person[]
  comingUpList: Person[]
  followUps: Person[]
  followUpExtraCount: number
  upcomingMoments: UpcomingMomentItem[]
  onTimeRate: number | null
  mostContacted: Person | null
}

// Pure derivation of the dashboard sections from loaded rows; isolated so a
// future server-side summary can replace it without touching the screen.
export function buildDashboardModel(input: {
  people: Person[]
  interactions: DashboardInteraction[]
  importantMoments: ImportantMoment[]
}): DashboardModel {
  const { people, interactions, importantMoments } = input

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
