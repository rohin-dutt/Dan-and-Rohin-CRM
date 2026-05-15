'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[560px] space-y-6">

        {/* Header */}
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Welcome to Roots
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Let&apos;s set up your contacts
          </h1>
          <p className="mt-2 text-muted-foreground">
            Add the people you want to stay in touch with. You can always add more later.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">

          {/* Card 1 — Add manually (primary) */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="font-semibold text-foreground">Add your first contact</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with someone you want to stay in touch with — a friend, mentor, or colleague.
            </p>
            <Link
              href="/people/new"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Add a contact
            </Link>
          </div>

          {/* Card 2 — Skip */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold text-foreground">Skip for now</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Go straight to your dashboard. You can add contacts anytime.
            </p>
            <Link
              href="/dashboard"
              className="mt-3 inline-block text-sm text-muted-foreground underline hover:text-foreground"
            >
              Go to dashboard
            </Link>
          </div>

        </div>

      </div>
    </div>
  )
}
