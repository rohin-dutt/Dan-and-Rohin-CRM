// SUPABASE URL CONFIGURATION REMINDER
// In the Supabase dashboard under Authentication → URL Configuration, set:
//
// Site URL:
//   https://dan-and-rohin-crm.vercel.app
//
// Redirect URLs (add both):
//   https://dan-and-rohin-crm.vercel.app/**
//   https://dan-and-rohin-crm.vercel.app/auth/update-password

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    // Cookies to write once we know the destination URL.
    const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // Read from the incoming request — this is where the PKCE code
          // verifier cookie lives (set during signup).
          getAll() {
            return request.cookies.getAll()
          },
          // Buffer the session cookies; we apply them to the redirect
          // response below so the browser receives them in one round-trip.
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              pendingCookies.push({ name, value, options })
            })
          },
        },
      }
    )

    // Step 1: exchange the code for a session.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    // Step 2: confirm the session was actually created before doing anything else.
    if (!error && data.session) {
      const user = data.session.user

      // Step 3: check whether this user has any contacts yet.
      let redirectPath = '/dashboard'

      const { count, error: countError } = await supabase
        .from('people')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // Step 4 & 5: route new users to onboarding, returning users to dashboard.
      if (!countError && count === 0) {
        redirectPath = '/onboarding'
      }

      const response = NextResponse.redirect(`${origin}${redirectPath}`)

      // Apply the session cookies directly onto this response so the browser
      // receives them even though we are returning a redirect.
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })

      return response
    }
  }

  // Step 6: fallback — code missing, exchange failed, or session was null.
  return NextResponse.redirect(`${origin}/auth/login`)
}
