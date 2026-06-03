import { supabase } from "@/lib/supabase"

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL

type TrustedApiOptions = {
  method?: "GET" | "POST" | "DELETE"
  body?: unknown
}

export async function callTrustedApi(path: string, options: TrustedApiOptions = {}) {
  if (!apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not configured.")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error("You must be signed in.")
  }

  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}${path}`, {
    method: options.method ?? "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Request failed.")
  }

  return data
}
