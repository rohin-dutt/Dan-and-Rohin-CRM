import {
  getMostContacted,
  getNextDueDays,
  getOnTimeRate,
  getUpcomingMoments,
  type Interaction,
  type UpcomingMomentItem,
} from "@roots/shared"
import type { ImportantMoment, Person, PersonNote } from "@/types"

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
  recentNotes: Array<{ note: PersonNote; person: Person | null }>
  onTimeRate: number | null
  mostContacted: Person | null
}

// Pure derivation of the dashboard sections from loaded rows; isolated so a
// future server-side summary can replace it without touching the screen.
export function buildDashboardModel(input: {
  people: Person[]
  interactions: DashboardInteraction[]
  personNotes: PersonNote[]
  importantMoments: ImportantMoment[]
}): DashboardModel {
  const { people, interactions, personNotes, importantMoments } = input

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
  const recentNotes = [...personNotes]
    .sort((a, b) => {
      const aDate = a.note_date ?? a.created_at.slice(0, 10)
      const bDate = b.note_date ?? b.created_at.slice(0, 10)
      if (bDate !== aDate) return bDate.localeCompare(aDate)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    .slice(0, 3)
    .map((note) => ({
      note,
      person: people.find((person) => person.id === note.person_id) ?? null,
    }))

  return {
    overdueList,
    dueThisWeekList,
    comingUpList,
    followUps: followUpList.slice(0, 3),
    followUpExtraCount: Math.max(0, followUpList.length - 3),
    upcomingMoments: getUpcomingMoments(people, importantMoments, new Date(), 14),
    recentNotes,
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
