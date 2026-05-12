// SUPABASE URL CONFIGURATION REMINDER
// In the Supabase dashboard under Authentication → URL Configuration, set:
//
// Site URL:
//   https://dan-and-rohin-crm.vercel.app
//
// Redirect URLs (add both):
//   https://dan-and-rohin-crm.vercel.app/**
//   https://dan-and-rohin-crm.vercel.app/auth/update-password

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { count, error: countError } = await supabase
          .from('people')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        if (!countError && count === 0) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}
