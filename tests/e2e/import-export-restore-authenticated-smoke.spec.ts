import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import {
  createPerson,
  exportPayloadWithPerson,
  uniqueName,
  writeJsonPayload,
} from "./authenticated-helpers";

test.describe("signed-in import, export, and restore smoke coverage", () => {
  test("exports data, imports an update file, and restores replacement data", async ({
    page,
  }, testInfo) => {
    const exportedPerson = uniqueName("E2E Exported Person");
    const importedPerson = uniqueName("E2E Imported Person");
    const restoredPerson = uniqueName("E2E Restored Person");

    await createPerson(page, exportedPerson);

    await page.goto("/people");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export Data" }).click();
    const download = await downloadPromise;
    const exportPath = testInfo.outputPath("crm-export.json");
    await download.saveAs(exportPath);

    const exported = JSON.parse(await readFile(exportPath, "utf8"));
    expect(exported.people.some((person: { name?: string }) => person.name === exportedPerson)).toBe(
      true
    );

    const importPath = await writeJsonPayload(
      testInfo,
      "crm-import.json",
      exportPayloadWithPerson(importedPerson)
    );
    await page.goto("/settings");
    await page.locator('input[type="file"]').setInputFiles(importPath);
    await page.getByRole("button", { name: "Import / update" }).click();
    await expect(page.getByText("Import completed.")).toBeVisible();

    await page.goto("/people");
    await expect(page.getByText(exportedPerson)).toBeVisible();
    await expect(page.getByText(importedPerson)).toBeVisible();

    const restorePath = await writeJsonPayload(
      testInfo,
      "crm-restore.json",
      exportPayloadWithPerson(restoredPerson)
    );
    await page.goto("/settings");
    await page.locator('input[type="file"]').setInputFiles(restorePath);
    await page.getByRole("button", { name: "Restore and replace" }).click();
    await expect(page.getByText("Restore completed.")).toBeVisible();

    await page.goto("/people");
    await expect(page.getByText(restoredPerson)).toBeVisible();
    await expect(page.getByText(exportedPerson)).toHaveCount(0);
    await expect(page.getByText(importedPerson)).toHaveCount(0);
  });
});
