import { type SupabaseClient } from "@supabase/supabase-js";

import {
  getFollowUpState,
  getNextDueDate,
  getNextDueDays,
  getUpcomingMoments,
  isTouchPoint,
  toDay,
  type ImportantMoment,
  type Interaction,
  type Person,
} from "../packages/shared/index.ts";

export type PushNotificationKind =
  | "follow_up_due"
  | "follow_up_overdue"
  | "birthday"
  | "important_moment";

export type PushSubjectType = "person" | "interaction" | "important_moment";

export type PushSettings = {
  user_id: string;
  push_followups_enabled: boolean;
  push_birthdays_enabled: boolean;
  push_important_moments_enabled: boolean;
  notification_timezone: string | null;
  last_app_open_at?: string | null;
  created_at?: string | null;
};

export type PushToken = {
  id: string;
  user_id: string;
  token: string;
};

export type NotificationCandidate = {
  userId: string;
  kind: PushNotificationKind;
  subjectType: PushSubjectType;
  subjectId: string;
  personId: string | null;
  interactionId: string | null;
  importantMomentId: string | null;
  scheduledFor: string;
  source: "explicit_follow_up" | "cadence_check_in" | "birthday" | "important_moment";
};

type DeliveryRecord = {
  id: string;
  attempt_count: number;
  status: "pending" | "sent" | "failed" | "skipped" | "invalid_token";
};

type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message?: string; details?: { error?: string } };

type ExpoPushReceipt =
  | { status: "ok"; details?: Record<string, unknown> }
  | { status: "error"; message?: string; details?: { error?: string } };

type FetchLike = typeof fetch;


const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const FALLBACK_TIMEZONE = "UTC";
const SEND_WINDOW_START_HOUR = 9;
const SEND_WINDOW_END_HOUR = 18;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

// Reminders go out at a per-day "random" time between 5:00pm and 8:00pm local
// time. The time is derived from a deterministic hash of (local date, timezone)
// instead of a stored per-user random value, so every cron run can recompute
// the same target independently with no extra state, and the send time still
// varies day to day.
const RANDOM_SEND_WINDOW_START_MINUTES = 17 * 60;
const RANDOM_SEND_WINDOW_SPAN_MINUTES = 180;
// The GitHub Actions cron fires every 30 minutes; each run claims the half-hour
// slot containing its local time, so exactly one run per day matches a
// timezone's target minute.
const CRON_SLOT_MINUTES = 30;

// Overdue reminder cadence: notifications 1-4 fire every 2 days, then weekly.
const OVERDUE_EARLY_GAP_DAYS = 2;
const OVERDUE_WEEKLY_GAP_DAYS = 7;
const OVERDUE_WEEKLY_THRESHOLD_COUNT = 4;

// Inactivity nudge: first nudge after 96h away, second after 168h, then stop
// until the user opens the app again.
const INACTIVITY_FIRST_NUDGE_HOURS = 96;
const INACTIVITY_SECOND_NUDGE_HOURS = 168;

export function isAuthorizedPushReminderRequest(
  authorizationHeader: string | null,
  cronSecret: string | null | undefined
) {
  return Boolean(cronSecret && authorizationHeader === `Bearer ${cronSecret}`);
}

function dateString(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function readLocalParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    date: `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`,
    hour: Number(byType.get("hour")),
    minute: Number(byType.get("minute")),
  };
}

