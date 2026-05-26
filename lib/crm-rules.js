const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDay(value) {
  if (!value) return null;
  let date;
  // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by the spec,
  // which shifts the calendar day in negative-UTC-offset timezones. Parse
  // them as local midnight instead so comparisons reflect the user's date.
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

export function getDaysSince(dateValue, todayValue = new Date()) {
  const date = toDay(dateValue);
  const today = toDay(todayValue);
  if (!date || !today) return null;
  return Math.floor((today.getTime() - date.getTime()) / MS_PER_DAY);
}

export function getNextDueDate(person) {
  const lastContacted = toDay(person.last_contacted_at);
  if (!lastContacted) return null;
  const nextDue = new Date(lastContacted);
  nextDue.setDate(nextDue.getDate() + person.contact_frequency_days);
  return nextDue;
}

export function getNextDueDays(person, todayValue = new Date()) {
  const nextDue = getNextDueDate(person);
  const today = toDay(todayValue);
  if (!nextDue || !today) return null;
  return Math.ceil((nextDue.getTime() - today.getTime()) / MS_PER_DAY);
}

export function shouldTouchLastContacted(currentValue, interactionDateValue) {
  const current = toDay(currentValue);
  const interactionDate = toDay(interactionDateValue);
  if (!interactionDate) return false;
  if (!current) return true;
  return interactionDate >= current;
}

export function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function getRelationshipStatus(person, todayValue = new Date(), followUpDate = null) {
  const today = toDay(todayValue);
  if (!today) return "coming_up";

  // If there is an active follow-up date use it exclusively for status determination
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

  // No follow-up date — use cadence
  const nextDueDays = getNextDueDays(person, todayValue);
  const daysSince = getDaysSince(person.last_contacted_at, todayValue);

  if (daysSince !== null && daysSince <= 7) return "recent";
  if (nextDueDays !== null && nextDueDays < 0) return "overdue";
  if (nextDueDays !== null && nextDueDays <= 7) return "due_this_week";
  if (!person.last_contacted_at) return "neglected";
  return "coming_up";
}

export function categorizePeople(people, todayValue = new Date(), interactions = []) {
  // Build map: person_id → earliest open follow_up_date
  const followUpByPerson = new Map();
  for (const interaction of interactions) {
    if (!interaction.follow_up_needed || !interaction.follow_up_date) continue;
    const status = interaction.follow_up_status ?? "open";
    if (status === "done" || status === "snoozed") continue;
    const existing = followUpByPerson.get(interaction.person_id);
    if (!existing || interaction.follow_up_date < existing) {
      followUpByPerson.set(interaction.person_id, interaction.follow_up_date);
    }
  }

  const sections = {
    overdue: [],
    dueThisWeek: [],
    comingUp: [],
    recentlyContacted: [],
    neglected: [],
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
    (a, b) => getNextDueDays(a, todayValue) - getNextDueDays(b, todayValue)
  );
  sections.dueThisWeek.sort(
    (a, b) => getNextDueDays(a, todayValue) - getNextDueDays(b, todayValue)
  );
  sections.comingUp.sort(
    (a, b) => getNextDueDays(a, todayValue) - getNextDueDays(b, todayValue)
  );
  sections.recentlyContacted.sort(
    (a, b) => getDaysSince(a.last_contacted_at, todayValue) - getDaysSince(b.last_contacted_at, todayValue)
  );
  sections.neglected.sort((a, b) => {
    if (!a.last_contacted_at && !b.last_contacted_at) return 0;
    if (!a.last_contacted_at) return -1;
    if (!b.last_contacted_at) return 1;
    return new Date(a.last_contacted_at).getTime() - new Date(b.last_contacted_at).getTime();
  });

  return sections;
}

export function getFollowUpState(interaction, todayValue = new Date()) {
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

export function getFollowUpQueue(interactions, todayValue = new Date()) {
  const queue = {
    overdue: [],
    due_today: [],
    due: [],
    snoozed: [],
    done: [],
  };

  for (const interaction of interactions) {
    if (!interaction.follow_up_needed) continue;
    queue[getFollowUpState(interaction, todayValue)].push(interaction);
  }

  const byDate = (a, b) =>
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

export function getBirthdayReminders(people, todayValue = new Date(), windowDays = 30) {
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
    .filter((item) => item && item.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Returns the total number of contacts.
 * @param {Array} people
 * @returns {number}
 */
export function getTotalContacts(people) {
  return people.length;
}

/**
 * Returns the total number of interaction records.
 * @param {Array} interactions
 * @returns {number}
 */
export function getTotalInteractions(interactions) {
  return interactions.length;
}

/**
 * Returns the percentage (0–100) of people whose next due date is not overdue,
 * among those who have contact_frequency_days set. Returns null if no one has
 * a frequency set.
 * @param {Array} people
 * @returns {number|null}
 */
export function getOnTimeRate(people) {
  const withFrequency = people.filter((p) => p.contact_frequency_days != null);
  if (withFrequency.length === 0) return null;
  const onTime = withFrequency.filter((p) => {
    const days = getNextDueDays(p);
    return days !== null && days >= 0;
  });
  return Math.round((onTime.length / withFrequency.length) * 100);
}

/**
 * Returns the person object with the most interaction records, or null if none.
 * @param {Array} people
 * @param {Array} interactions
 * @returns {Object|null}
 */
export function getMostContacted(people, interactions) {
  if (!interactions.length) return null;
  const counts = new Map();
  for (const interaction of interactions) {
    counts.set(interaction.person_id, (counts.get(interaction.person_id) ?? 0) + 1);
  }
  let maxCount = 0;
  let maxId = null;
  for (const [id, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxId = id;
    }
  }
  if (!maxId) return null;
  return people.find((p) => p.id === maxId) ?? null;
}

/**
 * Returns the person most overdue relative to their contact_frequency_days
 * (most negative getNextDueDays), or null if no one is overdue.
 * @param {Array} people
 * @returns {Object|null}
 */
export function getNeedsAttention(people) {
  let mostOverdue = null;
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

export function normalizeContactText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9@.]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function updateStreakAfterAction(supabaseClient) {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) return
    const today = new Date()
    const localDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0")
    ].join("-")
    await supabaseClient.rpc("update_streak", {
      p_user_id: user.id,
      p_local_date: localDate
    })
  } catch {
    // best-effort — never block the main action
  }
}

export function findDuplicateContacts(people) {
  const warnings = new Map();
  const byEmail = new Map();
  const byName = new Map();

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
