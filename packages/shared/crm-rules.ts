import type { ImportantMoment, Person, Interaction } from "./types.ts";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDay(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  let date: Date;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getDaysSince(
  dateValue: string | Date | null | undefined,
  todayValue: Date = new Date()
): number | null {
  const date = toDay(dateValue);
  const today = toDay(todayValue);
  if (!date || !today) return null;
  return Math.floor((today.getTime() - date.getTime()) / MS_PER_DAY);
}

export function getNextDueDate(person: Person): Date | null {
  const lastContacted = toDay(person.last_contacted_at);
  if (!lastContacted) return null;
  const nextDue = new Date(lastContacted);
  nextDue.setDate(nextDue.getDate() + person.contact_frequency_days);
  return nextDue;
}

export function getNextDueDays(
  person: Person,
  todayValue: Date = new Date()
): number | null {
  const nextDue = getNextDueDate(person);
  const today = toDay(todayValue);
  if (!nextDue || !today) return null;
  return Math.ceil((nextDue.getTime() - today.getTime()) / MS_PER_DAY);
}

export function shouldTouchLastContacted(
  currentValue: string | Date | null | undefined,
  interactionDateValue: string | Date | null | undefined
): boolean {
  const current = toDay(currentValue);
  const interactionDate = toDay(interactionDateValue);
  if (!interactionDate) return false;
  if (!current) return true;
  return interactionDate >= current;
}

export function isTouchPoint(interaction: { is_touch_point?: boolean; type?: string | null }): boolean {
  if (interaction.is_touch_point === false) return false;
  return String(interaction.type ?? "").trim().toLowerCase() !== "note";
}

export function pluralize(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function getRelationshipStatus(
  person: Person,
  todayValue: Date = new Date(),
  followUpDate: string | null = null
): string {
  const today = toDay(todayValue);
  if (!today) return "coming_up";

  if (followUpDate) {
    const fuDate = toDay(followUpDate);
    if (fuDate) {
      const daysDiff = Math.ceil(
        (fuDate.getTime() - today.getTime()) / MS_PER_DAY
      );
      if (daysDiff < 0) return "overdue";
      if (daysDiff <= 7) return "due_this_week";
      return "coming_up";
    }
  }

  const nextDueDays = getNextDueDays(person, todayValue);
  const daysSince = getDaysSince(person.last_contacted_at, todayValue);

  if (daysSince !== null && daysSince <= 7) return "recent";
  if (nextDueDays !== null && nextDueDays < 0) return "overdue";
  if (nextDueDays !== null && nextDueDays <= 7) return "due_this_week";
  if (!person.last_contacted_at) return "neglected";
  return "coming_up";
}

export function categorizePeople(
  people: Person[],
  todayValue: Date = new Date(),
  interactions: Interaction[] = []
): {
  overdue: Person[];
  dueThisWeek: Person[];
  comingUp: Person[];
  recentlyContacted: Person[];
  neglected: Person[];
} {
  const followUpByPerson = new Map<string, string>();
  for (const interaction of interactions) {
    if (!isTouchPoint(interaction)) continue;
    if (!interaction.follow_up_needed || !interaction.follow_up_date) continue;
    const status = interaction.follow_up_status ?? "open";
    if (status === "done" || status === "snoozed") continue;
    const existing = followUpByPerson.get(interaction.person_id);
    if (!existing || interaction.follow_up_date < existing) {
      followUpByPerson.set(interaction.person_id, interaction.follow_up_date);
    }
  }

  const sections = {
    overdue: [] as Person[],
    dueThisWeek: [] as Person[],
    comingUp: [] as Person[],
    recentlyContacted: [] as Person[],
    neglected: [] as Person[],
  };

  for (const person of people) {
    const followUpDate = followUpByPerson.get(person.id) ?? null;
    const status = getRelationshipStatus(person, todayValue, followUpDate);
    if (status === "overdue") sections.overdue.push(person);
    else if (status === "due_this_week") sections.dueThisWeek.push(person);
    else if (status === "recent") sections.recentlyContacted.push(person);
    else if (status === "neglected") sections.neglected.push(person);
    else sections.comingUp.push(person);
  }

  sections.overdue.sort(
    (a, b) => (getNextDueDays(a, todayValue) ?? 0) - (getNextDueDays(b, todayValue) ?? 0)
  );
  sections.dueThisWeek.sort(
    (a, b) => (getNextDueDays(a, todayValue) ?? 0) - (getNextDueDays(b, todayValue) ?? 0)
  );
  sections.comingUp.sort(
    (a, b) => (getNextDueDays(a, todayValue) ?? 0) - (getNextDueDays(b, todayValue) ?? 0)
  );
  sections.recentlyContacted.sort(
    (a, b) =>
      (getDaysSince(a.last_contacted_at, todayValue) ?? 0) -
      (getDaysSince(b.last_contacted_at, todayValue) ?? 0)
  );
  sections.neglected.sort((a, b) => {
    if (!a.last_contacted_at && !b.last_contacted_at) return 0;
    if (!a.last_contacted_at) return -1;
    if (!b.last_contacted_at) return 1;
    return new Date(a.last_contacted_at).getTime() - new Date(b.last_contacted_at).getTime();
  });

  return sections;
}

export function getFollowUpState(
  interaction: Interaction,
  todayValue: Date = new Date()
): string {
  const status = interaction.follow_up_status ?? (interaction.follow_up_needed ? "open" : "done");
  if (status === "done") return "done";

  const snoozedUntil = toDay(interaction.follow_up_snoozed_until);
  const today = toDay(todayValue);
  if (status === "snoozed" && snoozedUntil && today && snoozedUntil > today) {
    return "snoozed";
  }

  const dueDate = toDay(interaction.follow_up_date);
  if (!dueDate || !today) return "due";
  if (dueDate < today) return "overdue";
  if (dueDate.getTime() === today.getTime()) return "due_today";
  return "due";
}

export function getFollowUpQueue<T extends Interaction>(
  interactions: T[],
  todayValue: Date = new Date()
): {
  overdue: T[];
  due_today: T[];
  due: T[];
  snoozed: T[];
  done: T[];
} {
  const queue = {
    overdue: [] as T[],
    due_today: [] as T[],
    due: [] as T[],
    snoozed: [] as T[],
    done: [] as T[],
  };

  for (const interaction of interactions) {
    if (!isTouchPoint(interaction)) continue;
    if (!interaction.follow_up_needed) continue;
    const state = getFollowUpState(interaction, todayValue);
    queue[state as keyof typeof queue].push(interaction);
  }

  const byDate = (a: T, b: T) =>
    String(a.follow_up_date ?? a.follow_up_snoozed_until ?? a.date).localeCompare(
      String(b.follow_up_date ?? b.follow_up_snoozed_until ?? b.date)
    );
  queue.overdue.sort(byDate);
  queue.due_today.sort(byDate);
  queue.due.sort(byDate);
  queue.snoozed.sort(byDate);
  queue.done.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return queue;
}

export function getBirthdayReminders(
  people: Person[],
  todayValue: Date = new Date(),
  windowDays = 30
): Array<{ person: Person; nextBirthday: Date; daysUntil: number }> {
  const today = toDay(todayValue);
  if (!today) return [];

  return people
    .filter((person) => person.birthday)
    .map((person) => {
      const birthday = toDay(person.birthday);
      if (!birthday) return null;
      let nextBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      if (nextBirthday < today) {
        nextBirthday = new Date(today.getFullYear() + 1, birthday.getMonth(), birthday.getDate());
      }
      const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / MS_PER_DAY);
      return { person, nextBirthday, daysUntil };
    })
    .filter((item): item is { person: Person; nextBirthday: Date; daysUntil: number } =>
      item !== null && item.daysUntil <= windowDays
    )
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export type UpcomingMomentItem =
  | {
      id: string;
      kind: "birthday";
      person: Person;
      label: "Birthday";
      sourceDate: string;
      nextDate: Date;
      daysUntil: number;
    }
  | {
      id: string;
      kind: "important_moment";
      person: Person;
      moment: ImportantMoment;
      label: string;
      sourceDate: string;
      nextDate: Date;
      daysUntil: number;
    };

function nextMomentDate(
  sourceDateValue: string | Date | null | undefined,
  todayValue: Date,
  recursYearly: boolean
): { nextDate: Date; daysUntil: number } | null {
  const sourceDate = toDay(sourceDateValue);
  const today = toDay(todayValue);
  if (!sourceDate || !today) return null;

  let nextDate = recursYearly
    ? new Date(today.getFullYear(), sourceDate.getMonth(), sourceDate.getDate())
    : new Date(sourceDate);

  if (recursYearly && nextDate < today) {
    nextDate = new Date(today.getFullYear() + 1, sourceDate.getMonth(), sourceDate.getDate());
  }

  const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / MS_PER_DAY);
  if (daysUntil < 0) return null;
  return { nextDate, daysUntil };
}

export function getUpcomingMoments(
  people: Person[],
  importantMoments: ImportantMoment[] = [],
  todayValue: Date = new Date(),
  windowDays = 14
): UpcomingMomentItem[] {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const birthdayItems = people
    .filter((person) => person.birthday)
    .map((person) => {
      const next = nextMomentDate(person.birthday, todayValue, true);
      if (!next || next.daysUntil > windowDays) return null;
      return {
        id: `birthday-${person.id}`,
        kind: "birthday" as const,
        person,
        label: "Birthday" as const,
        sourceDate: person.birthday ?? "",
        nextDate: next.nextDate,
        daysUntil: next.daysUntil,
      };
    })
    .filter((item): item is Extract<UpcomingMomentItem, { kind: "birthday" }> => item !== null);

  const customItems = importantMoments
    .map((moment) => {
      const person = peopleById.get(moment.person_id);
      if (!person) return null;
      const next = nextMomentDate(moment.date, todayValue, moment.recurs_yearly);
      if (!next || next.daysUntil > windowDays) return null;
      return {
        id: moment.id,
        kind: "important_moment" as const,
        person,
        moment,
        label: moment.label,
        sourceDate: moment.date,
        nextDate: next.nextDate,
        daysUntil: next.daysUntil,
      };
    })
    .filter((item): item is Extract<UpcomingMomentItem, { kind: "important_moment" }> => item !== null);

  return [...birthdayItems, ...customItems].sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.person.name.localeCompare(b.person.name, undefined, { sensitivity: "base" });
  });
}