export function resolveNotificationTimezone(value: string | null | undefined) {
  if (!value) return FALLBACK_TIMEZONE;
  try {
    readLocalParts(new Date(), value);
    return value;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

export function getLocalNotificationDate(value: Date, timeZone: string) {
  return readLocalParts(value, resolveNotificationTimezone(timeZone)).date;
}

export function isInNotificationSendWindow(value: Date, timeZone: string | null | undefined) {
  const { hour } = readLocalParts(value, resolveNotificationTimezone(timeZone));
  return hour >= SEND_WINDOW_START_HOUR && hour < SEND_WINDOW_END_HOUR;
}

// Simple non-cryptographic string hash (djb2 xor variant). Only needs to be
// deterministic and reasonably spread across the send window.
function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(hash, 33) ^ value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

// Today's target send time for a timezone, as minutes since local midnight.
// Hashing (local date + timezone) picks a stable minute inside the 5pm-8pm
// window: stable within a day (every cron run agrees on it without storing
// anything) but different from one day to the next.
export function getDailyTargetSendMinutes(localDate: string, timeZone: string) {
  const seed = hashString(`${localDate}:${timeZone}`);
  return RANDOM_SEND_WINDOW_START_MINUTES + (seed % RANDOM_SEND_WINDOW_SPAN_MINUTES);
}

// A timezone is "active" for this run when today's target minute falls inside
// the current half-hour cron slot ([slot, slot + 30) local time). Each target
// minute belongs to exactly one slot, so a timezone is processed by exactly one
// run per day even when GitHub delays the cron by a few minutes. A run delayed
// past the end of its slot skips that timezone for the day rather than
// double-sending.
export function isTimezoneInSendSlot(value: Date, timeZone: string | null | undefined) {
  const zone = resolveNotificationTimezone(timeZone);
  const { date, hour, minute } = readLocalParts(value, zone);
  const minutesNow = hour * 60 + minute;
  const slotStart = Math.floor(minutesNow / CRON_SLOT_MINUTES) * CRON_SLOT_MINUTES;
  const target = getDailyTargetSendMinutes(date, zone);
  return target >= slotStart && target < slotStart + CRON_SLOT_MINUTES;
}

export type NotificationScheduleRow = {
  id: string;
  person_id: string | null;
  notification_type: "overdue_reminder" | "inactivity_nudge";
  last_notified_at: string;
  notify_count: number;
};

// Overdue reminder cadence, keyed off the schedule row instead of "days since
// the person became overdue" (which is not stored): the first four reminders
// are spaced 2 days apart, then reminders continue weekly.
export function isOverdueReminderEligible(
  row: Pick<NotificationScheduleRow, "last_notified_at" | "notify_count"> | null | undefined,
  now: Date
) {
  if (!row) return true;
  const lastNotified = Date.parse(row.last_notified_at);
  if (Number.isNaN(lastNotified)) return true;
  const daysSince = (now.getTime() - lastNotified) / MS_PER_DAY;
  const requiredGapDays =
    row.notify_count >= OVERDUE_WEEKLY_THRESHOLD_COUNT
      ? OVERDUE_WEEKLY_GAP_DAYS
      : OVERDUE_EARLY_GAP_DAYS;
  return daysSince >= requiredGapDays;
}

export type InactivityNudgeDecision =
  | { action: "none" }
  | { action: "delete" }
  | { action: "send"; notifyCount: number; resetExistingRow: boolean };

export function decideInactivityNudge({
  lastAppOpenAt,
  accountCreatedAt,
  row,
  now,
}: {
  lastAppOpenAt: string | null | undefined;
  accountCreatedAt: string | null | undefined;
  row: Pick<NotificationScheduleRow, "last_notified_at" | "notify_count"> | null;
  now: Date;
}): InactivityNudgeDecision {
  // Users who have never recorded an app open fall back to account age so a
  // brand-new signup is not immediately nudged.
  const anchor = lastAppOpenAt ?? accountCreatedAt ?? null;
  const anchorTime = anchor ? Date.parse(anchor) : NaN;
  if (Number.isNaN(anchorTime)) return { action: "none" };

  const hoursInactive = (now.getTime() - anchorTime) / MS_PER_HOUR;

  if (hoursInactive < INACTIVITY_FIRST_NUDGE_HOURS) {
    // The user opened the app recently; clear any finished/partial nudge cycle
    // so a future inactivity stretch starts fresh.
    return row ? { action: "delete" } : { action: "none" };
  }

  // The user opened the app after the last nudge, then went inactive again for
  // 96+ hours without a run observing the active period: restart the cycle.
  const openedSinceLastNudge = Boolean(
    row && lastAppOpenAt && Date.parse(lastAppOpenAt) > Date.parse(row.last_notified_at)
  );
  if (!row || openedSinceLastNudge) {
    return { action: "send", notifyCount: 1, resetExistingRow: Boolean(row) };
  }
  if (row.notify_count === 1 && hoursInactive >= INACTIVITY_SECOND_NUDGE_HOURS) {
    return { action: "send", notifyCount: 2, resetExistingRow: false };
  }
  // notify_count >= 2: both nudges used; stay quiet until the user opens the
  // app (which resets the cycle via the branch above).
  return { action: "none" };
}

export function buildPushIdempotencyKey(candidate: NotificationCandidate, tokenId: string) {
  return [
    "expo",
    tokenId,
    candidate.userId,
    candidate.kind,
    candidate.subjectType,
    candidate.subjectId,
    candidate.scheduledFor,
  ].join(":");
}

function nextDueDateString(person: Person) {
  const nextDue = getNextDueDate(person);
  return nextDue ? dateString(nextDue) : null;
}

export function selectNotificationCandidates({
  settings,
  people,
  interactions,
  importantMoments,
  today,
}: {
  settings: PushSettings;
  people: Person[];
  interactions: Interaction[];
  importantMoments: ImportantMoment[];
  today: Date;
}): NotificationCandidate[] {
  const candidates: NotificationCandidate[] = [];
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const peopleWithOpenExplicitFollowUps = new Set<string>();

  if (settings.push_followups_enabled) {
    for (const interaction of interactions) {
      if (!isTouchPoint(interaction)) continue;
      if (!interaction.follow_up_needed) continue;
      if ((interaction.follow_up_status ?? "open") === "done") continue;

      const person = peopleById.get(interaction.person_id);
      if (!person) continue;
      peopleWithOpenExplicitFollowUps.add(person.id);

      const state = getFollowUpState(interaction, today);
      if (state !== "due_today" && state !== "overdue") continue;
      if (!interaction.follow_up_date) continue;

      candidates.push({
        userId: settings.user_id,
        kind: state === "overdue" ? "follow_up_overdue" : "follow_up_due",
        subjectType: "interaction",
        subjectId: interaction.id,
        personId: person.id,
        interactionId: interaction.id,
        importantMomentId: null,
        scheduledFor: interaction.follow_up_date,
        source: "explicit_follow_up",
      });
    }

    for (const person of people) {
      if (peopleWithOpenExplicitFollowUps.has(person.id)) continue;

      const nextDueDays = getNextDueDays(person, today);
      const scheduledFor = nextDueDateString(person);
      if (nextDueDays == null || !scheduledFor) continue;
      if (nextDueDays > 0) continue;

      candidates.push({
        userId: settings.user_id,
        kind: nextDueDays < 0 ? "follow_up_overdue" : "follow_up_due",
        subjectType: "person",
        subjectId: person.id,
        personId: person.id,
        interactionId: null,
        importantMomentId: null,
        scheduledFor,
        source: "cadence_check_in",
      });
    }
  }

  const upcomingMoments = getUpcomingMoments(people, importantMoments, today, 7);
  for (const item of upcomingMoments) {
    const scheduledFor = dateString(item.nextDate);
    if (item.kind === "birthday" && settings.push_birthdays_enabled) {
      candidates.push({
        userId: settings.user_id,
        kind: "birthday",
        subjectType: "person",
        subjectId: item.person.id,
        personId: item.person.id,
        interactionId: null,
        importantMomentId: null,
        scheduledFor,
        source: "birthday",
      });
    }

    if (item.kind === "important_moment" && settings.push_important_moments_enabled) {
      candidates.push({
        userId: settings.user_id,
        kind: "important_moment",
        subjectType: "important_moment",
        subjectId: item.moment.id,
        personId: item.person.id,
        interactionId: null,
        importantMomentId: item.moment.id,
        scheduledFor,
        source: "important_moment",
      });
    }
  }

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.kind}:${candidate.subjectType}:${candidate.subjectId}:${candidate.scheduledFor}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildPrivacySafePushMessage(candidate: NotificationCandidate, token: string) {
  const bodyBySource: Record<NotificationCandidate["source"], string> = {
    explicit_follow_up:
      candidate.kind === "follow_up_overdue"
        ? "A follow-up is overdue."
        : "A follow-up is due today.",
    cadence_check_in:
      candidate.kind === "follow_up_overdue"
        ? "It is time to check in with someone."
        : "A check-in is due today.",
    birthday: "A birthday is coming up.",
    important_moment: "An important date is coming up.",
  };

  return {
    to: token,
    title: "Roots",
    body: bodyBySource[candidate.source],
    sound: "default" as const,
    data: {
      type: "roots_notification",
      kind: candidate.kind,
      subjectType: candidate.subjectType,
      subjectId: candidate.subjectId,
      personId: candidate.personId,
      interactionId: candidate.interactionId,
      importantMomentId: candidate.importantMomentId,
    },
  };
}

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0];
}

