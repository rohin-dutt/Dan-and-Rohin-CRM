import { writeFile } from "node:fs/promises";

import { expect, type Page, type TestInfo } from "@playwright/test";

export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;
}

export async function createPerson(
  page: Page,
  name: string,
  fields: { company?: string; notes?: string } = {}
) {
  await page.goto("/people/new");
  await page.locator("#name").fill(name);
  if (fields.company) {
    await page.locator("#company").fill(fields.company);
  }
  if (fields.notes) {
    await page.locator("#notes").fill(fields.notes);
  }
  await page.getByRole("button", { name: "Add person" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

export function exportPayloadWithPerson(name: string) {
  const now = new Date().toISOString();
  const personId = crypto.randomUUID();

  return {
    exported_at: now,
    people: [
      {
        id: personId,
        user_id: crypto.randomUUID(),
        name,
        email: null,
        phone: null,
        company: "E2E Imported Company",
        role: null,
        location: null,
        birthday: null,
        how_met: null,
        relationship_type: null,
        relationship_strength: null,
        preferred_contact_method: null,
        contact_frequency_days: 30,
        last_contacted_at: null,
        notes: "Imported by signed-in Playwright smoke coverage.",
        created_at: now,
      },
    ],
    interactions: [],
    tags: [],
    person_tags: [],
  };
}

export async function writeJsonPayload(
  testInfo: TestInfo,
  filename: string,
  payload: unknown
) {
  const filePath = testInfo.outputPath(filename);
  await writeFile(filePath, JSON.stringify(payload, null, 2));
  return filePath;
}
