'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

const ONBOARDING_CATEGORY_PILLS = [
  { label: 'Friend', tagName: 'Friend', tagColor: '#16A34A', selectedClass: 'bg-green-600 text-white border-green-600' },
  { label: 'Family', tagName: 'Family', tagColor: '#2563EB', selectedClass: 'bg-amber-500 text-white border-amber-500' },
  { label: 'Professional', tagName: 'Colleague', tagColor: '#D97706', selectedClass: 'bg-sky-500 text-white border-sky-500' },
] as const

const ONBOARDING_FREQ_OPTIONS = [
  { label: 'Weekly', value: 7 },
  { label: 'Monthly', value: 30 },
  { label: 'Quarterly', value: 90 },
] as const

export default function OnboardingPage() {
  const router = useRouter()

  // Auth
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // Flow
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [savedCount, setSavedCount] = useState(0)
  const [lastSavedFirstName, setLastSavedFirstName] = useState('')

  // Step 2 form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [howMet, setHowMet] = useState('')
  const [selectedFreq, setSelectedFreq] = useState(30)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/auth/login')
        return
      }
      setUser(currentUser)
      setLoading(false)
    }
    checkAuth()
  }, [router])

  function resetForm() {
    setFirstName('')
    setLastName('')
    setSelectedCategory('')
    setHowMet('')
    setSelectedFreq(30)
    setFormError(null)
  }

  async function handleSavePerson() {
    const trimmedFirst = firstName.trim()
    if (!trimmedFirst) {
      setFormError('First name is required.')
      return
    }
    if (!user) return

    setSaving(true)
    setFormError(null)

    const name = [trimmedFirst, lastName.trim()].filter(Boolean).join(' ')

    const { data, error: insertError } = await supabase
      .from('people')
      .insert({
        user_id: user.id,
        name,
        how_met: howMet.trim() || null,
        contact_frequency_days: selectedFreq,
      })
      .select()
      .single()

    if (insertError || !data) {
      setFormError(insertError?.message ?? 'Failed to save. Please try again.')
      setSaving(false)
      return
    }

    // Best-effort: attach relationship type tag
    if (selectedCategory) {
      const catPill = ONBOARDING_CATEGORY_PILLS.find(
        (p) => p.label === selectedCategory
      )
      if (catPill) {
        const { data: existingArr } = await supabase
          .from('tags')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', catPill.tagName)
          .limit(1)

        let tagId: string | null = existingArr?.[0]?.id ?? null

        if (!tagId) {
          const { data: newTag } = await supabase
            .from('tags')
            .insert({ user_id: user.id, name: catPill.tagName, color: catPill.tagColor })
            .select('id')
            .single()
          tagId = newTag?.id ?? null
        }

        if (tagId) {
          await supabase
            .from('person_tags')
            .insert({ person_id: data.id, tag_id: tagId })
        }
      }
    }

    setSavedCount((c) => c + 1)
    setLastSavedFirstName(trimmedFirst)
    resetForm()
    setSaving(false)
    setStep(3)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputClass =
    'w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const pillBase = 'rounded-full border px-4 py-1.5 text-sm font-medium transition'

  // ── Step 1 — Welcome ──────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
        <p className="mb-10 text-xs text-muted-foreground tracking-wide">
          Step 1 of 3
        </p>

        <div className="w-full max-w-lg space-y-8 text-center">
          <img
            src="/logo.svg"
            alt="Roots"
            width={48}
            height={48}
            className="mx-auto"
          />

          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              Stay close to the people who matter.
            </h1>
            <p className="text-base text-muted-foreground">
              Roots reminds you to reach out, tracks your interactions, and
              makes sure no one important slips away.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setStep(2)}
              className="w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              Let&apos;s get started →
            </button>
            <p className="text-xs text-muted-foreground">Takes about 2 minutes.</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2 — Add first person ─────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
        <p className="mb-8 text-xs text-muted-foreground tracking-wide">
          Step 2 of 3
        </p>

        <div className="w-full max-w-lg space-y-6">
          <div className="flex justify-center">
            <img src="/logo.svg" alt="Roots" width={28} height={28} />
          </div>

          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              Who&apos;s someone you&apos;ve been meaning to reach out to?
            </h1>
            <p className="text-sm text-muted-foreground">
              Start with one person — a friend you&apos;ve lost touch with, a
              colleague worth keeping up with, or family you mean to call more.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-5">
            {formError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alex"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Last name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Relationship type */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Relationship type
              </p>
              <div className="flex flex-wrap gap-2">
                {ONBOARDING_CATEGORY_PILLS.map(({ label, selectedClass }) => {
                  const selected = selectedCategory === label
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(selected ? '' : label)
                      }
                      className={`${pillBase} ${
                        selected
                          ? selectedClass
                          : 'border-border bg-card text-foreground hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* How did you meet? */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                How did you meet?
              </label>
              <input
                type="text"
                value={howMet}
                onChange={(e) => setHowMet(e.target.value)}
                placeholder="College, work, mutual friends…"
                className={inputClass}
              />
            </div>

            {/* Stay in touch */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Stay in touch
              </p>
              <div className="flex flex-wrap gap-2">
                {ONBOARDING_FREQ_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedFreq(value)}
                    className={`${pillBase} ${
                      selectedFreq === value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSavePerson}
              disabled={saving}
              className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add to my roots →'}
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={() => setStep(3)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Skip for now →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3 — Add more or continue ─────────────────────────────────────────
  const saved = savedCount > 0

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <p className="mb-8 text-xs text-muted-foreground tracking-wide">
        Step 3 of 3
      </p>

      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="flex justify-center">
          <img src="/logo.svg" alt="Roots" width={28} height={28} />
        </div>

        {saved ? (
          <>
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                Great start.
              </h1>
              <p className="text-sm text-muted-foreground">
                Your dashboard will show{' '}
                <span className="font-medium text-foreground">
                  {lastSavedFirstName}
                </span>{' '}
                and remind you when it&apos;s time to reach out.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  resetForm()
                  setStep(2)
                }}
                className="w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
              >
                Add another person →
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Go to my dashboard →
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                No problem.
              </h1>
              <p className="text-sm text-muted-foreground">
                You can add people anytime from your dashboard.
              </p>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              Go to my dashboard →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
