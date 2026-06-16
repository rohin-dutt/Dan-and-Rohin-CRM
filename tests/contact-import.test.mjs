import assert from "node:assert/strict";

import {
  mapDeviceContact,
  toContactImportDraft,
} from "../mobile/lib/contact-import.ts";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("contact mapper keeps one-name contacts editable and maps birthday parts", () => {
  const candidate = mapDeviceContact(
    {
      id: "contact-1",
      name: "Prince",
      emails: [{ label: "home", email: "prince@example.com" }],
      phoneNumbers: [{ label: "mobile", number: "5551234567", digits: "5551234567", countryCode: "US" }],
      birthday: { month: 5, day: 7 },
      company: "Paisley Park",
      jobTitle: "Artist",
    },
    [],
  );

  assert.ok(candidate);
  assert.equal(candidate.firstName, "Prince");
  assert.equal(candidate.lastName, "");
  assert.deepEqual(candidate.birthday, { month: 6, day: 7, year: null });

  const draft = toContactImportDraft(candidate);
  assert.equal(draft.company, "Paisley Park");
  assert.equal(draft.role, "Artist");
});

test("contact mapper prefers explicit first and last name fields", () => {
  const candidate = mapDeviceContact(
    {
      id: "contact-2",
      name: "Ada Lovelace",
      firstName: "Ada",
      lastName: "Lovelace",
      birthday: { month: 11, day: 10, year: 1815 },
    },
    [{ id: "person-1", name: "Ada Lovelace", email: null, phone: null }],
  );

  assert.ok(candidate);
  assert.equal(candidate.name, "Ada Lovelace");
  assert.equal(candidate.duplicateReason, "Name matches an existing person");
  assert.deepEqual(candidate.birthday, { month: 12, day: 10, year: 1815 });
});