export function getNeedsAttention(people: Person[]): Person | null {
  let mostOverdue: Person | null = null;
  let minDays = 0;
  for (const person of people) {
    const days = getNextDueDays(person);
    if (days !== null && days < minDays) {
      minDays = days;
      mostOverdue = person;
    }
  }
  return mostOverdue;
}

export function getMostContacted(
  people: Person[],
  interactions: Interaction[]
): Person | null {
  if (!interactions.length) return null;
  const counts = new Map<string, number>();
  for (const interaction of interactions) {
    if (!isTouchPoint(interaction)) continue;
    counts.set(interaction.person_id, (counts.get(interaction.person_id) ?? 0) + 1);
  }
  let maxCount = 0;
  let maxId: string | null = null;
  for (const [id, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxId = id;
    }
  }
  if (!maxId) return null;
  return people.find((p) => p.id === maxId) ?? null;
}

export function getOnTimeRate(people: Person[]): number | null {
  const withFrequency = people.filter((p) => p.contact_frequency_days != null);
  if (withFrequency.length === 0) return null;
  const onTime = withFrequency.filter((p) => {
    const days = getNextDueDays(p);
    return days !== null && days >= 0;
  });
  return Math.round((onTime.length / withFrequency.length) * 100);
}

export function getTotalContacts(people: Person[]): number {
  return people.length;
}

