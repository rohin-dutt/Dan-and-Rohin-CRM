import type * as Contacts from "expo-contacts"
import type { Person } from "@/types"
import type { BirthdayParts } from "@roots/shared"

export type ImportCandidate = {
  id: string
  name: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  displayPhone: string | null
  birthday: BirthdayParts
  company: string | null
  role: string | null
  duplicateReason: string | null
}

export type ContactImportDraft = {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  birthday: BirthdayParts
  company: string | null
  role: string | null
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function normalizePhone(value: string | null | undefined) {
  return value?.replace(/\D/g, "") ?? ""
}

function firstEmail(values: Contacts.Email[] | undefined) {
  return values?.find((entry) => entry.email?.trim())?.email?.trim() ?? null
}

function firstPhone(values: Contacts.PhoneNumber[] | undefined) {
  return values?.find((entry) => entry.number?.trim())?.number?.trim() ?? null
}

function firstPhoneEntry(values: Contacts.PhoneNumber[] | undefined) {
  return values?.find((entry) => entry.number?.trim()) ?? null
}

function formatPhoneForDisplay(entry: Contacts.PhoneNumber | null): string | null {
  if (!entry?.number?.trim()) return null
  const raw = entry.number.trim()
  const digits = entry.digits?.replace(/\D/g, "") || raw.replace(/\D/g, "")
  const countryCode = entry.countryCode?.trim().toUpperCase()

  if ((countryCode === "US" || countryCode == null) && digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if ((countryCode === "US" || countryCode == null) && digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (raw.startsWith("+")) return raw
  if (countryCode && countryCode !== "US") return `+${countryCode} ${raw}`
  return raw
}

function splitName(contact: Contacts.ExistingContact): { name: string; firstName: string; lastName: string } | null {
  const firstName = contact.firstName?.trim() ?? ""
  const lastName = contact.lastName?.trim() ?? ""
  const joined = [firstName, lastName].filter(Boolean).join(" ").trim()
  const fallback = contact.name?.trim() ?? joined
  if (!fallback) return null

  if (firstName || lastName) {
    return {
      name: joined || fallback,
      firstName: firstName || fallback,
      lastName,
    }
  }

  const parts = fallback.split(/\s+/)
  return {
    name: fallback,
    firstName: parts[0] ?? fallback,
    lastName: parts.slice(1).join(" "),
  }
}

function mapBirthday(value: Contacts.Date | undefined): BirthdayParts {
  if (!value) return { month: null, day: null, year: null }
  return {
    month: Number.isInteger(value.month) ? value.month + 1 : null,
    day: Number.isInteger(value.day) ? value.day : null,
    year: Number.isInteger(value.year) ? value.year ?? null : null,
  }
}

function getDuplicateReason(candidate: { name: string; email?: string; tel?: string }, people: Person[]) {
  const candidateName = normalize(candidate.name)
  const candidateEmail = normalize(candidate.email)
  const candidatePhone = normalizePhone(candidate.tel)

  const match = people.find((person) => {
    if (candidateEmail && normalize(person.email) === candidateEmail) return true
    if (candidatePhone && normalizePhone(person.phone) === candidatePhone) return true
    return candidateName !== "" && normalize(person.name) === candidateName
  })

  if (!match) return null
  if (candidateEmail && normalize(match.email) === candidateEmail) return "Email matches an existing person"
  if (candidatePhone && normalizePhone(match.phone) === candidatePhone) return "Phone matches an existing person"
  return "Name matches an existing person"
}

export function mapDeviceContact(contact: Contacts.ExistingContact, people: Person[]): ImportCandidate | null {
  const nameParts = splitName(contact)
  if (!nameParts) return null

  const phoneEntry = firstPhoneEntry(contact.phoneNumbers)
  const payload = {
    name: nameParts.name,
    email: firstEmail(contact.emails) ?? undefined,
    tel: firstPhone(contact.phoneNumbers) ?? undefined,
  }

  return {
    id: contact.id,
    name: payload.name,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    email: payload.email ?? null,
    phone: payload.tel ?? null,
    displayPhone: formatPhoneForDisplay(phoneEntry),
    birthday: mapBirthday(contact.birthday),
    company: contact.company?.trim() || null,
    role: contact.jobTitle?.trim() || null,
    duplicateReason: getDuplicateReason(payload, people),
  }
}

export function toContactImportDraft(candidate: ImportCandidate): ContactImportDraft {
  return {
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    email: candidate.email,
    phone: candidate.phone,
    birthday: candidate.birthday,
    company: candidate.company,
    role: candidate.role,
  }
}
