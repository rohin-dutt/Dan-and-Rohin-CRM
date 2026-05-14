import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test as setup } from "@playwright/test";

const authFile = "tests/e2e/.auth/local-user.json";

async function getAuthTokenIssuedAt(page: Page) {
  const authCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")
  );
  if (!authCookie?.value.startsWith("base64-")) return null;

  try {
    const session = JSON.parse(
      Buffer.from(authCookie.value.slice("base64-".length), "base64").toString(
        "utf8"
      )
    );
    const token = session?.access_token;
    if (typeof token !== "string") return null;

    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const payload = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8")
    );
    return typeof payload.iat === "number" ? payload.iat : null;
  } catch {
    return null;
  }
}

setup("create authenticated local user", async ({ page }) => {
  await mkdir(dirname(authFile), { recursive: true });

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const email = `e2e-${suffix}@example.test`;
  const password = `E2e-password-${suffix}`;

  await page.goto("/auth/signup");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Confirm email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect
    .poll(async () => {
      const issuedAt = await getAuthTokenIssuedAt(page);
      return issuedAt !== null && Math.floor(Date.now() / 1000) >= issuedAt;
    }, { timeout: 10_000 })
    .toBe(true);
  await page.context().storageState({ path: authFile });
});
