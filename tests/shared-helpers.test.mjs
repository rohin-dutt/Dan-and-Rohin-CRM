import assert from "node:assert/strict";

import {
  buildMomentInsertRows,
  createMomentDraft,
  formatFullDate,
  normalizeMomentDrafts,
  parseLocalDateString,
  removeMomentDraft,
  toLocalDateString,
  todayInputValue,
  updateMomentDraft,
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

test("toLocalDateString formats local calendar dates", () => {
  assert.equal(toLocalDateString(new Date(2026, 5, 10)), "2026-06-10");
  assert.equal(toLocalDateString(new Date(2026, 0, 1)), "2026-01-01");
});

test("todayInputValue matches toLocalDateString for now", () => {
  assert.equal(todayInputValue(), toLocalDateString(new Date()));
});

test("parseLocalDateString round-trips with toLocalDateString", () => {
  const parsed = parseLocalDateString("2026-06-10");
  assert.ok(parsed instanceof Date);
  assert.equal(toLocalDateString(parsed), "2026-06-10");
});

test("parseLocalDateString rejects malformed values", () => {
  assert.equal(parseLocalDateString(""), null);
  assert.equal(parseLocalDateString("2026-06"), null);
  assert.equal(parseLocalDateString("not-a-date"), null);
});

test("formatFullDate renders full month names", () => {
  assert.equal(formatFullDate(new Date(2026, 5, 10)), "June 10, 2026");
  assert.equal(formatFullDate(new Date(1990, 0, 1)), "January 1, 1990");
});

test("createMomentDraft defaults to a yearly empty draft", () => {
  assert.deepEqual(createMomentDraft(), { label: "", date: "", recurs_yearly: true });
});

test("updateMomentDraft patches only the target index", () => {
  const drafts = [createMomentDraft(), createMomentDraft()];
  const updated = updateMomentDraft(drafts, 1, { label: "Anniversary" });
  assert.equal(updated[0].label, "");
  assert.equal(updated[1].label, "Anniversary");
  assert.notEqual(updated, drafts);
});

test("removeMomentDraft drops the target index", () => {
  const drafts = [
    { label: "A", date: "2026-01-01", recurs_yearly: true },
    { label: "B", date: "2026-02-02", recurs_yearly: false },
  ];
  const removed = removeMomentDraft(drafts, 0);
  assert.equal(removed.length, 1);
  assert.equal(removed[0].label, "B");
});

test("normalizeMomentDrafts trims, drops empty drafts, and validates", () => {
  const { moments, valid } = normalizeMomentDrafts([
    { label: "  Graduation  ", date: " 2026-06-10 ", recurs_yearly: true },
    { label: "", date: "", recurs_yearly: true },
  ]);
  assert.equal(valid, true);
  assert.deepEqual(moments, [
    { label: "Graduation", date: "2026-06-10", recurs_yearly: true },
  ]);
});

test("normalizeMomentDrafts flags missing label or bad date", () => {
  assert.equal(
    normalizeMomentDrafts([{ label: "", date: "2026-06-10", recurs_yearly: true }]).valid,
    false
  );
  assert.equal(
    normalizeMomentDrafts([{ label: "Trip", date: "June 10", recurs_yearly: false }]).valid,
    false
  );
});

test("buildMomentInsertRows attaches owner and person ids", () => {
  const rows = buildMomentInsertRows("user-1", "person-1", [
    { label: "Anniversary", date: "2026-06-10", recurs_yearly: true },
  ]);
  assert.deepEqual(rows, [
    {
      user_id: "user-1",
      person_id: "person-1",
      label: "Anniversary",
      date: "2026-06-10",
      recurs_yearly: true,
    },
  ]);
});

console.log("shared-helpers tests passed");