function buildPersonalizedPushMessage(
  candidate: NotificationCandidate,
  token: string,
  firstName: string
) {
  let body: string;
  if (candidate.source === "explicit_follow_up" || candidate.source === "cadence_check_in") {
    body =
      candidate.kind === "follow_up_overdue"
        ? `It's been a while since you talked to ${firstName} 🌱`
        : `Today's a good day to reach out to ${firstName} 👋`;
  } else if (candidate.source === "birthday") {
    body = `🎂 It's ${firstName}'s birthday today — reach out!`;
  } else {
    body = `📅 An important date for ${firstName} is today`;
  }

  return {
    to: token,
    title: "Roots",
    body,
    sound: "default" as const,
    data: {
      type: "roots_notification",
      kind: candidate.kind,
      subjectType: candidate.subjectType,
      subjectId: candidate.subjectId,
      personId: candidate.personId,
      interactionId: candidate.interactionId,
      importantMomentId: candidate.importantMomentId,
    },
  };
}

export type ReminderPerson = {
  personId: string;
  firstName: string | null;
};

function buildGroupedReminderData(kind: PushNotificationKind, people: ReminderPerson[]) {
  return {
    type: "roots_notification",
    kind,
    subjectType: "person" as PushSubjectType,
    subjectId: people[0]?.personId ?? null,
    // A single person deep-links to their profile; a group goes to the
    // overdue/due people list via the kind-based fallback route.
    personId: people.length === 1 ? people[0].personId : null,
    interactionId: null,
    importantMomentId: null,
  };
}

