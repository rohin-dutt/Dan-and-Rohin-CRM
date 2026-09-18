import assert from "node:assert/strict";

import {
  findPasswordRecoveryUrl,
  isPasswordRecoveryUrl,
  parsePasswordRecoveryUrl,
} from "../mobile/lib/password-recovery-link.ts";
import {
  OperationTimeoutError,
  withTimeout,
} from "../mobile/lib/promise-timeout.ts";
import { decidePasswordRecoveryRoute } from "../mobile/lib/password-recovery-routing.ts";

async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

await test("recognizes only the Roots update-password deep link", () => {
  assert.equal(isPasswordRecoveryUrl("roots://update-password"), true);
  assert.equal(isPasswordRecoveryUrl("roots://update-password/"), true);
  assert.equal(isPasswordRecoveryUrl("roots://update-password/other"), false);
  assert.equal(isPasswordRecoveryUrl("https://useroots.app/update-password"), false);
  assert.equal(isPasswordRecoveryUrl("roots://login"), false);
  assert.equal(isPasswordRecoveryUrl("not a url"), false);
});

await test("finds a recovery URL when the primary linking source is missing or unrelated", () => {
  const recoveryUrl =
    "roots://update-password#access_token=access&refresh_token=refresh&type=recovery";

  assert.equal(findPasswordRecoveryUrl(null, recoveryUrl), recoveryUrl);
  assert.equal(findPasswordRecoveryUrl("roots://", recoveryUrl), recoveryUrl);
  assert.equal(findPasswordRecoveryUrl("roots://login", null), null);
});

await test("parses PKCE recovery codes from the query", () => {
  assert.deepEqual(
    parsePasswordRecoveryUrl("roots://update-password?code=pkce%2Bcode"),
    {
      handled: true,
      ok: true,
      credentials: { kind: "code", code: "pkce+code" },
    },
  );
});

await test("parses implicit recovery tokens from the fragment", () => {
  assert.deepEqual(
    parsePasswordRecoveryUrl(
      "roots://update-password#access_token=access-token&refresh_token=refresh-token&type=recovery",
    ),
    {
      handled: true,
      ok: true,
      credentials: {
        kind: "tokens",
        accessToken: "access-token",
        refreshToken: "refresh-token",
      },
    },
  );
});

await test("fragment credentials take precedence over query values", () => {
  const result = parsePasswordRecoveryUrl(
    "roots://update-password?access_token=query#access_token=fragment&refresh_token=refresh",
  );

  assert.equal(result.handled, true);
  assert.equal(result.ok, true);
  if (result.handled && result.ok && result.credentials.kind === "tokens") {
    assert.equal(result.credentials.accessToken, "fragment");
  }
});

await test("maps provider errors to an expired-link result", () => {
  assert.deepEqual(
    parsePasswordRecoveryUrl(
      "roots://update-password#error=access_denied&error_code=otp_expired",
    ),
    { handled: true, ok: false, reason: "invalid_or_expired" },
  );
});

await test("rejects missing and partial recovery credentials", () => {
  assert.deepEqual(parsePasswordRecoveryUrl("roots://update-password"), {
    handled: true,
    ok: false,
    reason: "missing_credentials",
  });
  assert.deepEqual(
    parsePasswordRecoveryUrl("roots://update-password#access_token=only-one-token"),
    { handled: true, ok: false, reason: "missing_credentials" },
  );
});

await test("leaves unrelated links unhandled", () => {
  assert.deepEqual(parsePasswordRecoveryUrl("roots://login?code=not-recovery"), {
    handled: false,
  });
});

await test("never navigates while a recovery exchange is in flight", () => {
  for (const segments of [[], ["(auth)", "login"], ["(app)", "(tabs)", "dashboard"]]) {
    assert.deepEqual(
      decidePasswordRecoveryRoute({
        recoveryStatus: "exchanging",
        segments,
        failureReason: null,
      }),
      { type: "hold" },
    );
  }
});

await test("stays out of normal routing when recovery is idle", () => {
  assert.deepEqual(
    decidePasswordRecoveryRoute({
      recoveryStatus: "idle",
      segments: ["(auth)", "login"],
      failureReason: null,
    }),
    { type: "none" },
  );
});

await test("forces the update-password form after a successful exchange", () => {
  assert.deepEqual(
    decidePasswordRecoveryRoute({
      recoveryStatus: "ready",
      segments: ["(auth)", "login"],
      failureReason: null,
    }),
    { type: "replace", href: { pathname: "/(auth)/update-password" } },
  );
  assert.deepEqual(
    decidePasswordRecoveryRoute({
      recoveryStatus: "ready",
      segments: ["(auth)", "update-password"],
      failureReason: null,
    }),
    { type: "hold" },
  );
});

await test("routes a failed exchange to forgot-password with its reason", () => {
  assert.deepEqual(
    decidePasswordRecoveryRoute({
      recoveryStatus: "failed",
      segments: ["(app)", "(tabs)", "dashboard"],
      failureReason: "invalid_or_expired",
    }),
    {
      type: "replace",
      href: {
        pathname: "/(auth)/forgot-password",
        params: { recoveryError: "invalid_or_expired" },
      },
    },
  );
  assert.deepEqual(
    decidePasswordRecoveryRoute({
      recoveryStatus: "failed",
      segments: [],
      failureReason: null,
    }),
    {
      type: "replace",
      href: {
        pathname: "/(auth)/forgot-password",
        params: { recoveryError: "exchange_failed" },
      },
    },
  );
});

await test("failure never leaves the user parked on the update-password form", () => {
  assert.deepEqual(
    decidePasswordRecoveryRoute({
      recoveryStatus: "failed",
      segments: ["(auth)", "update-password"],
      failureReason: "invalid_or_expired",
    }),
    {
      type: "replace",
      href: {
        pathname: "/(auth)/forgot-password",
        params: { recoveryError: "invalid_or_expired" },
      },
    },
  );
});

await test("failure quarantines other auth routes without redirect loops", () => {
  for (const segments of [["(auth)", "forgot-password"], ["(auth)", "login"]]) {
    assert.deepEqual(
      decidePasswordRecoveryRoute({
        recoveryStatus: "failed",
        segments,
        failureReason: "exchange_failed",
      }),
      { type: "hold" },
    );
  }
});

await test("bounds operations that never settle", async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 5),
    OperationTimeoutError,
  );
  assert.equal(await withTimeout(Promise.resolve("ok"), 100), "ok");
});
