import assert from "node:assert/strict";

import {
  formatDate,
  formatShortDate,
} from "../lib/date-utils.ts";

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("date-only strings format as local calendar dates", () => {
  assert.equal(formatDate("2026-05-11"), "May 11, 2026");
  assert.equal(formatShortDate("2026-05-18"), "May 18");
});

test("date fallbacks are preserved", () => {
  assert.equal(formatDate(null), "Never");
  assert.equal(formatDate(undefined), "Never");
  assert.equal(formatShortDate(null), "Not set");
  assert.equal(formatShortDate(undefined), "Not set");
});

test("invalid strings return unknown", () => {
  assert.equal(formatDate("not-a-date"), "Unknown");
  assert.equal(formatShortDate("2026-02-31"), "Unknown");
});

test("date objects keep existing formatting behavior", () => {
  assert.equal(formatDate(new Date(2026, 4, 11)), "May 11, 2026");
});
