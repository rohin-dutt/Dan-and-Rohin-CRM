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
    hourCycle: "h23",
  }).formatToParts(value);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    date: `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`,
    hour: Number(byType.get("hour")),
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

function isDuplicateDeliveryError(error: { code?: string; message?: string } | null) {
  return error?.code === "23505" || /duplicate key/i.test(error?.message ?? "");
}

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
      "user_id, push_followups_enabled, push_birthdays_enabled, push_important_moments_enabled, notification_timezone"
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

    if (!isInNotificationSendWindow(now, settings.notification_timezone)) {
      continue;
    }

    results.users++;
    const localDate = getLocalNotificationDate(now, settings.notification_timezone ?? FALLBACK_TIMEZONE);
    const today = toDay(localDate) ?? now;

    const { data: people, error: peopleError } = await supabase
      .from("people")
      .select("*")
      .eq("user_id", settings.user_id);
    if (peopleError) throw new Error(peopleError.message);

    const personRows = (people ?? []) as Person[];
    if (personRows.length === 0) continue;

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

    const candidates = selectNotificationCandidates({
      settings,
      people: personRows,
      interactions: (interactions ?? []) as Interaction[],
      importantMoments: (importantMoments ?? []) as ImportantMoment[],
      today,
    });
    results.candidates += candidates.length;

    for (const candidate of candidates) {
      for (const token of userTokens) {
        const idempotencyKey = buildPushIdempotencyKey(candidate, token.id);
        const { data: insertedDelivery, error: insertError } = await supabase
          .from("notification_deliveries")
          .insert({
            user_id: settings.user_id,
            push_token_id: token.id,
            kind: candidate.kind,
            subject_type: candidate.subjectType,
            subject_id: candidate.subjectId,
            scheduled_for: candidate.scheduledFor,
            send_after: now.toISOString(),
            idempotency_key: idempotencyKey,
            status: "pending",
          })
          .select("id, attempt_count, status")
          .single();

        let delivery = insertedDelivery as DeliveryRecord | null;
        if (insertError) {
          if (!isDuplicateDeliveryError(insertError)) {
            throw new Error(insertError.message);
          }

          const { data: existingDelivery, error: existingError } = await supabase
            .from("notification_deliveries")
            .select("id, attempt_count, status")
            .eq("idempotency_key", idempotencyKey)
            .single();
          if (existingError) throw new Error(existingError.message);
          delivery = existingDelivery as DeliveryRecord;
          if (delivery.status !== "failed" && delivery.status !== "pending") {
            results.skipped++;
            continue;
          }

          if (delivery.attempt_count >= 3) {
            const { error } = await supabase
              .from("notification_deliveries")
              .update({
                status: "skipped",
                error_code: "MaxAttemptsExceeded",
                updated_at: now.toISOString(),
              })
              .eq("id", delivery.id);
            if (error) throw new Error(error.message);
            results.skipped++;
            continue;
          }
        }

        if (!delivery) {
          results.skipped++;
          continue;
        }

        const status = await sendPushDelivery({
          delivery,
          pushToken: token,
          candidate,
          now,
          fetchImpl,
          updateDelivery: async (update) => {
            const { error } = await supabase
              .from("notification_deliveries")
              .update(update)
              .eq("id", delivery.id);
            if (error) throw new Error(error.message);
          },
          markTokenInvalid: async (errorCode) => {
            const { error } = await supabase
              .from("push_tokens")
              .update({
                status: "invalid",
                revoked_at: now.toISOString(),
                updated_at: now.toISOString(),
              })
              .eq("id", token.id);
            if (error) throw new Error(error.message);

            await supabase
              .from("notification_deliveries")
              .update({
                error_code: errorCode,
                updated_at: now.toISOString(),
              })
              .eq("id", delivery.id);
          },
        });

        results[status]++;
      }
    }
  }

  return results;
}
