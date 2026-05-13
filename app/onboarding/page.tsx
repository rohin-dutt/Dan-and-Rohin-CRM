'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ContactEntry {
  name: string
  email: string
  tel: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [supportsContacts, setSupportsContacts] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<ContactEntry[]>([])
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState<number | null>(null)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    setSupportsContacts('contacts' in navigator)
  }, [])

  async function handleSelectContacts() {
    try {
      // @ts-expect-error Contact Picker API is not in TS types yet
      const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: true })
      const mapped: ContactEntry[] = contacts.map((c: { name?: string[]; email?: string[]; tel?: string[] }) => ({
        name: c.name?.[0] ?? '',
        email: c.email?.[0] ?? '',
        tel: c.tel?.[0] ?? '',
      }))
      setSelectedContacts(mapped)
    } catch {
      // User cancelled or API error — do nothing
    }
  }

  async function handleImport() {
    setImporting(true)
    setImportError('')

    const res = await fetch('/api/import/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts: selectedContacts }),
    })

    const json = await res.json()

    if (!res.ok) {
      setImportError(json.error ?? 'Import failed. Please try again.')
      setImporting(false)
      return
    }

    setImportSuccess(json.imported)
    setImporting(false)

    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
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

        {/* Debug info */}
        <p className="text-xs text-gray-400">
          {'Debug: contacts in navigator = ' + String('contacts' in navigator) + ' | ContactsManager in window = ' + String('ContactsManager' in window)}
        </p>

        {/* Success state */}
        {importSuccess !== null && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-sm text-green-700">
            {importSuccess} contacts imported successfully. Redirecting…
          </div>
        )}

        {/* Import options */}
        <div className="space-y-3">

          {/* Card 1 — Phone contacts (only shown if API is supported) */}
          {supportsContacts && (
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-zinc-900">Import from your phone</h2>
              <p className="mt-1 text-sm text-zinc-500">Select contacts directly from your device</p>

              {selectedContacts.length === 0 ? (
                <>
                  <button
                    onClick={handleSelectContacts}
                    className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                  >
                    Select contacts
                  </button>
                  <p className="mt-2 text-xs text-zinc-400">
                    Works on iPhone and Android. Opens your native contacts list.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-medium text-zinc-700">
                    {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
                  </p>
                  <ul className="mt-2 max-h-40 overflow-y-auto rounded-md border border-zinc-100 bg-zinc-50 divide-y divide-zinc-100">
                    {selectedContacts.map((c, i) => (
                      <li key={i} className="px-3 py-2 text-sm">
                        <span className="font-medium text-zinc-800">{c.name || '(no name)'}</span>
                        {c.email && (
                          <span className="ml-2 text-zinc-500">{c.email}</span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {importError && (
                    <p className="mt-2 text-sm text-red-600">{importError}</p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {importing ? 'Importing…' : `Import ${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''}`}
                    </button>
                    <button
                      onClick={() => setSelectedContacts([])}
                      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Change selection
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Card 2 — Add manually */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-zinc-900">Add someone manually</h2>
            <p className="mt-1 text-sm text-zinc-500">Start with one contact</p>
            <Link
              href="/people/new"
              className="mt-4 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Add a contact
            </Link>
          </div>

          {/* Card 3 — Skip */}
          <div className="rounded-lg border border-zinc-100 bg-white p-5">
            <h2 className="font-semibold text-zinc-700">Skip for now</h2>
            <p className="mt-1 text-sm text-zinc-400">Go straight to your dashboard</p>
            <Link
              href="/dashboard"
              className="mt-3 inline-block text-sm text-zinc-500 underline hover:text-zinc-700"
            >
              Go to dashboard
            </Link>
          </div>

        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-400">
          Import from LinkedIn or Apple Contacts? Use the import tool in Settings.
        </p>

      </div>
    </div>
  )
}
