export type PasswordRecoveryFailureReason =
  | "invalid_or_expired"
  | "missing_credentials"
  | "exchange_failed"

export type PasswordRecoveryCredentials =
  | { kind: "code"; code: string }
  | {
      kind: "tokens"
      accessToken: string
      refreshToken: string
    }

export type PasswordRecoveryLinkResult =
  | { handled: false }
  | {
      handled: true
      ok: true
      credentials: PasswordRecoveryCredentials
    }
  | {
      handled: true
      ok: false
      reason: PasswordRecoveryFailureReason
    }

const PASSWORD_RECOVERY_SCHEME = "roots:"
const PASSWORD_RECOVERY_HOST = "update-password"

export function isPasswordRecoveryUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return (
      parsedUrl.protocol === PASSWORD_RECOVERY_SCHEME &&
      parsedUrl.hostname === PASSWORD_RECOVERY_HOST &&
      (parsedUrl.pathname === "" || parsedUrl.pathname === "/")
    )
  } catch {
    return false
  }
}

function getAuthParams(url: string): URLSearchParams {
  const parsedUrl = new URL(url)
  const params = new URLSearchParams(parsedUrl.search)
  const fragmentParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ""))

  // Supabase's implicit flow returns tokens in the fragment, while PKCE
  // returns a code in the query. Fragment values win if both are present.
  fragmentParams.forEach((value, key) => params.set(key, value))
  return params
}

export function parsePasswordRecoveryUrl(url: string): PasswordRecoveryLinkResult {
  if (!isPasswordRecoveryUrl(url)) {
    return { handled: false }
  }

  try {
    const params = getAuthParams(url)
    const hasSupabaseError = ["error", "error_code", "error_description"].some((key) =>
      params.has(key),
    )

    if (hasSupabaseError) {
      return { handled: true, ok: false, reason: "invalid_or_expired" }
    }

    const code = params.get("code")
    if (code) {
      return {
        handled: true,
        ok: true,
        credentials: { kind: "code", code },
      }
    }

    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")

    if (accessToken || refreshToken) {
      if (!accessToken || !refreshToken) {
        return { handled: true, ok: false, reason: "missing_credentials" }
      }

      return {
        handled: true,
        ok: true,
        credentials: {
          kind: "tokens",
          accessToken,
          refreshToken,
        },
      }
    }

    return { handled: true, ok: false, reason: "missing_credentials" }
  } catch {
    return { handled: true, ok: false, reason: "exchange_failed" }
  }
}
