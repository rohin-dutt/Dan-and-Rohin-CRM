'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAuthCallbackUrl } from '@/lib/site-url'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (email !== confirmEmail) {
      setError('Email addresses do not match.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
      },
    })

    if (error) {
      setError(error.message)
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('duplicate-email')
    } else if (data.session) {
      router.push('/onboarding')
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Check your email</h1>
          <p className="mb-6 text-zinc-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            activate your account.
          </p>
          <Link href="/auth/login" className="text-sm font-medium text-zinc-900 underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Personal CRM
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Create an account
        </h1>

        {error && (
          <p className="mb-4 mt-6 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error === 'duplicate-email' ? (
              <>
                An account with this email already exists.{' '}
                <Link href="/auth/login" className="font-medium underline">
                  Please sign in instead.
                </Link>
              </>
            ) : (
              error
            )}
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

          <div>
            <label
              htmlFor="confirmEmail"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Confirm email
            </label>
            <input
              id="confirmEmail"
              type="email"
              required
              placeholder="Confirm your email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-zinc-900 underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
