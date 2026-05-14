import { expect, test } from "@playwright/test";

import { createPerson, uniqueName } from "./authenticated-helpers";

test.describe("signed-in interaction smoke coverage", () => {
  test("creates, edits, and deletes an interaction", async ({ page }) => {
    const personName = uniqueName("E2E Interaction Person");
    const originalNotes = uniqueName("E2E original interaction notes");
    const editedNotes = `${originalNotes} edited`;

    await createPerson(page, personName);

    await page.getByRole("link", { name: "Log Interaction" }).click();
    await expect(
      page.getByRole("heading", { name: `Log Interaction with ${personName}` })
    ).toBeVisible();
    await page.locator("#type").selectOption("Call");
    await page.locator("#notes").fill(originalNotes);
    await page.getByLabel("Follow-up needed").check();
    await page.locator("#follow_up_date").fill("2026-05-20");
    await page.getByRole("button", { name: "Log Interaction" }).click();

    await expect(page.getByRole("heading", { name: personName })).toBeVisible();
    await expect(page.getByText(originalNotes)).toBeVisible();

    const timeline = page.locator("section", {
      has: page.getByRole("heading", { name: "Interaction Timeline" }),
    });
    await timeline.getByRole("button", { name: "Edit" }).click();
    await timeline.locator('textarea[name="notes"]').fill(editedNotes);
    await timeline.getByRole("button", { name: "Save" }).click();

    await expect(timeline.getByText(editedNotes)).toBeVisible();
    await expect(timeline.getByText(originalNotes, { exact: true })).toHaveCount(0);

    await timeline.getByRole("button", { name: "Delete" }).click();
    await timeline.getByRole("button", { name: "Confirm" }).click();

    await expect(timeline.getByText(editedNotes)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "No interactions logged yet." })
    ).toBeVisible();
  });
});
