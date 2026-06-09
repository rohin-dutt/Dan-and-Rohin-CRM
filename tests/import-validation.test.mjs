import assert from "node:assert/strict";

import {
  parsePersonalCrmExport,
} from "../app/(app)/settings/_lib/import-validation.ts";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("import validation accepts exported people, tags, interactions, and person tags", () => {
  const payload = parsePersonalCrmExport(
    JSON.stringify({
      people: [
        {
          id: "person-1",
          user_id: "source-user",
          name: "Imported Person",
          contact_frequency_days: 30,
          created_at: "2026-05-13T00:00:00.000Z",
        },
      ],
      tags: [
        {
          id: "tag-1",
          user_id: "source-user",
          name: "Imported Tag",
          color: "#2563eb",
          created_at: "2026-05-13T00:00:00.000Z",
        },
      ],
      interactions: [
        {
          id: "interaction-1",
          person_id: "person-1",
          type: "Text",
          date: "2026-05-13",
          notes: "Imported interaction",
          follow_up_needed: true,
          follow_up_date: "2026-05-20",
          follow_up_status: "open",
          follow_up_snoozed_until: null,
          created_at: "2026-05-13T00:00:00.000Z",
        },
      ],
      person_notes: [
        {
          id: "note-1",
          user_id: "source-user",
          person_id: "person-1",
          body: "Imported note",
          note_date: "2026-05-13",
          created_at: "2026-05-13T00:00:00.000Z",
          updated_at: "2026-05-13T00:00:00.000Z",
        },
      ],
      person_tags: [{ person_id: "person-1", tag_id: "tag-1" }],
    })
  );

  assert.equal(payload.people?.[0]?.name, "Imported Person");
  assert.equal(payload.tags?.[0]?.name, "Imported Tag");
  assert.equal(payload.interactions?.[0]?.person_id, "person-1");
  assert.equal(payload.person_notes?.[0]?.body, "Imported note");
  assert.equal(payload.person_tags?.[0]?.tag_id, "tag-1");
});

test("import validation accepts older exports without person notes", () => {
  const payload = parsePersonalCrmExport(
    JSON.stringify({
      people: [
        {
          id: "person-1",
          user_id: "source-user",
          name: "Imported Person",
          contact_frequency_days: 30,
          created_at: "2026-05-13T00:00:00.000Z",
        },
      ],
      tags: [],
      interactions: [],
      person_tags: [],
    })
  );

  assert.deepEqual(payload.person_notes, []);
});

test("import validation rejects files missing required top-level arrays", () => {
  assert.throws(
    () => parsePersonalCrmExport(JSON.stringify({ people: [], interactions: [], person_tags: [] })),
    /Personal CRM export/
  );
  assert.throws(
    () => parsePersonalCrmExport(JSON.stringify({ tags: [], interactions: [], person_tags: [] })),
    /Personal CRM export/
  );
  assert.throws(
    () => parsePersonalCrmExport(JSON.stringify({ people: {}, tags: [], interactions: [], person_tags: [] })),
    /Personal CRM export/
  );
});

test("import validation rejects malformed nested records", () => {
  assert.throws(
    () =>
      parsePersonalCrmExport(
        JSON.stringify({
          people: [
            {
              id: "person-1",
              user_id: "source-user",
              name: "",
              contact_frequency_days: 30,
              created_at: "2026-05-13T00:00:00.000Z",
            },
          ],
          tags: [],
          interactions: [],
          person_tags: [],
        })
      ),
    /people\[0\]\.name/
  );

  assert.throws(
    () =>
      parsePersonalCrmExport(
        JSON.stringify({
          people: [],
          tags: [
            {
              id: "tag-1",
              user_id: "source-user",
              name: "Imported Tag",
              color: null,
              created_at: "2026-05-13T00:00:00.000Z",
            },
          ],
          interactions: [],
          person_tags: [],
        })
      ),
    /tags\[0\]\.color/
  );

  assert.throws(
    () =>
      parsePersonalCrmExport(
        JSON.stringify({
          people: [],
          tags: [],
          interactions: [
            {
              id: "interaction-1",
              person_id: "missing-person",
              type: "Text",
              date: "2026-05-13",
              follow_up_needed: true,
              follow_up_status: "open",
              created_at: "2026-05-13T00:00:00.000Z",
            },
          ],
          person_tags: [],
        })
      ),
    /unknown person/
  );

  assert.throws(
    () =>
      parsePersonalCrmExport(
        JSON.stringify({
          people: [],
          tags: [],
          interactions: [],
          person_notes: [
            {
              id: "note-1",
              user_id: "source-user",
              person_id: "missing-person",
              body: "Imported note",
              created_at: "2026-05-13T00:00:00.000Z",
              updated_at: "2026-05-13T00:00:00.000Z",
            },
          ],
          person_tags: [],
        })
      ),
    /note for an unknown person/
  );

  assert.throws(
    () =>
      parsePersonalCrmExport(
        JSON.stringify({
          people: [
            {
              id: "person-1",
              user_id: "source-user",
              name: "Imported Person",
              contact_frequency_days: 30,
              created_at: "2026-05-13T00:00:00.000Z",
            },
          ],
          tags: [],
          interactions: [],
          person_tags: [{ person_id: "person-1", tag_id: "missing-tag" }],
        })
      ),
    /unknown records/
  );
});

test("import validation rejects invalid JSON", () => {
  assert.throws(() => parsePersonalCrmExport("{not-json"), SyntaxError);
});
