import { expect, test } from "@playwright/test";

test.describe("unauthenticated smoke coverage", () => {
  test("public and auth pages render", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /Stay close to the people who matter most\./,
      })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" }).first()).toBeVisible();

    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm email")).toBeVisible();
  });

  test("policy and legal pages are public", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(
      page.getByRole("heading", { name: "Privacy policy" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    await page.goto("/terms");
    await expect(page).toHaveURL(/\/terms$/);
    await expect(
      page.getByRole("heading", { name: "Terms of service" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  for (const path of ["/dashboard", "/onboarding", "/people", "/settings"]) {
    test(`logged-out ${path} redirects to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/auth\/login$/);
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    });
  }

  test("logged-out API routes return JSON auth errors", async ({ request }) => {
    const exportResponse = await request.get("/api/export");
    expect(exportResponse.status()).toBe(401);
    expect(exportResponse.headers()["content-type"]).toContain("application/json");
    const exportBody = await exportResponse.json();
    expect(exportBody).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: "unauthorized",
          message: expect.any(String),
        }),
      })
    );

    const importResponse = await request.post("/api/import/contacts", {
      data: { contacts: [] },
    });
    expect(importResponse.status()).toBe(401);
    expect(importResponse.headers()["content-type"]).toContain("application/json");
    const importBody = await importResponse.json();
    expect(importBody).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: "unauthorized",
          message: expect.any(String),
        }),
      })
    );

    const pushTokenResponse = await request.post("/api/mobile/push-token", {
      data: { token: "ExponentPushToken[test]" },
    });
    expect(pushTokenResponse.status()).toBe(401);
    expect(pushTokenResponse.headers()["content-type"]).toContain("application/json");
    const pushTokenBody = await pushTokenResponse.json();
    expect(pushTokenBody).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: "unauthorized",
          message: expect.any(String),
        }),
      })
    );
  });
});
