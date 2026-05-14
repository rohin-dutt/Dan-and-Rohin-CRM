import { expect, test } from "@playwright/test";

import { createPerson, uniqueName } from "./authenticated-helpers";

test.describe("signed-in people smoke coverage", () => {
  test("creates, edits, and deletes a person", async ({ page }) => {
    const originalName = uniqueName("E2E Person");
    const editedName = `${originalName} Edited`;

    await createPerson(page, originalName, {
      company: "E2E Original Company",
      notes: "Created by signed-in Playwright smoke coverage.",
    });

    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: `Edit ${originalName}` })).toBeVisible();
    await page.locator("#name").fill(editedName);
    await page.locator("#company").fill("E2E Edited Company");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByRole("heading", { name: editedName })).toBeVisible();
    await expect(page.getByText("E2E Edited Company")).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete person" }).click();

    await expect(page).toHaveURL(/\/people$/);
    await expect(page.getByRole("heading", { name: "Relationship list" })).toBeVisible();
    await page.getByLabel("Search people").fill(editedName);
    await expect(page.getByText(editedName)).toHaveCount(0);
  });
});
