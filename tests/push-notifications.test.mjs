import assert from "node:assert/strict";

import {
  buildPrivacySafePushMessage,
  buildPushIdempotencyKey,
  isAuthorizedPushReminderRequest,
  isPermanentExpoTokenFailure,
  selectNotificationCandidates,
  sendPushDelivery,
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
