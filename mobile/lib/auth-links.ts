import { supabase } from "@/lib/supabase"

export type PasswordRecoveryFailureReason =
  | "invalid_or_expired"
  | "missing_credentials"
  | "exchange_failed"

export type AuthLinkResult =
  | { handled: false }
  | { handled: true; ok: true }
  | {
      handled: true
      ok: false
      reason: PasswordRecoveryFailureReason
    }

export const PASSWORD_RECOVERY_ERROR_MESSAGE =
  "This reset link is invalid or has expired. Request a new link to continue."

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

  fragmentParams.forEach((value, key) => params.set(key, value))
  return params
}

function failureReasonForExchange(error: { status?: number } | null): PasswordRecoveryFailureReason {
  if (error?.status && error.status >= 400 && error.status < 500) {
    return "invalid_or_expired"
  }

  return "exchange_failed"
}

export async function handlePasswordRecoveryUrl(url: string): Promise<AuthLinkResult> {
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
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error || !data.session) {
        return {
          handled: true,
          ok: false,
          reason: error ? failureReasonForExchange(error) : "exchange_failed",
        }
      }

      return { handled: true, ok: true }
    }

    if (accessToken || refreshToken) {
      if (!accessToken || !refreshToken) {
        return { handled: true, ok: false, reason: "missing_credentials" }
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error || !data.session) {
        return {
          handled: true,
          ok: false,
          reason: error ? failureReasonForExchange(error) : "exchange_failed",
        }
      }

      return { handled: true, ok: true }
    }

    return { handled: true, ok: false, reason: "missing_credentials" }
  } catch {
    return { handled: true, ok: false, reason: "exchange_failed" }
  }
}
