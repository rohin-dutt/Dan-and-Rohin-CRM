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

export type DashboardModel = {
  overdueList: Person[]
  dueThisWeekList: Person[]
  comingUpList: Person[]
  followUps: Person[]
  followUpExtraCount: number
  upcomingBirthdays: UpcomingMomentItem[]
  mostContacted: Person | null
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
  }
}
