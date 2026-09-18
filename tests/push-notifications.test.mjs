import assert from "node:assert/strict";

import {
  buildPrivacySafePushMessage,
  buildPushIdempotencyKey,
  decideInactivityNudge,
  getDailyTargetSendMinutes,
  isAuthorizedPushReminderRequest,
  isOverdueReminderEligible,
  isPermanentExpoTokenFailure,
  runPushReminderJob,
  selectNotificationCandidates,
  sendPushDelivery,
  shouldProcessUserToday,
} from "../lib/push-reminders.ts";

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const baseSettings = {
  user_id: "user-1",
  push_followups_enabled: true,
  push_birthdays_enabled: true,
  push_important_moments_enabled: true,
  notification_timezone: "America/Indianapolis",
};

function person(overrides = {}) {
  return {
    id: "person-1",
    user_id: "user-1",
    name: "Private Person",
    email: "private@example.com",
    phone: null,
    company: null,
    role: null,
    location: null,
    latitude: null,
    longitude: null,
    birthday: null,
    how_met: null,
    relationship_type: null,
    relationship_strength: null,
    preferred_contact_method: null,
    contact_frequency_days: 30,
    last_contacted_at: "2026-04-15",
    notes: "Sensitive note that must never be sent.",
    created_at: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function interaction(overrides = {}) {
  return {
    id: "interaction-1",
    person_id: "person-1",
    type: "Call",
    date: "2026-05-01",
    notes: "Private follow-up context",
    is_touch_point: true,
    follow_up_needed: true,
    follow_up_date: "2026-06-14",
    follow_up_status: "open",
    follow_up_snoozed_until: null,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

await test("notification candidate selection includes due and overdue explicit follow-ups only", () => {
  const today = new Date("2026-06-14T14:00:00Z");
  const candidates = selectNotificationCandidates({
    settings: baseSettings,
    people: [person()],
    interactions: [
      interaction({ id: "due-today", follow_up_date: "2026-06-14" }),
      interaction({ id: "overdue", follow_up_date: "2026-06-10" }),
      interaction({ id: "future", follow_up_date: "2026-06-20" }),
      interaction({ id: "done", follow_up_date: "2026-06-10", follow_up_status: "done" }),
      interaction({
        id: "snoozed",
        follow_up_date: "2026-06-10",
        follow_up_status: "snoozed",
        follow_up_snoozed_until: "2026-06-20",
      }),
    ],
    importantMoments: [],
    today,
  });

  assert.deepEqual(
    candidates.map((candidate) => [candidate.subjectId, candidate.kind]),
    [
      ["due-today", "follow_up_due"],
      ["overdue", "follow_up_overdue"],
    ]
  );
});

await test("notification candidate selection includes safe cadence check-ins separately from explicit follow-ups", () => {
  const today = new Date("2026-06-14T14:00:00Z");
  const [candidate] = selectNotificationCandidates({
    settings: baseSettings,
    people: [person({ id: "cadence-person", last_contacted_at: "2026-05-01" })],
    interactions: [],
    importantMoments: [],
    today,
  });

  assert.equal(candidate.source, "cadence_check_in");
  assert.equal(candidate.subjectType, "person");
  assert.equal(candidate.subjectId, "cadence-person");
  assert.equal(candidate.kind, "follow_up_overdue");
});

await test("notification candidate selection includes birthday and important moment eligibility", () => {
  const today = new Date("2026-06-14T14:00:00Z");
  const candidates = selectNotificationCandidates({
    settings: { ...baseSettings, push_followups_enabled: false },
    people: [person({ id: "birthday-person", birthday: "1990-06-18" })],
    interactions: [],
    importantMoments: [
      {
        id: "moment-1",
        user_id: "user-1",
        person_id: "birthday-person",
        label: "Private Label",
        date: "2025-06-15",
        recurs_yearly: true,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    today,
  });

  assert.deepEqual(
    candidates.map((candidate) => [candidate.kind, candidate.subjectType, candidate.scheduledFor]),
    [
      ["important_moment", "important_moment", "2026-06-15"],
      ["birthday", "person", "2026-06-18"],
    ]
  );
});

await test("push idempotency keys are stable and token-scoped", () => {
  const candidate = selectNotificationCandidates({
    settings: baseSettings,
    people: [person()],
    interactions: [interaction()],
    importantMoments: [],
    today: new Date("2026-06-14T14:00:00Z"),
  })[0];

  assert.equal(
    buildPushIdempotencyKey(candidate, "token-1"),
    buildPushIdempotencyKey(candidate, "token-1")
  );
  assert.notEqual(
    buildPushIdempotencyKey(candidate, "token-1"),
    buildPushIdempotencyKey(candidate, "token-2")
  );
});

await test("push payload construction is privacy-safe", () => {
  const candidate = selectNotificationCandidates({
    settings: baseSettings,
    people: [person()],
    interactions: [interaction()],
    importantMoments: [],
    today: new Date("2026-06-14T14:00:00Z"),
  })[0];
  const message = buildPrivacySafePushMessage(candidate, "ExpoPushToken[test]");
  const serialized = JSON.stringify(message);

  assert.equal(message.title, "Roots");
  assert.match(message.body, /follow-up/i);
  assert.doesNotMatch(serialized, /Private Person/);
  assert.doesNotMatch(serialized, /Sensitive note/);
  assert.doesNotMatch(serialized, /Private follow-up context/);
});

await test("protected push sender auth rejects missing or wrong cron secret", () => {
  assert.equal(isAuthorizedPushReminderRequest(null, "correct-secret"), false);
  assert.equal(isAuthorizedPushReminderRequest("Bearer wrong-secret", "correct-secret"), false);
  assert.equal(isAuthorizedPushReminderRequest("Bearer correct-secret", undefined), false);
  assert.equal(isAuthorizedPushReminderRequest("Bearer correct-secret", "correct-secret"), true);
});

await test("sender marks DeviceNotRegistered ticket failures as invalid tokens", async () => {
  const updates = [];
  const invalid = [];
  const status = await sendPushDelivery({
    delivery: { id: "delivery-1", attempt_count: 0, status: "pending" },
    pushToken: { id: "token-1", user_id: "user-1", token: "ExpoPushToken[test]" },
    candidate: selectNotificationCandidates({
      settings: baseSettings,
      people: [person()],
      interactions: [interaction()],
      importantMoments: [],
      today: new Date("2026-06-14T14:00:00Z"),
    })[0],
    now: new Date("2026-06-14T14:00:00Z"),
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              status: "error",
              message: "Device not registered",
              details: { error: "DeviceNotRegistered" },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      ),
    updateDelivery: async (update) => {
      updates.push(update);
    },
    markTokenInvalid: async (errorCode) => {
      invalid.push(errorCode);
    },
  });

  assert.equal(status, "invalid_token");
  assert.equal(updates.at(-1).status, "invalid_token");
  assert.deepEqual(invalid, ["DeviceNotRegistered"]);
  assert.equal(isPermanentExpoTokenFailure("DeviceNotRegistered"), true);
});

await test("sender handles mocked receipt failures and invalid token status updates", async () => {
  const updates = [];
  const invalid = [];
  let callCount = 0;
  const status = await sendPushDelivery({
    delivery: { id: "delivery-1", attempt_count: 0, status: "pending" },
    pushToken: { id: "token-1", user_id: "user-1", token: "ExpoPushToken[test]" },
    candidate: selectNotificationCandidates({
      settings: baseSettings,
      people: [person()],
      interactions: [interaction()],
      importantMoments: [],
      today: new Date("2026-06-14T14:00:00Z"),
    })[0],
    now: new Date("2026-06-14T14:00:00Z"),
    fetchImpl: async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(JSON.stringify({ data: [{ status: "ok", id: "receipt-1" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          data: {
            "receipt-1": {
              status: "error",
              message: "Device not registered",
              details: { error: "DeviceNotRegistered" },
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    },
    updateDelivery: async (update) => {
      updates.push(update);
    },
    markTokenInvalid: async (errorCode) => {
      invalid.push(errorCode);
    },
  });

  assert.equal(status, "invalid_token");
  assert.equal(updates[0].status, "sent");
  assert.equal(updates.at(-1).status, "invalid_token");
  assert.deepEqual(invalid, ["DeviceNotRegistered"]);
});

await test("overdue reminder cadence is daily for the first four, then every 3 days", () => {
  const now = new Date("2026-09-18T18:00:00Z");
  const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();

  assert.equal(isOverdueReminderEligible(null, now), true);
  assert.equal(
    isOverdueReminderEligible({ notify_count: 1, last_notified_at: hoursAgo(25) }, now),
    true
  );
  assert.equal(
    isOverdueReminderEligible({ notify_count: 1, last_notified_at: hoursAgo(12) }, now),
    false
  );
  assert.equal(
    isOverdueReminderEligible({ notify_count: 3, last_notified_at: hoursAgo(25) }, now),
    true
  );
  assert.equal(
    isOverdueReminderEligible({ notify_count: 4, last_notified_at: hoursAgo(73) }, now),
    true
  );
  assert.equal(
    isOverdueReminderEligible({ notify_count: 4, last_notified_at: hoursAgo(48) }, now),
    false
  );
});

await test("inactivity nudges continue weekly after the first two instead of stopping", () => {
  const now = new Date("2026-09-18T00:00:00Z");
  const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const longInactive = { lastAppOpenAt: daysAgo(40), accountCreatedAt: daysAgo(90), now };

  assert.deepEqual(
    decideInactivityNudge({
      ...longInactive,
      row: { notify_count: 2, last_notified_at: daysAgo(8) },
    }),
    { action: "send", notifyCount: 3, resetExistingRow: false }
  );
  assert.deepEqual(
    decideInactivityNudge({
      ...longInactive,
      row: { notify_count: 2, last_notified_at: daysAgo(3) },
    }),
    { action: "none" }
  );
  assert.deepEqual(
    decideInactivityNudge({
      ...longInactive,
      row: { notify_count: 6, last_notified_at: daysAgo(7) },
    }),
    { action: "send", notifyCount: 7, resetExistingRow: false }
  );
  // Opening the app recently still resets the cycle.
  assert.deepEqual(
    decideInactivityNudge({
      lastAppOpenAt: daysAgo(0.05),
      accountCreatedAt: daysAgo(90),
      now,
      row: { notify_count: 6, last_notified_at: daysAgo(7) },
    }),
    { action: "delete" }
  );
});

await test("daily processing fires in the send slot or via catch-up, at most once per day", () => {
  const localDate = "2026-09-18";
  const target = getDailyTargetSendMinutes(localDate, "UTC");
  const slotNow = new Date(
    Date.UTC(2026, 8, 18, Math.floor(target / 60), target % 60)
  );
  const beforeTarget = new Date(Date.UTC(2026, 8, 18, 10, 0));
  const afterTarget = new Date(Date.UTC(2026, 8, 18, 23, 30));

  // Primary path: inside the slot, not yet checked today.
  assert.equal(
    shouldProcessUserToday({ now: slotNow, timeZone: "UTC", lastCheckDate: null }),
    true
  );
  // Catch-up path: slot missed, but a later run the same day still catches up.
  assert.equal(
    shouldProcessUserToday({ now: afterTarget, timeZone: "UTC", lastCheckDate: "2026-09-17" }),
    true
  );
  // Before the target minute there is nothing to catch up.
  assert.equal(
    shouldProcessUserToday({ now: beforeTarget, timeZone: "UTC", lastCheckDate: null }),
    false
  );
  // Already processed today: neither path may run again.
  assert.equal(
    shouldProcessUserToday({ now: slotNow, timeZone: "UTC", lastCheckDate: localDate }),
    false
  );
  assert.equal(
    shouldProcessUserToday({ now: afterTarget, timeZone: "UTC", lastCheckDate: localDate }),
    false
  );
});

function fakeSupabaseClient(handler, log) {
  return {
    from(table) {
      const query = { table, action: "select", filters: [], payload: null };
      const builder = {
        select() {
          query.action = "select";
          return builder;
        },
        update(payload) {
          query.action = "update";
          query.payload = payload;
          return builder;
        },
        insert(payload) {
          query.action = "insert";
          query.payload = payload;
          return builder;
        },
        delete() {
          query.action = "delete";
          return builder;
        },
        eq(column, value) {
          query.filters.push([column, value]);
          return builder;
        },
        in(column, values) {
          query.filters.push([column, values]);
          return builder;
        },
        then(resolve, reject) {
          log.push(query);
          return Promise.resolve()
            .then(() => handler(query))
            .then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

await test("push job isolates one user's failure and keeps processing the rest", async () => {
  // 23:30 UTC is past every possible target minute, so both users qualify via
  // the catch-up path on a fresh day.
  const now = new Date("2026-09-18T23:30:00Z");
  const settingsRow = (userId) => ({
    user_id: userId,
    push_followups_enabled: true,
    push_birthdays_enabled: true,
    push_important_moments_enabled: true,
    notification_timezone: "UTC",
    last_app_open_at: "2026-09-18T20:00:00.000Z",
    last_notification_check_date: null,
    created_at: "2026-01-01T00:00:00.000Z",
  });

  const log = [];
  const supabase = fakeSupabaseClient((query) => {
    const userId = query.filters.find(([column]) => column === "user_id")?.[1];
    if (query.table === "push_tokens") {
      return {
        data: [
          { id: "tok-bad", user_id: "user-bad", token: "ExpoPushToken[bad]" },
          { id: "tok-good", user_id: "user-good", token: "ExpoPushToken[good]" },
        ],
        error: null,
      };
    }
    if (query.table === "settings" && query.action === "select") {
      return { data: [settingsRow("user-bad"), settingsRow("user-good")], error: null };
    }
    if (query.table === "person_notification_schedule" && query.action === "select") {
      return { data: [], error: null };
    }
    if (query.table === "people") {
      if (userId === "user-bad") return { data: null, error: { message: "boom" } };
      return { data: [person({ id: "person-good", user_id: "user-good" })], error: null };
    }
    return { data: [], error: null };
  }, log);

  const results = await runPushReminderJob({
    supabase,
    now,
    fetchImpl: async () =>
      new Response(JSON.stringify({ data: [{ status: "ok", id: "ticket-1" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });

  assert.equal(results.users, 2);
  assert.equal(results.errors, 1);
  assert.equal(results.sent, 1);

  // The failed user is never stamped as checked (so a later run can retry),
  // while the healthy user is stamped for today.
  const checkDateStamps = log.filter(
    (query) => query.table === "settings" && query.action === "update"
  );
  assert.deepEqual(
    checkDateStamps.map((query) => [
      query.filters.find(([column]) => column === "user_id")?.[1],
      query.payload.last_notification_check_date,
    ]),
    [["user-good", "2026-09-18"]]
  );

  // Cadence state advanced for the healthy user's delivered overdue reminder.
  const scheduleInserts = log.filter(
    (query) => query.table === "person_notification_schedule" && query.action === "insert"
  );
  assert.equal(scheduleInserts.length, 1);
  assert.equal(scheduleInserts[0].payload.person_id, "person-good");
});
