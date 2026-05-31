'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import { todayInputValue } from '@/lib/date-utils'
import { INTERACTION_TYPES } from '@/lib/form-utils'
import { updateStreakAfterAction } from '@/lib/crm-rules'
import { supabase } from '@/lib/supabase'

const ONBOARDING_CATEGORY_PILLS = [
  { label: 'Friend', tagName: 'Friend', tagColor: '#16A34A', selectedClass: 'bg-green-600 text-white border-green-600' },
  { label: 'Family', tagName: 'Family', tagColor: '#2563EB', selectedClass: 'bg-amber-500 text-white border-amber-500' },
  { label: 'Professional', tagName: 'Colleague', tagColor: '#D97706', selectedClass: 'bg-sky-500 text-white border-sky-500' },
] as const

const ONBOARDING_FREQ_OPTIONS = [
  { label: 'Every week', value: 7 },
  { label: 'Every 2 weeks', value: 14 },
  { label: 'Every month', value: 30 },
  { label: 'Every 3 months', value: 90 },
  { label: 'Every 6 months', value: 180 },
  { label: 'Once a year', value: 365 },
] as const

export default function OnboardingPage() {
  const router = useRouter()

  // Auth
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // Flow
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [savedPersonId, setSavedPersonId] = useState<string | null>(null)
  const [lastSavedFirstName, setLastSavedFirstName] = useState('')

  // Step 2 form
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [birthday, setBirthday] = useState('')
  const [relationship, setRelationship] = useState('')
  const [howMet, setHowMet] = useState('')
  const [selectedFreq, setSelectedFreq] = useState(30)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Step 3 form
  const [interactionType, setInteractionType] = useState('Call')
  const [interactionDate, setInteractionDate] = useState(todayInputValue())
  const [interactionNotes, setInteractionNotes] = useState('')
  const [step3Saving, setStep3Saving] = useState(false)
  const [step3Error, setStep3Error] = useState<string | null>(null)

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
    setCompany('')
    setRole('')
    setBirthday('')
    setRelationship('')
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

    const isProfessional = selectedCategory === 'Professional'
    const isFamily = selectedCategory === 'Family'
    const hasBirthday = selectedCategory === 'Friend' || isFamily

    const name = [trimmedFirst, lastName.trim()].filter(Boolean).join(' ')

    const { data, error: insertError } = await supabase
      .from('people')
      .insert({
        user_id: user.id,
        name,
        how_met: howMet.trim() || null,
        contact_frequency_days: selectedFreq,
        company: isProfessional && company.trim() ? company.trim() : null,
        role: isProfessional && role.trim() ? role.trim() : null,
        birthday: hasBirthday && birthday ? birthday : null,
        relationship_type: isFamily && relationship.trim() ? relationship.trim() : null,
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

    setSavedPersonId(data.id)
    setLastSavedFirstName(trimmedFirst)
    resetForm()
    setSaving(false)
    setStep(3)
  }

  async function handleSaveInteraction() {
    if (!savedPersonId) return
    setStep3Saving(true)
    setStep3Error(null)

    const { error } = await supabase.rpc('create_interaction_and_touch_person', {
      p_person_id: savedPersonId,
      p_type: interactionType,
      p_date: interactionDate,
      p_notes: interactionNotes.trim() || null,
      p_follow_up_needed: false,
      p_follow_up_date: null,
      p_follow_up_status: 'done',
    })

    if (error) {
      setStep3Error(error.message ?? 'Failed to save. Please try again.')
      setStep3Saving(false)
      return
    }

    await updateStreakAfterAction(supabase)
    router.push('/dashboard')
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

          <p className="mt-4 text-xs text-muted-foreground">
            We&apos;ll send you a weekly email with who to reach out to. You can turn this off anytime in Settings.
          </p>

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

  // ── Step 2 — Add one person ───────────────────────────────────────────────
  const showProfessionalFields = selectedCategory === 'Professional'
  const showFamilyFields = selectedCategory === 'Family'
  const showBirthday = selectedCategory === 'Friend' || showFamilyFields

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
              Who&apos;s someone you want to stay close to?
            </h1>
            <p className="text-sm text-muted-foreground">
              A friend you&apos;ve lost touch with, a colleague worth keeping up
              with, or family you mean to call more.
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
                      onClick={() => setSelectedCategory(selected ? '' : label)}
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

            {/* Professional — Company + Role */}
            <div className={showProfessionalFields ? 'grid grid-cols-2 gap-3' : 'hidden'}>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Friend or Family — Birthday */}
            <div className={showBirthday ? '' : 'hidden'}>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Birthday
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* Family — Relationship label */}
            <div className={showFamilyFields ? '' : 'hidden'}>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Relationship e.g. parent, sibling
              </label>
              <input
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className={inputClass}
              />
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
        </div>
      </div>
    )
  }

  // ── Step 3 — Log first interaction ────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <p className="mb-8 text-xs text-muted-foreground tracking-wide">
        Step 3 of 3
      </p>

      <div className="w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          <img src="/logo.svg" alt="Roots" width={28} height={28} />
        </div>

        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            When did you last talk to {lastSavedFirstName}?
          </h1>
          <p className="text-sm text-muted-foreground">
            This gives Roots the context it needs to remind you at the right time.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-5">
          {step3Error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {step3Error}{' '}
              <button
                onClick={() => router.push('/dashboard')}
                className="font-medium underline"
              >
                Skip anyway →
              </button>
            </div>
          )}

          {/* Interaction type */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              How did you connect?
            </p>
            <div className="flex flex-wrap gap-2">
              {INTERACTION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setInteractionType(type)}
                  className={`${pillBase} ${
                    interactionType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              When?
            </label>
            <input
              type="date"
              value={interactionDate}
              onChange={(e) => setInteractionDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Notes (optional)
            </label>
            <textarea
              rows={3}
              value={interactionNotes}
              onChange={(e) => setInteractionNotes(e.target.value)}
              placeholder="What did you talk about?"
              className={inputClass}
            />
          </div>

          <button
            onClick={handleSaveInteraction}
            disabled={step3Saving}
            className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 disabled:opacity-50"
          >
            {step3Saving ? 'Saving…' : 'Save and see my dashboard →'}
          </button>

          <div className="text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-muted-foreground hover:underline"
            >
              Skip — I&apos;ll add this later →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
