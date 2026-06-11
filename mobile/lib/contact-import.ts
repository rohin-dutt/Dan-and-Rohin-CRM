import type * as Contacts from "expo-contacts"
import type { Person } from "@/types"

export type ImportCandidate = {
  id: string
  name: string
  email: string | null
  phone: string | null
  displayPhone: string | null
  duplicateReason: string | null
  duplicatePersonId: string | null
}

export type ContactImportPayload = {
  name: string
  email?: string
  tel?: string
  existing_person_id?: string
  duplicate_action?: "create" | "create_anyway" | "update" | "skip"
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

function getDuplicateMatch(candidate: ContactImportPayload, people: Person[]) {
  const candidateName = normalize(candidate.name)
  const candidateEmail = normalize(candidate.email)
  const candidatePhone = normalizePhone(candidate.tel)

  const match = people.find((person) => {
    if (candidateEmail && normalize(person.email) === candidateEmail) return true
    if (candidatePhone && normalizePhone(person.phone) === candidatePhone) return true
    return candidateName !== "" && normalize(person.name) === candidateName
  })

  if (!match) return null
  const reason = candidateEmail && normalize(match.email) === candidateEmail
    ? "Email matches an existing person"
    : candidatePhone && normalizePhone(match.phone) === candidatePhone
      ? "Phone matches an existing person"
      : "Name matches an existing person"
  return { personId: match.id, reason }
}

export function mapDeviceContact(contact: Contacts.ExistingContact, people: Person[]): ImportCandidate | null {
  const name = contact.name?.trim()
  if (!name) return null

  const phoneEntry = firstPhoneEntry(contact.phoneNumbers)
  const payload = {
    name,
    email: firstEmail(contact.emails) ?? undefined,
    tel: firstPhone(contact.phoneNumbers) ?? undefined,
  }

  const duplicate = getDuplicateMatch(payload, people)

  return {
    id: contact.id,
    name: payload.name,
    email: payload.email ?? null,
    phone: payload.tel ?? null,
    displayPhone: formatPhoneForDisplay(phoneEntry),
    duplicateReason: duplicate?.reason ?? null,
    duplicatePersonId: duplicate?.personId ?? null,
  }
}

export function toContactImportPayload(
  candidate: ImportCandidate,
  duplicateAction: ContactImportPayload["duplicate_action"] = candidate.duplicatePersonId ? "skip" : "create",
): ContactImportPayload {
  return {
    name: candidate.name,
    email: candidate.email ?? undefined,
    tel: candidate.phone ?? undefined,
    existing_person_id: candidate.duplicatePersonId ?? undefined,
    duplicate_action: duplicateAction,
  }
}
