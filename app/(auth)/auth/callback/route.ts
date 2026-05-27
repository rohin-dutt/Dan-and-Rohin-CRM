// SUPABASE URL CONFIGURATION REMINDER
// In the Supabase dashboard under Authentication → URL Configuration, set:
//
// Site URL:
//   https://dan-and-rohin-crm.vercel.app
//
// Redirect URLs (add both):
//   https://dan-and-rohin-crm.vercel.app/**
//   https://dan-and-rohin-crm.vercel.app/auth/update-password
//   https://useroots.app/**
//   https://useroots.app/auth/callback
//   https://useroots.app/auth/callback?type=recovery

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Create the response first so the Supabase client can write session
  // cookies directly onto it before the redirect is sent.
  const response = NextResponse.redirect(new URL('/onboarding', request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const user = data.session.user

  const type = searchParams.get("type")
  if (type === "recovery") {
    const recoveryResponse = NextResponse.redirect(
      new URL('/auth/update-password', request.url)
    )
    response.cookies.getAll().forEach(({ name, value, ...options }) =>
      recoveryResponse.cookies.set(name, value, options)
    )
    return recoveryResponse
  }

  const { count, error: countError } = await supabase
    .from('people')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (!countError && count !== null && count > 0) {
    const dashboardResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    response.cookies.getAll().forEach(({ name, value, ...options }) =>
      dashboardResponse.cookies.set(name, value, options)
    )
    return dashboardResponse
  }

  return response
}
