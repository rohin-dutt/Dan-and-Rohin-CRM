import assert from "node:assert/strict";

import {
  categorizePeople,
  findDuplicateContacts,
  getFollowUpState,
  getFollowUpQueue,
  getBirthdayReminders,
  getTotalInteractions,
  getNextActionDays,
  getNextDueDays,
  getRelationshipStatus,
  getUpcomingMoments,
  isTouchPoint,
  shouldTouchLastContacted,
} from "../packages/shared/index.ts";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("dashboard categorization covers steady-state contacts", () => {
  const today = new Date("2026-05-11T12:00:00Z");
  const people = [
    {
      id: "recent",
      last_contacted_at: "2026-05-09",
      contact_frequency_days: 30,
    },
    {
      id: "coming",
      last_contacted_at: "2026-04-11",
      contact_frequency_days: 90,
    },
    {
      id: "due",
      last_contacted_at: "2026-04-15",
      contact_frequency_days: 30,
    },
    {
      id: "overdue",
      last_contacted_at: "2026-03-01",
      contact_frequency_days: 30,
    },
    {
      id: "never",
      last_contacted_at: null,
      contact_frequency_days: 30,
    },
  ];

  const sections = categorizePeople(people, today);
  const categorizedIds = [
    ...sections.recentlyContacted,
    ...sections.comingUp,
    ...sections.dueThisWeek,
    ...sections.overdue,
    ...sections.neglected,
  ].map((person) => person.id);

  assert.deepEqual(categorizedIds.sort(), people.map((person) => person.id).sort());
  assert.equal(sections.comingUp[0].id, "coming");
});

test("historical interactions do not replace newer last-contacted dates", () => {
  assert.equal(shouldTouchLastContacted(null, "2026-05-01"), true);
  assert.equal(shouldTouchLastContacted("2026-05-10", "2026-05-11"), true);
  assert.equal(shouldTouchLastContacted("2026-05-10", "2026-04-30"), false);
});

test("cadence starts from created date before the first interaction", () => {
  const today = new Date("2026-05-11T12:00:00Z");

  assert.equal(
    getNextDueDays(
      {
        id: "created-today",
        created_at: "2026-05-11T09:00:00Z",
        last_contacted_at: null,
        contact_frequency_days: 30,
      },
      today
    ),
    30
  );

  assert.equal(
    getNextDueDays(
      {
        id: "created-29-days-ago",
        created_at: "2026-04-12T09:00:00Z",
        last_contacted_at: null,
        contact_frequency_days: 30,
      },
      today
    ),
    1
  );
  assert.equal(
    getRelationshipStatus(
      {
        id: "created-29-days-ago",
        created_at: "2026-04-12T09:00:00Z",
        last_contacted_at: null,
        contact_frequency_days: 30,
      },
      today
    ),
    "due_this_week"
  );

  assert.equal(
    getNextDueDays(
      {
        id: "created-31-days-ago",
        created_at: "2026-04-10T09:00:00Z",
        last_contacted_at: null,
        contact_frequency_days: 30,
      },
      today
    ),
    -1
  );
  assert.equal(
    getRelationshipStatus(
      {
        id: "created-31-days-ago",
        created_at: "2026-04-10T09:00:00Z",
        last_contacted_at: null,
        contact_frequency_days: 30,
      },
      today
    ),
    "overdue"
  );
});

test("cadence uses last-contacted date when an interaction exists", () => {
  const today = new Date("2026-05-11T12:00:00Z");

  assert.equal(
    getNextDueDays(
      {
        id: "contacted",
        created_at: "2026-01-01T09:00:00Z",
        last_contacted_at: "2026-05-01",
        contact_frequency_days: 30,
      },
      today
    ),
    20
  );
});

test("new contacts without interactions are not categorized as recently contacted", () => {
  const today = new Date("2026-05-11T12:00:00Z");
  const person = {
    id: "created-today",
    created_at: "2026-05-11T09:00:00Z",
    last_contacted_at: null,
    contact_frequency_days: 30,
  };

  const sections = categorizePeople([person], today);

  assert.deepEqual(sections.recentlyContacted, []);
  assert.deepEqual(sections.comingUp.map((item) => item.id), ["created-today"]);
});

test("open follow-up dates still take precedence over later cadence dates", () => {
  const today = new Date("2026-05-11T12:00:00Z");
  const person = {
    id: "follow-up-first",
    created_at: "2026-05-11T09:00:00Z",
    last_contacted_at: null,
    contact_frequency_days: 30,
  };
  const interactions = [
    {
      id: "open-follow-up",
      person_id: "follow-up-first",
      type: "Call",
      is_touch_point: true,
      follow_up_needed: true,
      follow_up_date: "2026-05-14",
      follow_up_status: "open",
    },
  ];

  assert.equal(getNextActionDays(person, "2026-05-14", today), 3);

  const sections = categorizePeople([person], today, interactions);
  assert.deepEqual(sections.dueThisWeek.map((item) => item.id), ["follow-up-first"]);
});