export function buildOverdueGroupMessage(people: ReminderPerson[], token: string) {
  const allNamed = people.every((person) => person.firstName);
  let body: string;
  if (people.length === 1 && allNamed) {
    body = `It's been a while since you talked to ${people[0].firstName} 🌱`;
  } else if (people.length === 2 && allNamed) {
    body = `It's been a while since you talked to ${people[0].firstName} and ${people[1].firstName} 🌱`;
  } else if (people.length === 1) {
    body = "It is time to check in with someone.";
  } else {
    body = `You have ${people.length} overdue connections to catch up on 🌱`;
  }

  return {
    to: token,
    title: "Roots",
    body,
    sound: "default" as const,
    data: buildGroupedReminderData("follow_up_overdue", people),
  };
}

export function buildDueTodayGroupMessage(people: ReminderPerson[], token: string) {
  const allNamed = people.every((person) => person.firstName);
  let body: string;
  if (people.length === 1 && allNamed) {
    body = `Today's a good day to reach out to ${people[0].firstName} 👋`;
  } else if (people.length === 2 && allNamed) {
    body = `Don't forget to reach out to ${people[0].firstName} and ${people[1].firstName} today 👋`;
  } else if (people.length === 1) {
    body = "A check-in is due today.";
  } else {
    body = `You have ${people.length} people to reach out to today 👋`;
  }

  return {
    to: token,
    title: "Roots",
    body,
    sound: "default" as const,
    data: buildGroupedReminderData("follow_up_due", people),
  };
}

export function buildInactivityNudgeMessage(token: string) {
  return {
    to: token,
    title: "Roots",
    body: "It's been a few days — log a moment and watch your Roots grow! 🌱",
    sound: "default" as const,
    data: {
      type: "roots_notification",
      kind: "inactivity_nudge",
      subjectType: null,
      subjectId: null,
      personId: null,
      interactionId: null,
      importantMomentId: null,
    },
  };
}

export function isExpoPushToken(token: string) {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
}

export function isPermanentExpoTokenFailure(errorCode: string | null | undefined) {
  return errorCode === "DeviceNotRegistered";
}

async function readExpoJson(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.errors?.[0]?.message ?? `Expo Push API failed (${response.status}).`);
  }
  return body;
}

export async function sendExpoPushMessages(messages: unknown[], fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(EXPO_PUSH_SEND_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
  const body = await readExpoJson(response);
  return (Array.isArray(body?.data) ? body.data : []) as ExpoPushTicket[];
}

export async function getExpoPushReceipts(receiptIds: string[], fetchImpl: FetchLike = fetch) {
  if (receiptIds.length === 0) return {};
  const response = await fetchImpl(EXPO_PUSH_RECEIPTS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids: receiptIds }),
  });
  const body = await readExpoJson(response);
  return (body?.data ?? {}) as Record<string, ExpoPushReceipt>;
}

