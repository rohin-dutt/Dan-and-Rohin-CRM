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

await test("bounds operations that never settle", async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 5),
    OperationTimeoutError,
  );
  assert.equal(await withTimeout(Promise.resolve("ok"), 100), "ok");
});
