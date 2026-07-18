import { supabase } from "@/lib/supabase"
import type { Session } from "@supabase/supabase-js"
import {
  parsePasswordRecoveryUrl,
  type PasswordRecoveryFailureReason,
} from "@/lib/password-recovery-link"

export {
  isPasswordRecoveryUrl,
  type PasswordRecoveryFailureReason,
} from "@/lib/password-recovery-link"

export type AuthLinkResult =
  | { handled: false }
  | { handled: true; ok: true; session: Session }
  | {
      handled: true
      ok: false
      reason: PasswordRecoveryFailureReason
    }

export const PASSWORD_RECOVERY_ERROR_MESSAGES: Record<
  PasswordRecoveryFailureReason,
  string
> = {
  invalid_or_expired:
    "This reset link is invalid or has expired. Request a new link to continue.",
  missing_credentials:
    "This reset link is incomplete. Request a new link to continue.",
  exchange_failed:
    "We couldn't open this reset link. Check your connection and request a new link.",
}

// A successful password update or explicit sign-in can release recovery-only
// routing. Failures stay quarantined on auth routes so a late recovery session
// cannot send the user into the app before the password is changed.
export const PASSWORD_RECOVERY_RESOLVED_EVENT = "passwordRecoveryResolved"
export const PASSWORD_RECOVERY_FAILED_EVENT = "passwordRecoveryFailed"

function failureReasonForExchange(error: { status?: number } | null): PasswordRecoveryFailureReason {
  if (error?.status && error.status >= 400 && error.status < 500) {
    return "invalid_or_expired"
  }

  return "exchange_failed"
}

export async function handlePasswordRecoveryUrl(url: string): Promise<AuthLinkResult> {
  const parsedLink = parsePasswordRecoveryUrl(url)

  if (!parsedLink.handled || !parsedLink.ok) return parsedLink

  try {
    if (parsedLink.credentials.kind === "code") {
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        parsedLink.credentials.code,
      )

      if (error || !data.session) {
        return {
          handled: true,
          ok: false,
          reason: error ? failureReasonForExchange(error) : "exchange_failed",
        }
      }

      return { handled: true, ok: true, session: data.session }
    }

    const { data, error } = await supabase.auth.setSession({
      access_token: parsedLink.credentials.accessToken,
      refresh_token: parsedLink.credentials.refreshToken,
    })

    if (error || !data.session) {
      return {
        handled: true,
        ok: false,
        reason: error ? failureReasonForExchange(error) : "exchange_failed",
      }
    }

    return { handled: true, ok: true, session: data.session }
  } catch {
    return { handled: true, ok: false, reason: "exchange_failed" }
  }
}