export async function sendPushDelivery({
  delivery,
  pushToken,
  candidate,
  now,
  fetchImpl = fetch,
  updateDelivery,
  markTokenInvalid,
}: {
  delivery: DeliveryRecord;
  pushToken: PushToken;
  candidate: NotificationCandidate;
  now: Date;
  fetchImpl?: FetchLike;
  updateDelivery: (
    update: Partial<DeliveryRecord> & {
      provider_message_id?: string | null;
      error_code?: string | null;
      last_attempt_at?: string;
      updated_at?: string;
    }
  ) => Promise<void>;
  markTokenInvalid: (errorCode: string) => Promise<void>;
}) {
  const attemptUpdate = {
    attempt_count: delivery.attempt_count + 1,
    last_attempt_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  if (!isExpoPushToken(pushToken.token)) {
    await updateDelivery({
      ...attemptUpdate,
      status: "invalid_token",
      error_code: "InvalidExpoPushToken",
    });
    await markTokenInvalid("InvalidExpoPushToken");
    return "invalid_token" as const;
  }

  try {
    const [ticket] = await sendExpoPushMessages(
      [buildPrivacySafePushMessage(candidate, pushToken.token)],
      fetchImpl
    );

    if (!ticket) {
      await updateDelivery({
        ...attemptUpdate,
        status: "failed",
        error_code: "MissingExpoTicket",
      });
      return "failed" as const;
    }

    if (ticket.status === "error") {
      const errorCode = ticket.details?.error ?? ticket.message ?? "ExpoTicketError";
      const status = isPermanentExpoTokenFailure(errorCode) ? "invalid_token" : "failed";
      await updateDelivery({
        ...attemptUpdate,
        status,
        error_code: errorCode,
      });
      if (status === "invalid_token") {
        await markTokenInvalid(errorCode);
      }
      return status;
    }

    await updateDelivery({
      ...attemptUpdate,
      status: "sent",
      provider_message_id: ticket.id,
      error_code: null,
    });

    const receipts = await getExpoPushReceipts([ticket.id], fetchImpl);
    const receipt = receipts[ticket.id];
    if (receipt?.status === "error") {
      const errorCode = receipt.details?.error ?? receipt.message ?? "ExpoReceiptError";
      const status = isPermanentExpoTokenFailure(errorCode) ? "invalid_token" : "failed";
      await updateDelivery({
        status,
        error_code: errorCode,
        updated_at: now.toISOString(),
      });
      if (status === "invalid_token") {
        await markTokenInvalid(errorCode);
      }
      return status;
    }

    return "sent" as const;
  } catch (error) {
    await updateDelivery({
      ...attemptUpdate,
      status: "failed",
      error_code: error instanceof Error ? error.message : "ExpoPushError",
    });
    return "failed" as const;
  }
}

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  data: Record<string, unknown>;
};

// One notification to deliver to every device a user has. `onDelivered` runs
// after at least one device accepted it, so cadence state only advances when a
// notification actually went out.
type NotificationUnit = {
  build: (token: string) => ExpoPushMessage;
  onDelivered?: () => Promise<void>;
};