test("follow-up queue separates overdue, due, done, and snoozed states", () => {
  const today = new Date("2026-05-11T12:00:00Z");
  const interactions = [
    {
      id: "overdue",
      follow_up_needed: true,
      follow_up_date: "2026-05-01",
      follow_up_status: "open",
      date: "2026-04-30",
    },
    {
      id: "due",
      follow_up_needed: true,
      follow_up_date: "2026-05-12",
      follow_up_status: "open",
      date: "2026-05-10",
    },
    {
      id: "done",
      follow_up_needed: true,
      follow_up_date: "2026-05-01",
      follow_up_status: "done",
      date: "2026-04-30",
    },
    {
      id: "snoozed",
      follow_up_needed: true,
      follow_up_date: "2026-05-01",
      follow_up_status: "snoozed",
      follow_up_snoozed_until: "2026-05-18",
      date: "2026-04-30",
    },
  ];

  const queue = getFollowUpQueue(interactions, today);
  assert.deepEqual(queue.overdue.map((item) => item.id), ["overdue"]);
  assert.deepEqual(queue.due.map((item) => item.id), ["due"]);
  assert.deepEqual(queue.done.map((item) => item.id), ["done"]);
  assert.deepEqual(queue.snoozed.map((item) => item.id), ["snoozed"]);
});

test("note interactions are not counted as touch points", () => {
  const interactions = [
    { id: "call", type: "Call", is_touch_point: true },
    { id: "note-type", type: "Note", is_touch_point: true },
    { id: "note-flag", type: "Text", is_touch_point: false },
  ];

  assert.equal(isTouchPoint(interactions[0]), true);
  assert.equal(isTouchPoint(interactions[1]), false);
  assert.equal(isTouchPoint(interactions[2]), false);
  assert.equal(getTotalInteractions(interactions), 1);
});

test("follow-up state transitions expired snoozes back into due or overdue", () => {
  const today = new Date("2026-05-11T12:00:00Z");

  assert.equal(
    getFollowUpState(
      {
        follow_up_needed: true,
        follow_up_date: "2026-05-12",
        follow_up_status: "snoozed",
        follow_up_snoozed_until: "2026-05-13",
      },
      today
    ),
    "snoozed"
  );
  assert.equal(
    getFollowUpState(
      {
        follow_up_needed: true,
        follow_up_date: "2026-05-12",
        follow_up_status: "snoozed",
        follow_up_snoozed_until: "2026-05-10",
      },
      today
    ),
    "due"
  );
  assert.equal(
    getFollowUpState(
      {
        follow_up_needed: true,
        follow_up_date: "2026-05-01",
        follow_up_status: "snoozed",
        follow_up_snoozed_until: "2026-05-10",
      },
      today
    ),
    "overdue"
  );
});

test("duplicate detection normalizes email, names, accents, and punctuation", () => {
  const people = [
    { id: "email-a", name: "Ada One", email: "ADA@example.com" },
    { id: "email-b", name: "Ada Two", email: "ada@example.com" },
    { id: "name-a", name: "Jose Alvarez", email: null },
    { id: "name-b", name: "José   Alvarez!", email: null },
    { id: "unique", name: "Grace Hopper", email: "grace@example.com" },
  ];

  const warnings = findDuplicateContacts(people);

  assert.match(warnings.get("email-a"), /email/);
  assert.match(warnings.get("email-b"), /email/);
  assert.match(warnings.get("name-a"), /name/);
  assert.match(warnings.get("name-b"), /name/);
  assert.equal(warnings.has("unique"), false);
});

test("birthday reminders use month and day without requiring a year", () => {
  const today = new Date("2026-06-01T12:00:00Z");
  const people = [
    {
      id: "unknown-year",
      name: "No Year",
      birthday_month: 6,
      birthday_day: 10,
      birthday_year: null,
      birthday: null,
    },
    {
      id: "known-year",
      name: "Known Year",
      birthday_month: 6,
      birthday_day: 11,
      birthday_year: 1990,
      birthday: "1990-06-11",
    },
  ];

  const reminders = getBirthdayReminders(people, today, 14);
  assert.deepEqual(reminders.map(({ person }) => person.id), ["unknown-year", "known-year"]);

  const moments = getUpcomingMoments(people, [], today, 14);
  assert.deepEqual(moments.map((moment) => moment.sourceDate), ["Jun 10", "Jun 11, 1990"]);
});
