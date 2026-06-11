import {
  getMostContacted,
  getNextDueDays,
  getOnTimeRate,
  getUpcomingMoments,
  type Interaction,
  type UpcomingMomentItem,
} from "@roots/shared"
import type { ImportantMoment, Person } from "@/types"

// Interaction columns the dashboard needs for its stats.
export type DashboardInteraction = Pick<Interaction, "person_id" | "type" | "is_touch_point">

export const DASHBOARD_INTERACTION_COLUMNS = "person_id, type, is_touch_point"

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

  const overdueList = people.filter((person) => {
    const days = getNextDueDays(person)
    return days != null && days <= 0
  })
  const dueThisWeekList = people.filter((person) => {
    const days = getNextDueDays(person)
    return days != null && days >= 1 && days <= 7
  })
  const comingUpList = people.filter((person) => {
    const days = getNextDueDays(person)
    return days != null && days >= 8
  })
  const followUpList = [...overdueList, ...dueThisWeekList]
    .sort((a, b) => (getNextDueDays(a) ?? 0) - (getNextDueDays(b) ?? 0))

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
