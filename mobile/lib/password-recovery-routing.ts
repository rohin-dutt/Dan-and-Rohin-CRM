import type { PasswordRecoveryFailureReason } from "@/lib/password-recovery-link"

export type PasswordRecoveryStatus = "idle" | "exchanging" | "ready" | "failed"

export type PasswordRecoveryRouteDecision =
  | { type: "none" }
  | { type: "hold" }
  | {
      type: "replace"
      href: {
        pathname: "/(auth)/update-password" | "/(auth)/forgot-password"
        params?: { recoveryError: PasswordRecoveryFailureReason }
      }
    }

// The single source of truth for where password recovery routing is allowed
// to send the user. The root layout's routing effect is the only place that
// acts on these decisions: it runs only while <Slot /> is mounted, so the
// navigator is guaranteed to be ready. Navigating from anywhere else (async
// continuations, timers, screen-level listeners) can fire while the root
// loading gate is showing instead of <Slot />, where expo-router throws
// "Attempted to navigate before mounting the Root Layout component" — the
// cause of the recovery flow freezing on a spinner.
export function decidePasswordRecoveryRoute(input: {
  recoveryStatus: PasswordRecoveryStatus
  segments: string[]
  failureReason: PasswordRecoveryFailureReason | null
}): PasswordRecoveryRouteDecision {
  const { recoveryStatus, segments, failureReason } = input
  const inAuthGroup = segments[0] === "(auth)"
  const inUpdatePassword =
    inAuthGroup && segments.join("/") === "(auth)/update-password"

  if (recoveryStatus === "idle") return { type: "none" }

  // The bounded exchange timeout resolves this state; never navigate mid-flight.
  if (recoveryStatus === "exchanging") return { type: "hold" }

  if (recoveryStatus === "ready") {
    if (inUpdatePassword) return { type: "hold" }
    return { type: "replace", href: { pathname: "/(auth)/update-password" } }
  }

  // Failed: quarantine on auth routes so a late recovery session cannot enter
  // the app, but never leave the user parked on the update-password form.
  if (inAuthGroup && !inUpdatePassword) return { type: "hold" }
  return {
    type: "replace",
    href: {
      pathname: "/(auth)/forgot-password",
      params: { recoveryError: failureReason ?? "exchange_failed" },
    },
  }
}
