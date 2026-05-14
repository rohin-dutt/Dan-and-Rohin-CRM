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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-[560px] space-y-6">

        {/* Header */}
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Welcome to Personal CRM
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            Let&apos;s set up your contacts
          </h1>
          <p className="mt-2 text-zinc-500">
            Add the people you want to stay in touch with. You can always add more later.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">

          {/* Card 1 — Add manually (primary) */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Add your first contact</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Start with someone you want to stay in touch with — a friend, mentor, or colleague.
            </p>
            <Link
              href="/people/new"
              className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Add a contact
            </Link>
          </div>

          {/* Card 2 — Skip */}
          <div className="rounded-lg border border-zinc-100 bg-white p-5">
            <h2 className="font-semibold text-zinc-700">Skip for now</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Go straight to your dashboard. You can add contacts anytime.
            </p>
            <Link
              href="/dashboard"
              className="mt-3 inline-block text-sm text-zinc-500 underline hover:text-zinc-700"
            >
              Go to dashboard
            </Link>
          </div>

        </div>

      </div>
    </div>
  )
}
