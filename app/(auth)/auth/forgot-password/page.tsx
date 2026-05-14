'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://dan-and-rohin-crm.vercel.app/auth/update-password',
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <Link
          href="/auth/login"
          className="mb-6 inline-flex items-center text-sm text-zinc-500 hover:text-zinc-700"
        >
          ← Back to sign in
        </Link>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-700">
            Check your email for a reset link. It may take a minute to arrive.
          </div>
        ) : (
          <>
            {error && (
              <p className="mb-4 mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