export function getTotalInteractions(interactions: Interaction[]): number {
  return interactions.filter(isTouchPoint).length;
}

export function normalizeContactText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9@.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export type DuplicateContactCandidate = {
  id: string;
  name: string;
  email?: string | null;
};

export function findDuplicateContacts(
  people: DuplicateContactCandidate[]
): Map<string, string> {
  const warnings = new Map<string, string>();
  const byEmail = new Map<string, DuplicateContactCandidate>();
  const byName = new Map<string, DuplicateContactCandidate>();

  for (const person of people) {
    const email = normalizeContactText(person.email);
    const name = normalizeContactText(person.name);

    if (email) {
      const existing = byEmail.get(email);
      if (existing) {
        warnings.set(person.id, `Possible duplicate of ${existing.name} by email`);
        warnings.set(existing.id, `Possible duplicate of ${person.name} by email`);
      } else {
        byEmail.set(email, person);
      }
    }

    if (name) {
      const existing = byName.get(name);
      if (existing) {
        warnings.set(person.id, `Possible duplicate of ${existing.name} by name`);
        warnings.set(existing.id, `Possible duplicate of ${person.name} by name`);
      } else {
        byName.set(name, person);
      }
    }
  }

  return warnings;
}

export async function updateStreakAfterAction(supabaseClient: {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<unknown>;
}): Promise<void> {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const today = new Date();
    const localDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    await supabaseClient.rpc("update_streak", {
      p_user_id: user.id,
      p_local_date: localDate,
    });
  } catch {
    // best-effort — never block the main action
  }
}
