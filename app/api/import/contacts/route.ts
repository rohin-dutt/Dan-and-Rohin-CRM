import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

interface IncomingContact {
  name?: string
  email?: string | string[]
  tel?: string | string[]
}

export async function POST(request: NextRequest) {
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

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const contacts: IncomingContact[] = body.contacts ?? []

  let imported = 0
  const errors: string[] = []

  for (const contact of contacts) {
    if (!contact.name) continue

    const email = Array.isArray(contact.email) ? contact.email[0] : contact.email
    const phone = Array.isArray(contact.tel) ? contact.tel[0] : contact.tel

    const { error } = await supabase.from('people').insert({
      name: contact.name,
      email: email ?? null,
      phone: phone ?? null,
      user_id: user.id,
      contact_frequency_days: 30,
    })

    if (error) {
      errors.push(`Failed to import "${contact.name}": ${error.message}`)
    } else {
      imported++
    }
  }

  return NextResponse.json({ imported, errors })
}
