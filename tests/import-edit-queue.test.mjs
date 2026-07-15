import assert from "node:assert/strict";
import test from "node:test";

import {
  clearPendingImportEditQueue,
  parseImportEditQueue,
  parsePendingImportEditQueue,
  serializeImportEditQueue,
  setPendingImportEditQueue,
} from "../mobile/lib/import-edit-queue.ts";

const PERSON_IDS = [
  "550e8400-e29b-41d4-a716-446655440000",
  "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  "7d444840-9dc0-41d1-b245-5ffdce74fad2",
  "4d444840-9dc0-41d1-8245-5ffdce74fad2",
];

test("serializes one to three unique person IDs", () => {
  assert.equal(serializeImportEditQueue(PERSON_IDS.slice(0, 3)), JSON.stringify(PERSON_IDS.slice(0, 3)));
  assert.equal(serializeImportEditQueue([]), null);
  assert.equal(serializeImportEditQueue(PERSON_IDS), null);
  assert.equal(serializeImportEditQueue([PERSON_IDS[0], PERSON_IDS[0]]), null);
  assert.equal(serializeImportEditQueue(["not-a-person-id"]), null);
});

test("parses a queue only when the current person and progress match", () => {
  const routePersonIds = PERSON_IDS.slice(0, 3);
  const serializedIds = JSON.stringify(routePersonIds);

  assert.deepEqual(
    parseImportEditQueue({
      currentPersonId: PERSON_IDS[1],
      serializedIds,
      rawIndex: "1",
    }),
    { ids: routePersonIds, index: 1 },
  );

  assert.equal(
    parseImportEditQueue({
      currentPersonId: PERSON_IDS[0],
      serializedIds,
      rawIndex: "1",
    }),
    null,
  );
  assert.equal(
    parseImportEditQueue({
      currentPersonId: PERSON_IDS[0],
      serializedIds,
      rawIndex: "3",
    }),
    null,
  );
  assert.equal(
    parseImportEditQueue({
      currentPersonId: PERSON_IDS[0],
      serializedIds: [serializedIds],
      rawIndex: "0",
    }),
    null,
  );
  assert.equal(
    parseImportEditQueue({
      currentPersonId: PERSON_IDS[0],
      serializedIds: JSON.stringify(PERSON_IDS),
      rawIndex: "0",
    }),
    null,
  );
});

test("keeps a validated larger import queue in memory", () => {
  clearPendingImportEditQueue();
  assert.equal(setPendingImportEditQueue(PERSON_IDS), true);
  assert.deepEqual(
    parsePendingImportEditQueue({
      currentPersonId: PERSON_IDS[3],
      rawQueueFlag: "1",
      rawIndex: "3",
    }),
    { ids: PERSON_IDS, index: 3 },
  );

  assert.equal(
    parsePendingImportEditQueue({
      currentPersonId: PERSON_IDS[0],
      rawQueueFlag: "1",
      rawIndex: "3",
    }),
    null,
  );
  assert.equal(
    parsePendingImportEditQueue({
      currentPersonId: PERSON_IDS[0],
      rawQueueFlag: ["1"],
      rawIndex: "0",
    }),
    null,
  );

  clearPendingImportEditQueue();
  assert.equal(
    parsePendingImportEditQueue({
      currentPersonId: PERSON_IDS[0],
      rawQueueFlag: "1",
      rawIndex: "0",
    }),
    null,
  );
});

test("rejects invalid pending queue IDs and clears any previous queue", () => {
  assert.equal(setPendingImportEditQueue(PERSON_IDS), true);
  assert.equal(setPendingImportEditQueue(["not-a-person-id"]), false);
  assert.equal(
    parsePendingImportEditQueue({
      currentPersonId: PERSON_IDS[0],
      rawQueueFlag: "1",
      rawIndex: "0",
    }),
    null,
  );
});