export async function runPushReminderJob({
  supabase,
  now = new Date(),
  fetchImpl = fetch,
}: {
  supabase: SupabaseClient;
  now?: Date;
  fetchImpl?: FetchLike;
}) {
  const results = {
    users: 0,
    candidates: 0,
    notifications: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    invalid_token: 0,
  };

  const { data: tokens, error: tokenError } = await supabase
    .from("push_tokens")
    .select("id, user_id, token")
    .eq("provider", "expo")
    .eq("status", "active");

  if (tokenError) throw new Error(tokenError.message);
  const activeTokens = (tokens ?? []) as PushToken[];
  if (activeTokens.length === 0) return results;

  const tokensByUser = new Map<string, PushToken[]>();
  for (const token of activeTokens) {
    const existing = tokensByUser.get(token.user_id) ?? [];
    existing.push(token);
    tokensByUser.set(token.user_id, existing);
  }

  const userIds = [...tokensByUser.keys()];
  const { data: settingsRows, error: settingsError } = await supabase
    .from("settings")
    .select(
      "user_id, push_followups_enabled, push_birthdays_enabled, push_important_moments_enabled, notification_timezone, last_app_open_at, created_at"
    )
    .in("user_id", userIds);

  if (settingsError) throw new Error(settingsError.message);

  for (const settings of (settingsRows ?? []) as PushSettings[]) {
    const userTokens = tokensByUser.get(settings.user_id) ?? [];
    if (userTokens.length === 0) continue;
    if (
      !settings.push_followups_enabled &&
      !settings.push_birthdays_enabled &&
      !settings.push_important_moments_enabled
    ) {
      continue;
    }

    // Users are only processed during the single half-hour cron slot that
    // contains their timezone's deterministic 5pm-8pm target minute for today
    // (see getDailyTargetSendMinutes). Everyone else waits for a later run.
    if (!isTimezoneInSendSlot(now, settings.notification_timezone)) {
      results.skipped++;
      continue;
    }

    results.users++;
    const localDate = getLocalNotificationDate(now, settings.notification_timezone ?? FALLBACK_TIMEZONE);
    const today = toDay(localDate) ?? now;
    const nowIso = now.toISOString();

    const { data: scheduleRows, error: scheduleError } = await supabase
      .from("person_notification_schedule")
      .select("id, person_id, notification_type, last_notified_at, notify_count")
      .eq("user_id", settings.user_id);
    if (scheduleError) throw new Error(scheduleError.message);

    const overdueScheduleByPerson = new Map<string, NotificationScheduleRow>();
    let inactivityRow: NotificationScheduleRow | null = null;
    for (const row of (scheduleRows ?? []) as NotificationScheduleRow[]) {
      if (row.notification_type === "overdue_reminder" && row.person_id) {
        overdueScheduleByPerson.set(row.person_id, row);
      } else if (row.notification_type === "inactivity_nudge" && !row.person_id) {
        inactivityRow = row;
      }
    }

    const { data: people, error: peopleError } = await supabase
      .from("people")
      .select("*")
      .eq("user_id", settings.user_id);
    if (peopleError) throw new Error(peopleError.message);

    const personRows = (people ?? []) as Person[];
    const personsById = new Map(personRows.map((person) => [person.id, person]));

    let candidates: NotificationCandidate[] = [];
    if (personRows.length > 0) {
      const personIds = personRows.map((person) => person.id);
      const { data: interactions, error: interactionsError } = await supabase
        .from("interactions")
        .select("*")
        .in("person_id", personIds)
        .eq("follow_up_needed", true);
      if (interactionsError) throw new Error(interactionsError.message);

      const { data: importantMoments, error: importantMomentsError } = await supabase
        .from("important_moments")
        .select("*")
        .eq("user_id", settings.user_id);
      if (importantMomentsError) throw new Error(importantMomentsError.message);

      candidates = selectNotificationCandidates({
        settings,
        people: personRows,
        interactions: (interactions ?? []) as Interaction[],
        importantMoments: (importantMoments ?? []) as ImportantMoment[],
        today,
      });
    }
    results.candidates += candidates.length;

    const toReminderPerson = (personId: string): ReminderPerson => {
      const person = personsById.get(personId);
      return { personId, firstName: person ? getFirstName(person.name) : null };
    };

    // Group candidates: one combined overdue notification, one combined
    // due-today notification, and individual birthday / important-moment
    // notifications for dates that are actually today.
    const overduePersonIds: string[] = [];
    const dueTodayPersonIds: string[] = [];
    const seenOverdue = new Set<string>();
    const seenDueToday = new Set<string>();
    const momentCandidates: NotificationCandidate[] = [];

    for (const candidate of candidates) {
      if (candidate.kind === "follow_up_overdue" && candidate.personId) {
        if (!seenOverdue.has(candidate.personId)) {
          seenOverdue.add(candidate.personId);
          overduePersonIds.push(candidate.personId);
        }
      } else if (candidate.kind === "follow_up_due" && candidate.personId) {
        if (!seenDueToday.has(candidate.personId)) {
          seenDueToday.add(candidate.personId);
          dueTodayPersonIds.push(candidate.personId);
        }
      } else if (
        (candidate.kind === "birthday" || candidate.kind === "important_moment") &&
        candidate.scheduledFor === localDate
      ) {
        momentCandidates.push(candidate);
      }
    }

    // A person both overdue and due today only appears in the overdue group.
    const dueTodayOnly = dueTodayPersonIds.filter((personId) => !seenOverdue.has(personId));

    // Anyone with a schedule row who is no longer overdue had an interaction
    // logged; delete their row so the cadence restarts from scratch if they
    // ever become overdue again.
    const staleScheduleIds = [...overdueScheduleByPerson.values()]
      .filter((row) => row.person_id && !seenOverdue.has(row.person_id))
      .map((row) => row.id);
    if (staleScheduleIds.length > 0) {
      const { error: staleError } = await supabase
        .from("person_notification_schedule")
        .delete()
        .in("id", staleScheduleIds);
      if (staleError) throw new Error(staleError.message);
    }

    const eligibleOverdue = overduePersonIds
      .filter((personId) => isOverdueReminderEligible(overdueScheduleByPerson.get(personId), now))
      .map(toReminderPerson);

    const units: NotificationUnit[] = [];

    if (eligibleOverdue.length > 0) {
      units.push({
        build: (token) => buildOverdueGroupMessage(eligibleOverdue, token),
        onDelivered: async () => {
          for (const person of eligibleOverdue) {
            const existing = overdueScheduleByPerson.get(person.personId);
            if (existing) {
              const { error } = await supabase
                .from("person_notification_schedule")
                .update({ notify_count: existing.notify_count + 1, last_notified_at: nowIso })
                .eq("id", existing.id);
              if (error) throw new Error(error.message);
            } else {
              const { error } = await supabase.from("person_notification_schedule").insert({
                user_id: settings.user_id,
                person_id: person.personId,
                notification_type: "overdue_reminder",
                notify_count: 1,
                last_notified_at: nowIso,
              });
              if (error) throw new Error(error.message);
            }
          }
        },
      });
    }

    if (dueTodayOnly.length > 0) {
      const dueTodayPeople = dueTodayOnly.map(toReminderPerson);
      units.push({
        build: (token) => buildDueTodayGroupMessage(dueTodayPeople, token),
      });
    }

    for (const candidate of momentCandidates) {
      const person = candidate.personId ? personsById.get(candidate.personId) : undefined;
      const firstName = person ? getFirstName(person.name) : null;
      units.push({
        build: (token) =>
          firstName
            ? buildPersonalizedPushMessage(candidate, token, firstName)
            : buildPrivacySafePushMessage(candidate, token),
      });
    }

    const nudgeDecision = decideInactivityNudge({
      lastAppOpenAt: settings.last_app_open_at,
      accountCreatedAt: settings.created_at,
      row: inactivityRow,
      now,
    });

    if (nudgeDecision.action === "delete" && inactivityRow) {
      const { error } = await supabase
        .from("person_notification_schedule")
        .delete()
        .eq("id", inactivityRow.id);
      if (error) throw new Error(error.message);
    } else if (nudgeDecision.action === "send") {
      const existingNudgeRow = inactivityRow;
      units.push({
        build: (token) => buildInactivityNudgeMessage(token),
        onDelivered: async () => {
          if (existingNudgeRow) {
            const { error } = await supabase
              .from("person_notification_schedule")
              .update({ notify_count: nudgeDecision.notifyCount, last_notified_at: nowIso })
              .eq("id", existingNudgeRow.id);
            if (error) throw new Error(error.message);
          } else {
            const { error } = await supabase.from("person_notification_schedule").insert({
              user_id: settings.user_id,
              person_id: null,
              notification_type: "inactivity_nudge",
              notify_count: nudgeDecision.notifyCount,
              last_notified_at: nowIso,
            });
            if (error) throw new Error(error.message);
          }
        },
      });
    }

    results.notifications += units.length;

    for (const unit of units) {
      let delivered = false;
      for (const token of userTokens) {
        if (!isExpoPushToken(token.token)) {
          results.invalid_token++;
          continue;
        }

        try {
          const [ticket] = await sendExpoPushMessages([unit.build(token.token)], fetchImpl);

          if (!ticket || ticket.status === "error") {
            results.failed++;
          } else {
            results.sent++;
            delivered = true;
          }
        } catch {
          results.failed++;
        }
      }
      if (delivered && unit.onDelivered) {
        await unit.onDelivered();
      }
    }
  }

  console.log(
    `Push job complete: users=${results.users} skipped_out_of_window=${results.skipped} candidates=${results.candidates} notifications=${results.notifications} sent=${results.sent} failed=${results.failed} invalid_token=${results.invalid_token}`
  );
  return results;
}
