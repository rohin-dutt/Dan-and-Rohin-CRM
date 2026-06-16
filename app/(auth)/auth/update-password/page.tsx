'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type RecoveryState = 'checking' | 'ready' | 'invalid' | 'saved'

function getAuthParams() {
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  return {
    code: searchParams.get('code'),
    accessToken:
      searchParams.get('access_token') ?? hashParams.get('access_token'),
    refreshToken:
      searchParams.get('refresh_token') ?? hashParams.get('refresh_token'),
  }
}

function cleanRecoveryUrl() {
  window.history.replaceState(null, '', window.location.pathname)
}

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recoveryState, setRecoveryState] =
    useState<RecoveryState>('checking')

  useEffect(() => {
    let cancelled = false

    async function prepareRecoverySession() {
      const { code, accessToken, refreshToken } = getAuthParams()
      let hasSession = false

      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          hasSession = !error && Boolean(data.session)
        } else if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          hasSession = !error && Boolean(data.session)
        } else {
          const { data } = await supabase.auth.getSession()
          hasSession = Boolean(data.session)
        }
      } catch {
        hasSession = false
      } finally {
        if (code || accessToken || refreshToken) {
          cleanRecoveryUrl()
        }
      }

      if (!cancelled) {
        setRecoveryState(hasSession ? 'ready' : 'invalid')
      }
    }

    prepareRecoverySession()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (recoveryState !== 'ready') {
      setError('This password reset link is invalid or has expired.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Unable to update your password. Request a new reset link and try again.')
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setRecoveryState('saved')
    setLoading(false)

    setTimeout(() => {
      router.push('/auth/login')
    }, 1500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Choose a new password
        </h1>

        {recoveryState === 'checking' ? (
          <div className="mt-6 rounded-md bg-gray-50 p-4 text-sm text-muted-foreground">
            Checking your reset link...
          </div>
        ) : recoveryState === 'invalid' ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              This password reset link is invalid or has expired. Request a new
              link to choose a new password.
            </div>
            <Link
              href="/auth/forgot-password"
              className="inline-flex w-full justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Request a new reset link
            </Link>
          </div>
        ) : recoveryState === 'saved' ? (
          <div className="mt-6 rounded-md bg-green-50 p-4 text-sm text-green-700">
            Password updated successfully. Redirecting to sign in...
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
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
