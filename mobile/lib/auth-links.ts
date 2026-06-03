import { supabase } from "@/lib/supabase"

type AuthLinkResult =
  | { handled: false }
  | { handled: true; error?: string }

function getAuthParams(url: string): URLSearchParams {
  const queryIndex = url.indexOf("?")
  const hashIndex = url.indexOf("#")
  const search = queryIndex >= 0 ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined) : ""
  const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : ""
  return new URLSearchParams([search, hash].filter(Boolean).join("&"))
}

export async function handlePasswordRecoveryUrl(url: string): Promise<AuthLinkResult> {
  if (!url.includes("update-password")) {
    return { handled: false }
  }

  const params = getAuthParams(url)
  const code = params.get("code")
  const accessToken = params.get("access_token")
  const refreshToken = params.get("refresh_token")

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return { handled: true, error: error?.message }
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    return { handled: true, error: error?.message }
  }

  return { handled: true, error: "Password reset link is missing session credentials." }
}
